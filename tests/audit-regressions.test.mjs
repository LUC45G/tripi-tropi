import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { installSkill } from '../scripts/install-skill.mjs';
import { createQueue } from '../skills/tripi-tropi/scripts/queue.mjs';
import { createViewer } from '../skills/tripi-tropi/scripts/server.mjs';
import { parseTicket } from '../skills/tripi-tropi/scripts/tickets.mjs';
import { ticketIndex } from '../skills/tripi-tropi/scripts/ticket-index.mjs';

const uuid = '11111111-1111-1111-1111-111111111111';
const browserPath = process.env.TRIPI_TROPI_BROWSER ?? (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : '');
const body = (number = '01', execution = 'pending', blockers = 'none', prose = '') => `# ${number}: Ticket ${number}
Status: ready-for-agent
Execution: ${execution}
Labels: none
Blocked by: ${blockers}
Commits: ${execution === 'completed' ? 'abcdef123456' : 'none'}

## Initial state
### What to build
One result. ${prose}
### Atomicity
One delivery.
### Acceptance criteria
- [ ] Verify.
## Work performed
Pending.
## Final state
Pending.
`;
async function fixture(t) {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-audit-regression-'));
  t.after(() => rm(repo, { recursive: true, force: true }));
  const put = async (feature, number, content) => {
    const issues = path.join(repo, '.scratch', feature, 'issues');
    await mkdir(issues, { recursive: true });
    await writeFile(path.join(issues, `${number}-task.md`), content);
  };
  return { repo, put, stateDirectory: path.join(repo, 'state') };
}
const stop = (viewer) => new Promise((resolve) => { viewer.server.close(resolve); viewer.server.closeAllConnections(); });

