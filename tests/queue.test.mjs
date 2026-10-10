import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { chromium } from 'playwright';
import { createQueue, queueMessage } from '../skills/tripi-tropi/scripts/queue.mjs';
import { createViewer } from '../skills/tripi-tropi/scripts/server.mjs';
import { loadTickets } from '../skills/tripi-tropi/scripts/tickets.mjs';
import { readThreadName } from '../skills/tripi-tropi/scripts/thread-name.mjs';

const browserPath = process.env.TRIPI_TROPI_BROWSER ?? (process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : '');
const browserAvailable = browserPath && existsSync(browserPath);
function ticket(number, status = 'ready-for-agent', blocker = 'none') {
  return `# ${number}: Queue ticket ${number}\nStatus: ${status}\nExecution: pending\nLabels: integration\nBlocked by: ${blocker}\nCommits: none\n\n## Estado inicial\n### Qué construir\nResultado completo.\n### Atomicidad\nSin trabajo intercalado.\n### Criterios de aceptación\n- [ ] Verificar.\n## Trabajo realizado\nPendiente.\n## Estado posterior\nPendiente.\n`;
}
async function fixture() {
  const base = await mkdtemp(path.join(tmpdir(), 'tripi-queue-test-'));
  const repo = path.join(base, 'repo'); const stateDirectory = path.join(base, 'state');
  const issues = path.join(repo, '.scratch/original/issues'); await mkdir(issues, { recursive: true });
  for (const [number, status, blocker] of [['01', 'ready-for-agent', 'none'], ['02', 'ready-for-human', 'none'], ['03', 'ready-for-agent', '01']]) await writeFile(path.join(issues, `${number}-queue.md`), ticket(number, status, blocker));
  const data = await loadTickets(repo);
  return { base, repo, stateDirectory, issues, tickets: data.tickets };
}
const stop = ({ server }) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });

test('optional session display name reads the latest matching index record and tolerates missing or partial metadata', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'tripi-thread-name-'));
  try {
    assert.equal(await readThreadName('linked-id', home), null);
    await writeFile(path.join(home, 'session_index.jsonl'), [
      JSON.stringify({ id: 'other-id', thread_name: 'Another session' }),
      JSON.stringify({ id: 'linked-id', thread_name: 'Old title' }),
      JSON.stringify({ id: 'linked-id', thread_name: 'Current title' }),
      '{partial',
    ].join('\n'));
    assert.equal(await readThreadName('linked-id', home), 'Current title');
    assert.equal(await readThreadName('unknown-id', home), null);
  } finally { await rm(home, { recursive: true, force: true }); }
});

test('queue adapter passes separate arguments without shell, session creation or permission overrides', async () => {
  const calls = [];
  const spawnProcess = (...args) => {
    calls.push(args); const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => {};
    process.nextTick(() => child.emit('close', 0)); return child;
  };
  await queueMessage({ thread: 'exact session name', message: 'Text with "quotes" and $(commands)', repo: process.cwd(), spawnProcess });
  assert.deepEqual(calls[0][1], ['queue', '--thread', 'exact session name', '--message', 'Text with "quotes" and $(commands)']);
  assert.equal(calls[0][2].shell, false); assert.equal(calls[0][2].windowsHide, true);
  const failed = () => { const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); process.nextTick(() => { child.stderr.write('session unavailable'); child.emit('close', 1); }); return child; };
  await assert.rejects(queueMessage({ thread: 'test', message: 'test', repo: process.cwd(), spawnProcess: failed }), /session unavailable/);
});

test('queue revalidates disk state, blocks duplicates across concurrent requests and restart, and never writes tickets', async () => {
  const f = await fixture(); const messages = [];
  let release; const waiting = new Promise((resolve) => { release = resolve; });
  const deliver = async (value) => { messages.push(value); await waiting; };
  const queue = await createQueue({ ...f, thread: 'test-session', deliver });
  try {
    assert.equal((await queue.enqueue(f.tickets[1].id)).code, 409);
    assert.equal((await queue.enqueue(f.tickets[2].id)).code, 409);
    assert.equal((await queue.enqueue('../../outside')).code, 404);
    const first = path.join(f.issues, '01-queue.md'); const original = await readFile(first, 'utf8');
    await writeFile(first, ticket('01').replace('Execution: pending', 'Execution: in-progress'));
    assert.equal((await queue.enqueue(f.tickets[0].id)).code, 409);
    await writeFile(first, original);
    const sending = queue.enqueue(f.tickets[0].id);
    while (!messages.length) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(queue.info().records[f.tickets[0].id].status, 'Sending');
    assert.equal((await queue.enqueue(f.tickets[0].id)).code, 409);
    release(); assert.equal((await sending).record.status, 'Queued');
    assert.match(messages[0].message, /ALL dependencies/); assert.match(messages[0].message, /atomic/);
    assert.match(messages[0].message, /at least one implementation commit/); assert.match(messages[0].message, /Commits/);
    assert.equal(await readFile(first, 'utf8'), original);
    const restarted = await createQueue({ ...f, thread: 'test-session', deliver });
    assert.equal((await restarted.enqueue(f.tickets[0].id)).code, 409);
    assert.equal(messages.length, 1);
    const unbound = await createQueue({ ...f, thread: '', deliver });
    assert.equal((await unbound.enqueue(f.tickets[0].id)).code, 409);
    const failing = await createQueue({ ...f, thread: 'failure-session', deliver: async () => { throw new Error('Delivery uncertain'); } });
    assert.equal((await failing.enqueue(f.tickets[0].id)).record.status, 'Error');
    assert.equal((await failing.enqueue(f.tickets[0].id)).code, 409);
  } finally { release(); await rm(f.base, { recursive: true, force: true }); }
});

