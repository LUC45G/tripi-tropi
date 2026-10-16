import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync, promises as fs } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { createQueue } from '../skills/tripi-tropi/scripts/queue.mjs';
import { createViewer } from '../skills/tripi-tropi/scripts/server.mjs';
import { clarificationMessage } from '../skills/tripi-tropi/scripts/clarification.mjs';

const thread = '11111111-1111-1111-1111-111111111111';
const id = 'demo/01-task.md'; const key = `@clarify:${id}`;
const browserPath = process.env.TRIPI_TROPI_BROWSER ?? (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : '');
const browserOptions = { skip: !browserPath || !existsSync(browserPath) };
const body = ({ status = 'needs-info', execution = 'pending', blockers = 'none', title = 'Clarify me', text = 'One result.' } = {}) => `# 01: ${title}
Status: ${status}
Execution: ${execution}
Labels: backend
Blocked by: ${blockers}
Commits: ${execution === 'completed' ? 'abcdef123456' : 'none'}
Verbosity: 1

## Initial state
### What to build
${text}
### Atomicity
One result without interleaving.
### Acceptance criteria
- [ ] Verify.
## Work performed
Pending.
## Final state
Pending.
`;
async function fixture(t) {
  const base = await mkdtemp(path.join(tmpdir(), 'tripi-clarify-')); const repo = path.join(base, 'repo');
  const file = path.join(repo, '.scratch', 'demo', 'issues', '01-task.md'); await mkdir(path.dirname(file), { recursive: true });
  const put = async (options = {}) => writeFile(file, body(options)); await put();
  t.after(() => rm(base, { recursive: true, force: true }));
  return { repo, file, put, stateDirectory: path.join(base, 'state'), resolveSessions: async () => [] };
}
const reviewed = (review, note = '') => ({ reviewToken: review.reviewToken, note });
const stop = (viewer) => new Promise((resolve) => { viewer.server.close(resolve); viewer.server.closeAllConnections(); });

function holdLedgerWrite(t, directory, matches) {
  const original = fs.rename;
  let release; const waiting = new Promise((resolve) => { release = resolve; });
  let arrive; const started = new Promise((resolve) => { arrive = resolve; });
  let held = false;
  // Pause the real atomic write to reproduce overlapping requests deterministically.
  fs.rename = async (source, destination) => {
    if (!held && path.dirname(source) === directory && matches(JSON.parse(await readFile(source, 'utf8')))) {
      held = true; arrive(); await waiting;
    }
    return original(source, destination);
  };
  syncBuiltinESMExports();
  t.after(() => { release(); fs.rename = original; syncBuiltinESMExports(); });
  return { started, release };
}

test('clarification instruction preserves triage, interview fallback, approval and execution boundaries', () => {
  const ticket = { feature: 'demo', filename: '01-task.md', triageRole: 'needs-info', execution: 'pending', labels: ['backend'] };
  const message = clarificationMessage('/repo', ticket, 'Only acceptance criteria.');
  for (const pattern of [/needs-info/, /needs-triage/, /ready-for-human/, /grill-me if available/, /short rounds/, /wait for answers/, /CLI/, /explicit user approval before ANY file writes/, /Never expand, split or rewrite a completed/, /Do not expand or split an in-progress/, /Do not implement it/, /Only acceptance criteria/, /never split automatically/, /Keep current permissions/, /ALL dependencies/, /recommend answers/, /approval and blockers still govern readiness/, /propose correcting stale needs-info/, /Never invent hashes or push without an explicit request/, /Start on receipt/]) assert.match(message, pattern);
});

test('clarification preview and copy support unready tickets without writes or a linked agent', async (t) => {
  const f = await fixture(t); await f.put({ blockers: 'missing:01' });
  const queue = await createQueue({ ...f, deliver: async () => assert.fail('must not send') }); const before = await readFile(f.file, 'utf8');
  const preview = await queue.reviewClarification(id, 'Scope only'); assert.equal(preview.code, 200);
  assert.equal((await queue.copyClarification(id, reviewed(preview, 'Scope only'))).message, preview.message);
  assert.equal((await queue.enqueueClarification(id, reviewed(preview, 'Scope only'))).code, 409);
  assert.deepEqual(queue.info().records, {}); await assert.rejects(readdir(f.stateDirectory), /ENOENT/);
  assert.equal(await readFile(f.file, 'utf8'), before);
  await f.put({ execution: 'completed' }); assert.equal((await queue.reviewClarification(id)).code, 200);
  await f.put({ execution: 'discarded' }); assert.equal((await queue.reviewClarification(id)).code, 409);
});

