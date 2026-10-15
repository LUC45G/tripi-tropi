import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import http from 'node:http';
import { parseTicket, validateGraph, loadTickets } from '../skills/tripi-tropi/scripts/tickets.mjs';
import { deriveTicketStates } from '../skills/tripi-tropi/scripts/ticket-states.mjs';
import { planComponent } from '../skills/tripi-tropi/scripts/component-plan.mjs';
import { createQueue } from '../skills/tripi-tropi/scripts/queue.mjs';
import { createViewer } from '../skills/tripi-tropi/scripts/server.mjs';

const thread = '11111111-1111-1111-1111-111111111111';
const body = (number, { blockers = 'none', execution = 'pending', status = 'ready-for-agent', text = 'One complete result.' } = {}) => `# ${number}: Ticket ${number}
Status: ${status}
Execution: ${execution}
Labels: backend
Blocked by: ${blockers}
Commits: ${execution === 'completed' ? 'abcdef123456' : 'none'}

## Initial state
### What to build
${text}
### Atomicity
No interleaving.
### Acceptance criteria
- [ ] Verify.
## Work performed
Pending.
## Final state
Pending.
`;
const id = (number, feature = 'demo') => `${feature}/${String(number).padStart(2, '0')}-task.md`;
function snapshot(entries) {
  return deriveTicketStates(validateGraph(entries.map(([number, options = {}, feature = 'demo']) => parseTicket(body(number, options), { feature, filename: `${String(number).padStart(2, '0')}-task.md`, strict: true }))));
}

test('component planner discovers only selected-ticket prerequisites and orders available work by dependencies then number', () => {
  const tickets = snapshot([[1, { blockers: '05' }], [2], [3, { blockers: '01' }], [5], [6, { blockers: '02' }], [7, { blockers: '03, 06' }], [9], [1, {}, 'other']]);
  const before = structuredClone(tickets);
  const result = planComponent(tickets, id(7));
  assert.equal(result.code, 200);
  assert.deepEqual(result.plan.order.map((ticket) => ticket.number), [2, 5, 1, 3, 6, 7]);
  assert.deepEqual(planComponent([...tickets].reverse(), id(7)).plan, result.plan);
  assert.equal(result.plan.component.length, 6);
  assert.deepEqual(planComponent(tickets, id(1)).plan.order.map((ticket) => ticket.number), [5, 1]);
  assert.deepEqual(planComponent(tickets, id(2)).plan.order.map((ticket) => ticket.number), [2]);
  assert.deepEqual(result.plan.warnings, []);
  assert.deepEqual(tickets, before);
});

test('component planner keeps completed prerequisites as context and identifies the first external pause', () => {
  const result = planComponent(snapshot([[1, { execution: 'completed' }], [2, { blockers: '01, other:01' }], [3, { blockers: '01' }], [1, {}, 'other']]), id(2));
  assert.equal(result.code, 200);
  assert.deepEqual(result.plan.completed, [id(1)]);
  assert.deepEqual(result.plan.order.map((ticket) => ticket.number), [2]);
  assert.equal(result.plan.pauseBefore, id(2));
  assert.equal(result.plan.warnings[0].dependency, id(1, 'other'));
  assert.equal(result.plan.component.length, 2);
  const ready = planComponent(snapshot([[1, { blockers: 'other:01' }], [1, { execution: 'completed' }, 'other']]), id(1));
  assert.deepEqual(ready.plan.warnings, []);
  assert.equal(ready.plan.pauseBefore, null);
});

test('component planner rejects ineligible members, cycles, invalid references and empty work', () => {
  for (const status of ['needs-info', 'needs-triage', 'ready-for-human', 'wontfix']) assert.equal(planComponent(snapshot([[1, { status }]]), id(1)).code, 409);
  for (const execution of ['in-progress', 'claimed', 'blocked', 'discarded']) assert.equal(planComponent(snapshot([[1, { execution }]]), id(1)).code, 409);
  assert.equal(planComponent(snapshot([[1, { execution: 'completed' }]]), id(1)).code, 409);
  assert.equal(planComponent(snapshot([[1, { blockers: '02' }], [2, { blockers: '01' }]]), id(1)).code, 409);
  assert.equal(planComponent(snapshot([[1, { blockers: '99' }]]), id(1)).code, 409);
  assert.equal(planComponent(snapshot([[1, { blockers: '01' }]]), id(1)).code, 409);
  assert.equal(planComponent([], id(1)).code, 404);
});

