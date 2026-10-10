import { parseArgs } from 'node:util';
import { mkdir, readFile, writeFile, unlink, realpath } from 'node:fs/promises';
import { openSync, closeSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const child = spawn(command, args, { detached: true, windowsHide: true, stdio: 'ignore' });
  child.on('error', (error) => console.error(`Browser could not open: ${error.message}. Open ${url} manually.`));
  child.unref();
}

async function liveInstance(registry, repo) {
  try {
    const record = JSON.parse(await readFile(registry, 'utf8'));
    const url = new URL(record.url);
    if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || url.pathname !== '/' || url.username || url.password) return null;
    const response = await fetch(`${record.url}/api/health`, { signal: AbortSignal.timeout(1200) });
    const health = await response.json();
    return health.app === 'tripi-tropi' && health.version === 1 && health.repo === repo && health.pid === record.pid ? record : null;
  } catch { return null; }
}

async function main() {
  const { values } = parseArgs({ options: {
    repo: { type: 'string', default: process.cwd() }, port: { type: 'string', default: '0' },
    'no-open': { type: 'boolean' }, stop: { type: 'boolean' },
    thread: { type: 'string' },
  } });
  const repo = await realpath(path.resolve(values.repo));
  const port = Number(values.port);
  const thread = (values.thread ?? process.env.CODEX_THREAD_ID ?? '').trim();
  if (thread.length > 200 || /[\x00-\x1f]/.test(thread)) throw new Error('Invalid Codex thread.');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 to 65535.');
  const state = path.join(tmpdir(), 'tripi-tropi');
  await mkdir(state, { recursive: true });
  const key = createHash('sha256').update(process.platform === 'win32' ? repo.toLowerCase() : repo).digest('hex').slice(0, 24);
  const registry = path.join(state, `${key}.json`);
  const lock = path.join(state, `${key}.lock`);
  const log = path.join(state, `${key}.log`);
  // Serialize launches with a bounded wait; never delete another launcher's lock.
  let ownsLock = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { await mkdir(lock); await writeFile(path.join(lock, 'owner'), String(Date.now())); ownsLock = true; break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  if (!ownsLock) throw new Error(`Another launcher is running or a stale lock exists at ${lock}. Retry after that launch finishes; remove only this lock directory if its launcher exited.`);
  try {
    const existing = await liveInstance(registry, repo);
    if (values.stop) {
      if (!existing) { console.log('No active tripi-tropi instance for this repository.'); return; }
      const response = await fetch(`${existing.url}/control/stop`, { method: 'POST', headers: { 'X-Viewer-Token': existing.token }, signal: AbortSignal.timeout(2000) });
      if (!response.ok) throw new Error('Server could not be stopped.');
      await unlink(registry).catch((error) => { if (error.code !== 'ENOENT') throw error; });
      console.log('tripi-tropi stopped.'); return;
    }
    if (existing) {
      if ((existing.thread ?? '') !== thread) throw new Error(`This viewer is linked to ${existing.thread || 'no session'}. Stop it before linking a different Codex session.`);
      if (port && new URL(existing.url).port !== String(port)) throw new Error(`An instance already runs at ${existing.url}. Stop it before changing ports.`);
      if (!values['no-open']) openBrowser(existing.url);
      console.log(JSON.stringify({ url: existing.url, reused: true, pid: existing.pid, log })); return;
    }
    const token = randomBytes(32).toString('hex');
    const descriptor = openSync(log, 'a');
    const child = spawn(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url))], {
      detached: true, windowsHide: true, stdio: ['ignore', descriptor, descriptor, 'ipc'],
      env: { ...process.env, TRIPI_TROPI_REPO: repo, TRIPI_TROPI_PORT: String(port), TRIPI_TROPI_TOKEN: token, TRIPI_TROPI_THREAD: thread },
    });
    closeSync(descriptor);
    const ready = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { child.kill(); reject(new Error(`Server launch timed out. Read ${log}.`)); }, 10000);
      child.once('error', (error) => { clearTimeout(timeout); reject(error); });
      child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Server exited (${code}). Read ${log}.`)); });
      child.once('message', (message) => { clearTimeout(timeout); message.error ? reject(new Error(`${message.error} Read ${log}.`)) : resolve(message); });
    });
    try { await writeFile(registry, JSON.stringify({ url: ready.url, repo, pid: child.pid, token, thread }), { mode: 0o600 }); }
    catch (error) { child.kill(); throw error; }
    child.disconnect(); child.unref();
    if (!values['no-open']) openBrowser(ready.url);
    console.log(JSON.stringify({ url: ready.url, reused: false, pid: child.pid, log }));
  } finally {
    await unlink(path.join(lock, 'owner'));
    const { rmdir } = await import('node:fs/promises');
    await rmdir(lock);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