test('clarification previews bind ticket, dependencies, note and destination and enforce bounded identifiers', async (t) => {
  const f = await fixture(t); await f.put({ blockers: 'other:01' });
  const dependency = path.join(f.repo, '.scratch', 'other', 'issues', '01-task.md'); await mkdir(path.dirname(dependency), { recursive: true }); await writeFile(dependency, body());
  const queue = await createQueue({ ...f, thread }); let preview = await queue.reviewClarification(id);
  await writeFile(dependency, body({ title: 'Changed' })); assert.equal((await queue.copyClarification(id, reviewed(preview))).code, 409);
  preview = await queue.reviewClarification(id); assert.equal((await queue.copyClarification(id, reviewed(preview, 'different note'))).code, 409);
  await f.put({ text: 'Changed context' }); assert.equal((await queue.enqueueClarification(id, reviewed(preview))).code, 409);
  preview = await queue.reviewClarification(id); await queue.setThread(null); assert.equal((await queue.copyClarification(id, reviewed(preview))).code, 409);
  assert.equal((await queue.reviewClarification('../outside')).code, 404);
  assert.equal((await queue.reviewClarification(id, 'x'.repeat(2001))).code, 400);
  assert.equal((await queue.reviewClarification(4)).code, 400);
  assert.equal((await queue.copyClarification(id, { reviewToken: 'fake' })).code, 409);
});

test('clarification delivery prevents duplicates and overlap and manual release preserves receipt history', async (t) => {
  const f = await fixture(t); const before = await readFile(f.file, 'utf8'); const sent = [];
  let release; const waiting = new Promise((resolve) => { release = resolve; }); let start; const started = new Promise((resolve) => { start = resolve; });
  const queue = await createQueue({ ...f, thread, deliver: async (value) => { sent.push(value); start(); await waiting; } });
  const preview = await queue.reviewClarification(id);
  const sending = queue.enqueueClarification(id, reviewed(preview));
  try {
    await started; assert.equal(queue.info().records[key].status, 'Sending');
    assert.equal((await queue.enqueueClarification(id, reviewed(preview))).code, 409);
    assert.equal((await queue.setThread(null)).code, 409);
    let current = await queue.reviewClarification(id);
    assert.equal((await queue.releaseClarification(id, { ...reviewed(current), confirmEnded: true })).code, 409);
    release(); assert.equal((await sending).code, 200); assert.equal(sent[0].message, preview.message);
    await f.put({ status: 'ready-for-agent' });
    assert.equal((await queue.enqueue(id)).code, 409);
    assert.equal((await queue.reviewComponent(id)).code, 409);
    current = await queue.reviewClarification(id);
    assert.equal((await queue.releaseClarification(id, reviewed(current))).code, 409);
    assert.equal((await queue.releaseClarification(id, { ...reviewed(current), confirmEnded: true })).code, 200);
    assert.equal(sent.length, 1); assert.equal(queue.info().records[key].status, 'Released');
    current = await queue.reviewClarification(id); assert.equal((await queue.enqueueClarification(id, reviewed(current))).code, 200);
    assert.equal(queue.info().records[key].previous.status, 'Released'); assert.equal(sent.length, 2);
    const restarted = await createQueue({ ...f, thread }); current = await restarted.reviewClarification(id);
    assert.equal((await restarted.enqueueClarification(id, reviewed(current))).code, 409);
    await f.put(); assert.equal(await readFile(f.file, 'utf8'), before);
  } finally { release(); await sending; }
});

test('clarification release survives another ticket finishing delivery and a restart', async (t) => {
  const f = await fixture(t);
  const other = 'demo/02-task.md'; const otherKey = `@clarify:${other}`;
  await writeFile(path.join(path.dirname(f.file), '02-task.md'), body().replace('# 01:', '# 02:'));
  let finish; const waiting = new Promise((resolve) => { finish = resolve; });
  let arrive; const started = new Promise((resolve) => { arrive = resolve; });
  const queue = await createQueue({ ...f, thread, deliver: async ({ message }) => {
    if (message.includes('02-task.md')) { arrive(); await waiting; }
  } });
  assert.equal((await queue.enqueueClarification(id, reviewed(await queue.reviewClarification(id)))).code, 200);
  const sending = queue.enqueueClarification(other, reviewed(await queue.reviewClarification(other)));
  await started;
  const gate = holdLedgerWrite(t, f.stateDirectory, (saved) => saved[key]?.status === 'Released' && saved[otherKey]?.status === 'Sending');
  const releasing = queue.releaseClarification(id, { ...reviewed(await queue.reviewClarification(id)), confirmEnded: true });
  try {
    await gate.started;
    finish();
    // Delivery completion runs synchronously before its queued save waits on the held write.
    await new Promise(setImmediate);
    assert.equal(queue.info().records[otherKey].status, 'Queued');
    gate.release();
    assert.equal((await releasing).code, 200); assert.equal((await sending).code, 200);
    const restarted = await createQueue({ ...f, thread });
    assert.equal(restarted.info().records[key].status, 'Released');
    assert.equal(restarted.info().records[otherKey].status, 'Queued');
  } finally { finish(); gate.release(); await Promise.allSettled([releasing, sending]); }
});