test('component planner validates transitive external structure and refuses discarded or inconsistent prerequisites', () => {
  const malformed = snapshot([[1, { blockers: 'other:01' }], [1, { blockers: '02' }, 'other'], [2, {}, 'other']]);
  malformed.find((ticket) => ticket.id === id(2, 'other')).diagnostics.push({ severity: 'error', message: 'Missing structure' });
  assert.equal(planComponent(malformed, id(1)).code, 409);
  assert.equal(planComponent(snapshot([[1, { blockers: 'other:01' }], [1, { execution: 'discarded' }, 'other']]), id(1)).code, 409);
  assert.equal(planComponent(snapshot([[1, { blockers: 'other:01' }], [1, { execution: 'completed', blockers: '02' }, 'other'], [2, {}, 'other']]), id(1)).code, 409);
  assert.equal(planComponent(snapshot([[1, { blockers: 'other:01' }], [1, { blockers: 'demo:01' }, 'other']]), id(1)).code, 409);
});

async function fixture(t) {
  const base = await mkdtemp(path.join(tmpdir(), 'tripi-component-'));
  const repo = path.join(base, 'repo'); const stateDirectory = path.join(base, 'state');
  await mkdir(repo);
  const put = async (number, options = {}, feature = 'demo') => {
    const directory = path.join(repo, '.scratch', feature, 'issues');
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${String(number).padStart(2, '0')}-task.md`), body(number, options));
  };
  const options = { repo, stateDirectory, thread, resolveSessions: async () => [] };
  t.after(() => rm(base, { recursive: true, force: true }));
  return { base, repo, stateDirectory, put, options };
}
const reviewedOptions = (review, extra = {}) => ({ reviewToken: review.reviewToken, ...extra });
const stop = (viewer) => new Promise((resolve) => { viewer.server.close(resolve); viewer.server.closeAllConnections(); });

test('component review and copy are read-only and one delivery preserves the validated instruction and individual readiness', async (t) => {
  const f = await fixture(t); await f.put(1); await f.put(2, { blockers: '01' });
  const sent = []; const queue = await createQueue({ ...f.options, deliver: async (value) => sent.push(value) });
  const before = (await loadTickets(f.repo)).tickets.map((ticket) => ticket.content);
  const review = await queue.reviewComponent(id(2));
  assert.equal(review.code, 200);
  const copy = await queue.copyComponent(id(2), reviewedOptions(review));
  assert.equal(copy.code, 200); assert.deepEqual(queue.info().records, {});
  await assert.rejects(readdir(f.stateDirectory), /ENOENT/);
  for (const requirement of [/ALL dependencies/, /atomic/, /ENTIRE sequence/, /ask in the agent CLI and wait/, /at least one implementation commit/, /subsequent ticket-record commit/, /Never mix tickets/, /push without an explicit request/, /execute this sequence in the turn receiving this instruction/]) assert.match(copy.message, requirement);
  assert.doesNotMatch(copy.message, /Begin when.*dequeued|Queued for the next turn/);
  assert.equal((await queue.enqueue(id(2))).code, 409);
  assert.equal((await queue.enqueueComponent(id(2), reviewedOptions(review))).code, 200);
  assert.equal(sent.length, 1); assert.equal(sent[0].message, copy.message); assert.equal(sent[0].thread, thread);
  assert.equal(queue.info().records[id(1)].status, 'Queued');
  assert.equal(queue.info().records[id(2)].status, 'Queued');
  assert.deepEqual((await loadTickets(f.repo)).tickets.map((ticket) => ticket.content), before);
});

test('component confirmation binds full relevant files, membership, dependencies and destination to the reviewed plan', async (t) => {
  const f = await fixture(t); await f.put(1, { blockers: 'other:01' }); await f.put(1, { execution: 'completed' }, 'other');
  const queue = await createQueue({ ...f.options, deliver: async () => assert.fail('must not send') });
  let review = await queue.reviewComponent(id(1));
  await f.put(1, { blockers: 'other:01', text: 'Changed acceptance context.' });
  assert.equal((await queue.copyComponent(id(1), reviewedOptions(review))).code, 409);
  review = await queue.reviewComponent(id(1));
  await f.put(1, { execution: 'completed', text: 'External content changed.' }, 'other');
  assert.equal((await queue.copyComponent(id(1), reviewedOptions(review))).code, 409);
  review = await queue.reviewComponent(id(1)); await f.put(2, { blockers: '01' });
  assert.equal((await queue.copyComponent(id(1), reviewedOptions(review))).code, 200);
  await f.put(2); await f.put(1, { blockers: '02, other:01' });
  assert.equal((await queue.copyComponent(id(1), reviewedOptions(review))).code, 409);
  review = await queue.reviewComponent(id(1)); await f.put(9, {}, 'unrelated');
  assert.equal((await queue.copyComponent(id(1), reviewedOptions(review))).code, 200);
  assert.equal((await queue.copyComponent(id(1), { reviewToken: '0'.repeat(64) })).code, 409);
  assert.equal((await queue.copyComponent(id(1))).code, 409);
  await f.put(2, { status: 'needs-info' });
  assert.equal((await queue.enqueueComponent(id(1), reviewedOptions(review))).code, 409);
  await f.put(2, { execution: 'in-progress' });
  assert.equal((await queue.enqueueComponent(id(1), reviewedOptions(review))).code, 409);
  await f.put(2);
  await queue.setThread(null);
  assert.equal((await queue.copyComponent(id(1), reviewedOptions(review))).code, 409);
  assert.equal((await queue.enqueueComponent(id(1), reviewedOptions(review))).code, 409);
  assert.deepEqual(queue.info().records, {});
});

test('external dependencies require explicit current-plan confirmation and never add external work', async (t) => {
  const f = await fixture(t); await f.put(1); await f.put(2, { blockers: '01, other:01' }); await f.put(1, {}, 'other');
  const sent = []; const queue = await createQueue({ ...f.options, deliver: async (value) => sent.push(value) });
  const review = await queue.reviewComponent(id(2));
  assert.equal(review.plan.pauseBefore, id(2));
  assert.equal(review.plan.warnings[0].dependency, id(1, 'other'));
  assert.equal((await queue.enqueueComponent(id(2), reviewedOptions(review))).code, 409);
  assert.equal((await queue.copyComponent(id(2), reviewedOptions(review))).code, 409);
  assert.equal((await queue.copyComponent(id(2), reviewedOptions(review, { confirmExternal: false }))).code, 409);
  assert.deepEqual(queue.info().records, {}); assert.equal(sent.length, 0);
  const copy = await queue.copyComponent(id(2), reviewedOptions(review, { confirmExternal: true }));
  assert.equal(copy.code, 200); assert.deepEqual(copy.plan.order.map((ticket) => ticket.id), [id(1), id(2)]);
  await f.put(1, { execution: 'completed' }, 'other');
  assert.equal((await queue.enqueueComponent(id(2), reviewedOptions(review, { confirmExternal: true }))).code, 409);
  const fresh = await queue.reviewComponent(id(2)); assert.deepEqual(fresh.plan.warnings, []);
  assert.equal((await queue.enqueueComponent(id(2), reviewedOptions(fresh))).code, 200);
  assert.equal(sent.length, 1);
});

test('component reservations block concurrent, overlapping and restarted sends and protect destination changes', async (t) => {
  const f = await fixture(t); await f.put(1); await f.put(2, { blockers: '01' });
  let release; const waiting = new Promise((resolve) => { release = resolve; }); let started;
  const delivered = new Promise((resolve) => { started = resolve; });
  const queue = await createQueue({ ...f.options, deliver: async () => { started(); await waiting; } });
  const review = await queue.reviewComponent(id(2));
  const sending = Promise.all([queue.enqueueComponent(id(2), reviewedOptions(review)), queue.enqueueComponent(id(2), reviewedOptions(review))]);
  try {
    await delivered;
    assert.equal(queue.info().records[id(2)].status, 'Sending');
    assert.equal((await queue.enqueueComponent(id(2), reviewedOptions(review))).code, 409);
    assert.equal((await queue.enqueue(id(1))).code, 409);
    assert.equal((await queue.setThread(null)).code, 409);
    release(); assert.deepEqual((await sending).map((result) => result.code).sort(), [200, 409]);
    const restarted = await createQueue({ ...f.options, deliver: async () => assert.fail('duplicate send') });
    const fresh = await restarted.reviewComponent(id(2));
    assert.equal((await restarted.enqueueComponent(id(2), reviewedOptions(fresh, { confirmPaused: true }))).code, 409);
    assert.equal((await restarted.enqueue(id(1))).code, 409);
    const other = await fixture(t); await other.put(1);
    const individual = await createQueue({ ...other.options, deliver: async () => {} });
    assert.equal((await individual.enqueue(id(1))).code, 200);
    const blocked = await individual.reviewComponent(id(1));
    assert.equal((await individual.enqueueComponent(id(1), reviewedOptions(blocked))).code, 409);
  } finally { release(); await sending; }
});

test('manual component resumption skips completed work and requires acknowledgment of a previously paused flow', async (t) => {
  const f = await fixture(t); await f.put(1); await f.put(2, { blockers: '01, other:01' }); await f.put(3, { blockers: '02' }); await f.put(1, {}, 'other');
  const sent = []; let queue = await createQueue({ ...f.options, deliver: async (value) => sent.push(value) });
  const first = await queue.reviewComponent(id(3));
  const delivery = await queue.enqueueComponent(id(3), reviewedOptions(first, { confirmExternal: true }));
  assert.equal(delivery.code, 200);
  const premature = await queue.reviewComponent(id(3));
  assert.equal(premature.requiresPausedConfirmation, false);
  assert.equal((await queue.enqueueComponent(id(3), reviewedOptions(premature, { confirmExternal: true, confirmPaused: true }))).code, 409);
  await f.put(1, { execution: 'completed' }); await f.put(1, { execution: 'completed' }, 'other');
  queue = await createQueue({ ...f.options, deliver: async (value) => sent.push(value) });
  const resumed = await queue.reviewComponent(id(3));
  assert.equal(resumed.requiresPausedConfirmation, true);
  assert.deepEqual(resumed.plan.order.map((ticket) => ticket.id), [id(2), id(3)]);
  assert.equal((await queue.enqueueComponent(id(3), reviewedOptions(resumed))).code, 409);
  const recordsBeforeCopy = structuredClone(queue.info().records);
  assert.equal((await queue.copyComponent(id(3), reviewedOptions(resumed, { confirmPaused: true }))).code, 200);
  assert.deepEqual(queue.info().records, recordsBeforeCopy);
  assert.equal((await queue.enqueueComponent(id(3), reviewedOptions(resumed, { confirmPaused: true }))).code, 200);
  assert.equal(queue.info().records[delivery.record.batch].status, 'Paused');
  assert.equal(sent.length, 2);
  assert.deepEqual(JSON.parse(sent[1].message.split('Reviewed plan (completed tickets are context only; never add tickets or external-feature work):\n')[1].split('\nBefore EACH ticket')[0]).order.map((ticket) => ticket.id), [id(2), id(3)]);
});

test('failed and interrupted component deliveries stay reserved without automatic retry', async (t) => {
  const f = await fixture(t); await f.put(1); await f.put(2, { blockers: '01' }); let calls = 0;
  let queue = await createQueue({ ...f.options, deliver: async () => { calls++; throw new Error('Uncertain delivery'); } });
  const first = await queue.reviewComponent(id(2));
  assert.equal((await queue.enqueueComponent(id(2), reviewedOptions(first))).code, 502);
  assert.equal(queue.info().records[id(2)].status, 'Error');
  const ledger = path.join(f.stateDirectory, (await readdir(f.stateDirectory))[0]);
  const records = JSON.parse(await readFile(ledger, 'utf8'));
  for (const receipt of Object.values(records)) receipt.status = 'Sending';
  await writeFile(ledger, JSON.stringify(records));
  queue = await createQueue({ ...f.options, deliver: async () => { calls++; } });
  assert.equal(queue.info().records[id(1)].status, 'Error');
  const review = await queue.reviewComponent(id(2));
  assert.equal((await queue.enqueueComponent(id(2), reviewedOptions(review, { confirmPaused: true }))).code, 409);
  assert.equal((await queue.enqueue(id(1))).code, 409);
  assert.equal(calls, 1);
});

test('component HTTP endpoints enforce authentication, strict payloads and reviewed plan confirmation', async (t) => {
  const f = await fixture(t); await f.put(1); let calls = 0;
  const viewer = await createViewer({ repo: f.repo, thread, queueOptions: { ...f.options, deliver: async () => { calls++; } } });
  try {
    const info = await (await fetch(`${viewer.url}/api/queue`)).json();
    const headers = { Origin: viewer.url, 'Content-Type': 'application/json', 'X-Queue-Token': info.token };
    const post = (route, payload, custom = headers) => fetch(`${viewer.url}/api/component-${route}`, { method: 'POST', headers: custom, body: JSON.stringify(payload) });
    const response = await post('plan', { ticket: id(1) }); assert.equal(response.status, 200);
    const review = await response.json();
    for (const route of ['plan', 'message', 'queue']) {
      const payload = route === 'plan' ? { ticket: id(1) } : { ticket: id(1), reviewToken: review.reviewToken };
      assert.equal((await post(route, payload, { ...headers, 'X-Queue-Token': 'bad' })).status, 403);
      assert.equal((await post(route, payload, { ...headers, Origin: '' })).status, 403);
      assert.equal((await post(route, payload, { ...headers, Origin: 'http://foreign.example' })).status, 403);
      assert.equal((await post(route, payload, { ...headers, 'Content-Type': 'text/plain' })).status, 415);
      for (const extra of [{ order: [id(1)] }, { command: 'shell' }, { permissions: 'all' }, { confirmExternal: 'yes' }, { confirmPaused: 'yes' }]) assert.equal((await post(route, { ...payload, ...extra })).status, 400);
      assert.equal((await post(route, [])).status, 400);
    }
    assert.equal((await post('queue', { ticket: id(1) })).status, 400);
    assert.equal((await post('message', { ticket: '../../private', reviewToken: review.reviewToken })).status, 404);
    assert.equal((await post('message', { ticket: id(1), reviewToken: '0'.repeat(64) })).status, 409);
    assert.equal((await post('message', { ticket: id(1), reviewToken: review.reviewToken })).status, 200);
    assert.equal(calls, 0);
    assert.equal((await post('queue', { ticket: id(1), reviewToken: review.reviewToken })).status, 200);
    assert.equal(calls, 1);
  } finally { await stop(viewer); }
});

test('component HTTP endpoints decode split Unicode and apply the byte limit on every new route', async (t) => {
  const f = await fixture(t); const feature = 'démø'; await f.put(1, {}, feature);
  const viewer = await createViewer({ repo: f.repo, thread, queueOptions: { ...f.options, deliver: async () => {} } });
  try {
    const info = await (await fetch(`${viewer.url}/api/queue`)).json();
    const headers = { Origin: viewer.url, 'Content-Type': 'application/json', 'X-Queue-Token': info.token };
    const send = (route, payload) => new Promise((resolve, reject) => {
      const bytes = Buffer.from(JSON.stringify(payload)); const split = bytes.indexOf(Buffer.from('é')) + 1;
      const request = http.request(`${viewer.url}/api/component-${route}`, { method: 'POST', headers }, (response) => {
        let text = ''; response.setEncoding('utf8'); response.on('data', (chunk) => { text += chunk; });
        response.on('end', () => resolve({ status: response.statusCode, data: JSON.parse(text) }));
      });
      request.on('error', reject); request.write(bytes.subarray(0, split)); setImmediate(() => request.end(bytes.subarray(split)));
    });
    const review = await send('plan', { ticket: id(1, feature) }); assert.equal(review.status, 200);
    assert.equal((await send('message', { ticket: id(1, feature), reviewToken: review.data.reviewToken })).status, 200);
    assert.equal((await send('queue', { ticket: id(1, feature), reviewToken: review.data.reviewToken })).status, 200);
    for (const route of ['plan', 'message', 'queue']) assert.equal((await send(route, { ticket: 'é'.repeat(3000) })).status, 413);
  } finally { await stop(viewer); }
});