test('Markdown cannot invoke queue/copy actions but resolved ticket links still navigate', { skip: !browserPath || !existsSync(browserPath) }, async (t) => {
  const f = await fixture(t); const sent = [];
  await f.put('demo', '01', body('01', 'pending', 'none', '<a data-queue="demo/02-task.md">Queue trap</a><a data-copy-message="demo/02-task.md">Copy trap</a> [Next](02-task.md)'));
  await f.put('demo', '02', body('02'));
  const viewer = await createViewer({ repo: f.repo, thread: uuid, queueOptions: { stateDirectory: f.stateDirectory, resolveSessions: async () => [], deliver: async (value) => sent.push(value) } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage(); const actions = [];
    page.on('request', (request) => { if (request.method() === 'POST') actions.push(request.url()); });
    await page.goto(viewer.url);
    await page.getByRole('button', { name: 'Ticket 01', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('#queue-session').disabled);
    assert.equal(await page.locator('.markdown [data-queue], .markdown [data-copy-message]').count(), 0);
    await page.locator('.markdown a').filter({ hasText: 'Queue trap' }).click();
    await page.locator('.markdown a').filter({ hasText: 'Copy trap' }).click();
    assert.deepEqual(actions, []); assert.deepEqual(sent, []);
    await page.locator('.markdown a').filter({ hasText: 'Next' }).click();
    assert.equal(await page.locator('#detail-kind').textContent(), 'Ticket 02');
  } finally { await browser.close(); await stop(viewer); }
});

test('installer preserves a destination created while staging', async (t) => {
  const f = await fixture(t); const skillsDir = path.join(f.repo, 'skills');
  const target = path.join(skillsDir, 'tripi-tropi');
  await assert.rejects(installSkill({ skillsDir, installDependencies: async (stage) => {
    await cp(path.resolve('skills/tripi-tropi/node_modules'), path.join(stage, 'node_modules'), { recursive: true });
    await mkdir(target); await writeFile(path.join(target, 'user-data.txt'), 'preserve me');
  } }), /changed concurrently/);
  assert.equal(await readFile(path.join(target, 'user-data.txt'), 'utf8'), 'preserve me');
});

test('session names and UUIDs share duplicate protection, including legacy name records', async (t) => {
  const f = await fixture(t); await f.put('demo', '01', body()); const sent = [];
  const resolveSessions = async () => [{ id: uuid, name: 'Named session' }];
  const options = { ...f, resolveSessions, deliver: async (value) => sent.push(value.thread) };
  const queue = await createQueue({ ...options, thread: 'Named session' });
  assert.equal(queue.info().thread, uuid);
  assert.equal((await queue.enqueue('demo/01-task.md')).code, 200);
  await queue.setThread(uuid);
  assert.equal((await queue.enqueue('demo/01-task.md')).code, 409);
  assert.deepEqual(sent, [uuid]);
  const legacyState = path.join(f.repo, 'legacy'); await mkdir(legacyState);
  const key = createHash('sha256').update(`${f.repo}\nNamed session`).digest('hex').slice(0, 24);
  await writeFile(path.join(legacyState, `${key}.queue.json`), JSON.stringify({ 'demo/01-task.md': { status: 'Queued' } }));
  const legacy = await createQueue({ ...options, stateDirectory: legacyState, thread: uuid });
  assert.equal((await legacy.enqueue('demo/01-task.md')).code, 409);
  const renamed = await createQueue({ ...options, stateDirectory: legacyState, thread: uuid, resolveSessions: async () => [{ id: uuid, name: 'Renamed session' }] });
  assert.equal((await renamed.enqueue('demo/01-task.md')).code, 409);
  await assert.rejects(createQueue({ ...options, thread: 'Named session', resolveSessions: async () => [{ id: uuid, name: 'Named session' }, { id: 'other', name: 'Named session' }] }), /exactly one/);
});

test('queue and copy reject missing structure, missing pending execution, and invalid completed dependencies', async (t) => {
  const f = await fixture(t); const sent = [];
  const queue = await createQueue({ ...f, thread: uuid, resolveSessions: async () => [], deliver: async (value) => sent.push(value) });
  for (const content of ['# 01: Missing sections\nStatus: ready-for-agent\nExecution: pending\nLabels: none\nBlocked by: none\nCommits: none\n', body().replace('Execution: pending\n', ''), body().replace('Execution: pending', 'Execution: open')]) {
    await f.put('demo', '01', content);
    assert.equal((await queue.copyMessage('demo/01-task.md')).code, 409);
    assert.equal((await queue.enqueue('demo/01-task.md')).code, 409);
  }
  await f.put('demo', '01', body('01', 'pending', '02'));
  await f.put('demo', '02', body('02', 'completed').replace('Commits: abcdef123456', 'Commits: none'));
  assert.equal((await queue.enqueue('demo/01-task.md')).code, 409);
  assert.deepEqual(sent, []);
});

test('absence markers cannot conceal explicit dependencies', () => {
  for (const blockers of ['none, 02', 'Ninguno; other:02', 'None; Ticket 2']) {
    const ticket = parseTicket(body('01', 'pending', blockers), { feature: 'demo', filename: '01-task.md', strict: true });
    assert.ok(ticket.diagnostics.some((item) => item.code === 'invalid-dependency'));
  }
});

test('feature filters retain cross-feature state and CLI validation', async (t) => {
  const f = await fixture(t);
  await f.put('front', '01', body('01', 'pending', 'back:01'));
  await f.put('back', '01', body('01', 'completed'));
  const result = await ticketIndex(f.repo, { feature: 'front' });
  assert.equal(result.tickets.length, 1); assert.equal(result.tickets[0].state, 'Ready to implement');
  assert.deepEqual(result.diagnostics, []);
  const cli = spawnSync(process.execPath, ['skills/tripi-tropi/scripts/validate-tickets.mjs', '--repo', f.repo, '--feature', 'front', '--strict'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr); assert.match(cli.stdout, /1 tickets: 0 errors/);
});

test('all authenticated POST routes decode split Unicode and retain byte limits', async (t) => {
  const f = await fixture(t); await f.put('caf\u00e9', '01', body()); const sent = [];
  const viewer = await createViewer({ repo: f.repo, thread: uuid, queueOptions: { stateDirectory: f.stateDirectory, resolveSessions: async () => [{ id: 'session-\u00e9', name: 'Other' }], deliver: async (value) => sent.push(value) } });
  try {
    const info = await (await fetch(viewer.url + '/api/queue')).json();
    const headers = { Origin: viewer.url, 'Content-Type': 'application/json', 'X-Queue-Token': info.token };
    for (const route of ['/api/implementation-message', '/api/queue', '/api/session']) {
      const bytes = Buffer.from(JSON.stringify(route === '/api/session' ? { session: 'session-\u00e9' } : { ticket: 'caf\u00e9/01-task.md' }));
      const split = bytes.indexOf(0xc3) + 1;
      const status = await new Promise((resolve, reject) => {
        const request = http.request(viewer.url + route, { method: 'POST', headers }, (response) => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
        request.on('error', reject); request.write(bytes.subarray(0, split)); setTimeout(() => request.end(bytes.subarray(split)), 30);
      });
      assert.equal(status, 200, route);
    }
    assert.equal(sent.length, 1);
    const oversized = await fetch(viewer.url + '/api/implementation-message', { method: 'POST', headers, body: JSON.stringify({ ticket: '\u00e9'.repeat(2200) }) });
    assert.equal(oversized.status, 413);
  } finally { await stop(viewer); }
});

test('unknown first CLI arguments fail before installation', async (t) => {
  const f = await fixture(t); const fakeNpm = path.join(f.repo, 'npm-cli.js');
  // A parser regression cannot reach a real installation during this test.
  await writeFile(fakeNpm, 'process.exit(42);');
  const result = spawnSync(process.execPath, ['scripts/tripi-tropi-cli.mjs', '--typo'], { encoding: 'utf8', env: { ...process.env, npm_execpath: fakeNpm } });
  assert.equal(result.status, 1); assert.match(result.stderr, /Unknown option: --typo/);
});

test('published package, embedded skill and lockfiles have one matching release version', async () => {
  const files = ['package.json', 'package-lock.json', 'skills/tripi-tropi/package.json', 'skills/tripi-tropi/package-lock.json'];
  const values = await Promise.all(files.map(async (file) => JSON.parse(await readFile(file, 'utf8'))));
  for (const value of values) {
    assert.equal(value.version, values[0].version);
    if (value.packages) assert.equal(value.packages[''].version, values[0].version);
  }
});