test('concurrent clarification releases cannot acknowledge the same receipt twice', async (t) => {
  const f = await fixture(t); let sends = 0;
  const queue = await createQueue({ ...f, thread, deliver: async () => { sends++; } });
  assert.equal((await queue.enqueueClarification(id, reviewed(await queue.reviewClarification(id)))).code, 200);
  const options = { ...reviewed(await queue.reviewClarification(id)), confirmEnded: true };
  const gate = holdLedgerWrite(t, f.stateDirectory, (saved) => saved[key]?.status === 'Released');
  const first = queue.releaseClarification(id, options); let second;
  try {
    await gate.started;
    const current = reviewed(await queue.reviewClarification(id));
    assert.equal((await queue.enqueueClarification(id, current)).code, 409);
    assert.equal((await queue.copyClarification(id, current)).code, 409);
    second = queue.releaseClarification(id, options);
    let timer;
    try {
      assert.equal(await Promise.race([second.then((result) => result.code), new Promise((resolve) => { timer = setTimeout(() => resolve('still waiting on persistence'), 2000); })]), 409);
    } finally { clearTimeout(timer); }
    gate.release(); assert.equal((await first).code, 200);
    const next = reviewed(await queue.reviewClarification(id));
    const results = await Promise.all([queue.enqueueClarification(id, next), queue.enqueueClarification(id, next)]);
    assert.deepEqual(results.map((result) => result.code).sort(), [200, 409]); assert.equal(sends, 2);
  } finally { gate.release(); await Promise.allSettled([first, second]); }
});

test('failed clarification release keeps the prior receipt reserved in memory and on disk', async (t) => {
  const f = await fixture(t); let sends = 0;
  const queue = await createQueue({ ...f, thread, deliver: async () => { sends++; } });
  assert.equal((await queue.enqueueClarification(id, reviewed(await queue.reviewClarification(id)))).code, 200);
  const original = fs.rename;
  fs.rename = async (source, destination) => {
    if (path.dirname(source) === f.stateDirectory && JSON.parse(await readFile(source, 'utf8'))[key]?.status === 'Released') throw new Error('Simulated disk failure');
    return original(source, destination);
  };
  syncBuiltinESMExports();
  t.after(() => { fs.rename = original; syncBuiltinESMExports(); });
  const result = await queue.releaseClarification(id, { ...reviewed(await queue.reviewClarification(id)), confirmEnded: true });
  assert.equal(result.code, 502); assert.match(result.error, /Simulated disk failure/);
  assert.equal(queue.info().records[key].status, 'Queued');
  assert.equal((await queue.enqueueClarification(id, reviewed(await queue.reviewClarification(id)))).code, 409);
  const restarted = await createQueue({ ...f, thread });
  assert.equal(restarted.info().records[key].status, 'Queued'); assert.equal(sends, 1);
});

test('uncertain clarifications require manual acknowledgment and implementation receipts stay separate', async (t) => {
  const f = await fixture(t); let calls = 0;
  let queue = await createQueue({ ...f, thread, deliver: async () => { calls++; throw new Error('Uncertain'); } });
  let preview = await queue.reviewClarification(id); assert.equal((await queue.enqueueClarification(id, reviewed(preview))).code, 502);
  queue = await createQueue({ ...f, thread, deliver: async () => { calls++; } });
  preview = await queue.reviewClarification(id); assert.equal(preview.record.status, 'Error');
  assert.equal((await queue.enqueueClarification(id, reviewed(preview))).code, 409); assert.equal(calls, 1);
  assert.equal((await queue.releaseClarification(id, { ...reviewed(preview), confirmEnded: true })).code, 200);
  await f.put({ status: 'ready-for-agent' }); assert.equal((await queue.enqueue(id)).code, 200);
  preview = await queue.reviewClarification(id); assert.ok(preview.implementation);
  assert.equal((await queue.enqueueClarification(id, reviewed(preview))).code, 409);
  assert.equal((await queue.copyClarification(id, reviewed(preview))).code, 409);
  assert.equal(queue.info().records[id].status, 'Queued');
});