test('HTTP queue requires exact origin and token and only accepts ticket identifiers', async () => {
  const f = await fixture(); const messages = [];
  const viewer = await createViewer({ repo: f.repo, thread: 'bound-session', queueOptions: { stateDirectory: f.stateDirectory, deliver: async (value) => messages.push(value) } });
  try {
    const info = await (await fetch(`${viewer.url}/api/queue`)).json();
    const headers = { Origin: viewer.url, 'Content-Type': 'application/json', 'X-Queue-Token': info.token };
    const send = (value, h = headers) => fetch(`${viewer.url}/api/queue`, { method: 'POST', headers: h, body: JSON.stringify(value) });
    assert.equal((await send({ ticket: f.tickets[0].id }, { ...headers, 'X-Queue-Token': 'wrong' })).status, 403);
    assert.equal((await send({ ticket: f.tickets[0].id }, { ...headers, Origin: '' })).status, 403);
    assert.equal((await send({ ticket: f.tickets[0].id }, { ...headers, Origin: 'http://evil.example' })).status, 403);
    assert.equal((await send({ ticket: f.tickets[0].id, command: 'arbitrary shell command' })).status, 400);
    assert.equal((await send({ ticket: f.tickets[0].id })).status, 200);
    assert.equal((await send({ ticket: f.tickets[0].id })).status, 409);
    assert.equal(messages.length, 1);
    assert.match(await readFile(path.join(f.issues, '01-queue.md'), 'utf8'), /Execution: pending/);
  } finally { await stop(viewer); await rm(f.base, { recursive: true, force: true }); }
});

test('browser displays linked destination, Sending and Queued separately from execution', { skip: !browserAvailable }, async () => {
  const f = await fixture(); let release; const waiting = new Promise((resolve) => { release = resolve; });
  const viewer = await createViewer({ repo: f.repo, thread: 'explicit-test-session', queueOptions: { stateDirectory: f.stateDirectory, deliver: () => waiting, resolveThreadName: async () => 'Named <session>' } });
  const unbound = await createViewer({ repo: f.repo, queueOptions: { stateDirectory: f.stateDirectory } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage(); await page.goto(viewer.url);
    await page.getByRole('button', { name: 'Queue ticket 01', exact: true }).click();
    assert.match(await page.locator('#queue-session').textContent(), /explicit-test-session/);
    assert.equal(await page.locator('#queue-session').textContent(), 'Codex: Named <session> - explicit-test-session');
    assert.equal(await page.locator('#queue-session .session-id').textContent(), 'explicit-test-session');
    assert.equal(await page.locator('#queue-session session').count(), 0);
    await page.getByRole('button', { name: 'Queue implementation', exact: true }).click();
    await page.getByRole('button', { name: 'Sending', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Sending', exact: true }).isDisabled(), true);
    release(); await page.getByRole('button', { name: 'Queued', exact: true }).waitFor();
    assert.equal(await page.locator('#detail .ticket-meta .state').textContent(), 'Ready to implement');
    await page.reload(); await page.getByRole('button', { name: 'Queued', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Queue ticket 02', exact: true }).click();
    assert.equal(await page.locator('[data-queue]').count(), 0);
    await page.goto(unbound.url); await page.getByRole('button', { name: 'Queue ticket 01', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Queue implementation', exact: true }).isDisabled(), true);
    assert.match(await page.locator('.queue-controls').textContent(), /No Codex session linked/);
  } finally { release(); await browser.close(); await stop(viewer); await stop(unbound); await rm(f.base, { recursive: true, force: true }); }
});