test('clarification HTTP routes require origin, token, strict payloads and current previews', async (t) => {
  const f = await fixture(t); const viewer = await createViewer({ repo: f.repo, thread, queueOptions: { ...f, deliver: async () => {} } });
  try {
    const info = await (await fetch(`${viewer.url}/api/queue`)).json();
    const headers = { Origin: viewer.url, 'Content-Type': 'application/json', 'X-Queue-Token': info.token };
    const post = (route, payload, custom = headers) => fetch(`${viewer.url}/api/clarification-${route}`, { method: 'POST', headers: custom, body: JSON.stringify(payload) });
    const response = await post('review', { ticket: id, note: '¿Qué falta? 🍀' }); assert.equal(response.status, 200); const preview = await response.json();
    for (const route of ['review', 'message', 'queue', 'release']) {
      const payload = route === 'review' ? { ticket: id } : { ticket: id, reviewToken: preview.reviewToken };
      assert.equal((await post(route, payload, { ...headers, 'X-Queue-Token': 'wrong' })).status, 403);
      assert.equal((await post(route, payload, { ...headers, Origin: 'http://foreign.example' })).status, 403);
      assert.equal((await post(route, payload, { ...headers, 'Content-Type': 'text/plain' })).status, 415);
      for (const extra of [{ command: 'run' }, { permissions: true }, { note: 9 }]) assert.equal((await post(route, { ...payload, ...extra })).status, 400);
      assert.equal((await post(route, { ...payload, note: 'x'.repeat(5000) })).status, 413);
    }
    assert.equal((await post('message', { ticket: id, note: '¿Qué falta? 🍀', reviewToken: preview.reviewToken })).status, 200);
    assert.equal((await post('queue', { ticket: id })).status, 400);
    assert.equal((await post('release', { ticket: id, reviewToken: preview.reviewToken, confirmEnded: 'yes' })).status, 400);
  } finally { await stop(viewer); }
});

test('browser clarifies an unready ticket with note, preview, copy, queue and explicit manual release', browserOptions, async (t) => {
  const f = await fixture(t); const sent = []; const before = await readFile(f.file, 'utf8');
  const viewer = await createViewer({ repo: f.repo, thread, queueOptions: { ...f, deliver: async (value) => sent.push(value) } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text) => { window.copiedMessage = text; } } }));
    await page.goto(`${viewer.url}/?feature=demo&ticket=${encodeURIComponent(id)}`);
    await page.getByRole('button', { name: 'Clarify ticket', exact: true }).click();
    const dialog = page.getByRole('dialog'); const copy = dialog.getByRole('button', { name: 'Copy clarification message' });
    await page.waitForFunction(() => !document.querySelector('#clarify-copy').disabled);
    await dialog.getByLabel('Optional note').fill('Only acceptance criteria.'); assert.equal(await copy.isDisabled(), true);
    await dialog.getByRole('button', { name: 'Preview message' }).click();
    await page.waitForFunction(() => !document.querySelector('#clarify-copy').disabled);
    assert.match(await dialog.locator('#clarify-message').textContent(), /Only acceptance criteria/);
    await copy.click(); await dialog.getByRole('status').filter({ hasText: 'Nothing was queued' }).waitFor();
    assert.match(await page.evaluate(() => window.copiedMessage), /Only acceptance criteria/); assert.equal(sent.length, 0);
    await dialog.getByRole('button', { name: 'Queue clarification' }).click();
    await dialog.getByRole('status').filter({ hasText: 'Queued. Delivery only' }).waitFor(); assert.equal(sent.length, 1);
    const allow = dialog.getByRole('button', { name: 'Allow new clarification' }); assert.equal(await allow.isDisabled(), true);
    await dialog.getByLabel('The previous review has ended.', { exact: false }).check(); await allow.click();
    await dialog.getByRole('status').filter({ hasText: 'Nothing was sent or cancelled' }).waitFor(); assert.equal(sent.length, 1);
    assert.equal(await copy.isDisabled(), false);
    await f.put({ text: 'Requirements changed' }); await copy.click();
    await dialog.getByRole('alert').filter({ hasText: 'changed' }).waitFor();
    await page.keyboard.press('Escape'); assert.equal(await dialog.isVisible(), false);
    await f.put(); assert.equal(await readFile(f.file, 'utf8'), before);
  } finally { await browser.close(); await stop(viewer); }
});

test('browser supports unlinked clarification copy and cannot trigger clarification from Markdown', browserOptions, async (t) => {
  const f = await fixture(t); await f.put({ text: '<a data-clarify="demo/01-task.md">Trap</a>' });
  const viewer = await createViewer({ repo: f.repo, queueOptions: f }); const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage(); await page.goto(`${viewer.url}/?feature=demo&ticket=${encodeURIComponent(id)}`);
    await page.locator('.markdown a').click(); assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'Clarify ticket', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('#clarify-copy').disabled);
    assert.equal(await page.locator('#clarify-queue').isDisabled(), true);
    const box = await page.getByRole('dialog').boundingBox();
    await page.mouse.move(box.x + 8, box.y + 8); await page.mouse.down(); await page.mouse.move(box.x - 8, box.y + 8); await page.mouse.up();
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await page.mouse.click(box.x - 8, box.y + 8); assert.equal(await page.getByRole('dialog').count(), 0);
  } finally { await browser.close(); await stop(viewer); }
});
