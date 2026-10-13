import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { parseTicket, validateGraph, loadTickets } from '../skills/tripi-tropi/scripts/tickets.mjs';
import { deriveTicketStates } from '../skills/tripi-tropi/scripts/ticket-states.mjs';

function ticket(number, fields = {}, options = {}) {
  return parseTicket(`# ${number}: Ticket ${number}\n${Object.entries({ Status: 'ready-for-agent', 'Blocked by': 'none', ...fields }).map(([key, value]) => `${key}: ${value}`).join('\n')}\n- [x] Acceptance\n`, { feature: 'demo', filename: `${number}-ticket.md`, ...options });
}
const view = (tickets) => deriveTicketStates(validateGraph(tickets));

test('readiness requires approval, no unfinished blockers, and no critical validation errors', () => {
  const result = view([
    ticket(1), ticket(2, { Status: 'needs-triage' }), ticket(3, { Status: 'needs-info' }),
    ticket(4, { Status: 'ready-for-human' }), ticket(5, { Commits: 'not-a-hash' }),
    ticket(6, { Status: 'resolved' }), ticket(7, { 'Blocked by': '6' }), ticket(8, { 'Blocked by': '1' }),
  ]);
  assert.deepEqual(result.map((item) => item.displayState), ['Ready to implement', 'Pending', 'Pending', 'Ready to implement', 'Pending', 'Completed', 'Ready to implement', 'Blocked']);
  assert.equal(result[7].dependencies[0].state, 'Ready to implement');
  assert.equal(result[7].dependencies[0].satisfied, false);
  assert.equal(result[6].dependencies[0].satisfied, true);
  // Every checklist was checked; triage still does not imply completion.
  assert.equal(result[0].progress.checked, 1);
});

test('explicit execution takes priority and completed/discarded tickets keep terminal states', () => {
  const result = view([
    ticket(1, { Status: 'resolved', Execution: 'pending' }),
    ticket(2, { Execution: 'claimed' }), ticket(3, { Execution: 'blocked' }),
    ticket(4, { Execution: 'completed', 'Blocked by': '99' }),
    ticket(5, { Execution: 'discarded', 'Blocked by': '99' }),
    ticket(6, { Status: 'unrecognized' }), ticket(7, { Status: 'wontfix' }),
    ticket(8, { Execution: 'invalid' }), ticket(9, { Status: 'claimed', Execution: 'done' }), ticket(10, { Status: 'constructor' }),
  ]);
  assert.deepEqual(result.map((item) => item.displayState), ['Pending', 'In progress', 'Blocked', 'Completed', 'Discarded', 'Unknown', 'Discarded', 'Unknown', 'Completed', 'Unknown']);
});

test('missing, ambiguous, self and cyclic references block tickets without inventing target links', () => {
  const result = view([
    ticket(1, { 'Blocked by': '99' }), ticket(2, { 'Blocked by': '2' }),
    ticket(3, { 'Blocked by': '4' }), ticket(4, { 'Blocked by': '3' }),
    ticket(5), ticket(5), ticket(6, { 'Blocked by': '5' }),
    ticket(7, { Status: 'wontfix' }), ticket(8, { 'Blocked by': '7' }),
  ]);
  for (const index of [0, 1, 2, 3, 6, 8]) assert.equal(result[index].displayState, 'Blocked');
  for (const index of [0, 1, 6]) assert.equal(result[index].dependencies[0].id, null);
  assert.equal(result[2].dependencies[0].id, 'demo/4-ticket.md');
  assert.equal(result[8].dependencies[0].satisfied, false);
  assert.equal(result[8].dependencies[0].state, 'Discarded');
});

test('custom triage labels retain spelling and resolve to canonical approval roles', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-tropi-labels-'));
  try {
    await mkdir(path.join(repo, 'docs/agents'), { recursive: true });
    await mkdir(path.join(repo, '.scratch/demo/issues'), { recursive: true });
    await writeFile(path.join(repo, 'docs/agents/triage-labels.md'), '| Role | Label | Meaning |\n| --- | --- | --- |\n| `ready-for-agent` | `Bug:Ready` | Approved |\n| `needs-info` | `Waiting:Info` | Information needed |');
    await writeFile(path.join(repo, '.scratch/demo/issues/01-one.md'), '# 01: Original title\nStatus: Bug:Ready\nLabels: OriginalLabel\nBlocked by: none\n');
    await writeFile(path.join(repo, '.scratch/demo/issues/02-two.md'), '# 02: Other title\nStatus: Waiting:Info\nBlocked by: none\n');
    const data = await loadTickets(repo);
    const result = deriveTicketStates(data.tickets);
    assert.equal(result[0].triageRole, 'ready-for-agent');
    assert.equal(result[0].displayState, 'Ready to implement');
    assert.deepEqual(result[0].labels, ['OriginalLabel', 'Bug:Ready']);
    assert.equal(result[1].displayState, 'Pending');
    assert.equal(data.triageRoles['bug:ready'], 'ready-for-agent');
  } finally { await rm(repo, { recursive: true, force: true }); }
});

test('cross-feature blockers resolve by exact feature and gate the dependent ticket', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-cross-state-'));
  try {
    for (const feature of ['front-end', 'back-end']) await mkdir(path.join(repo, '.scratch', feature, 'issues'), { recursive: true });
    const body = (title, execution, blocker, commits, checked = ' ') => `# 01: ${title}\nStatus: ready-for-agent\nExecution: ${execution}\nLabels: none\nBlocked by: ${blocker}\nCommits: ${commits}\n\n## Initial state\n### What to build\nDeliver ${title}.\n### Atomicity\nOne complete result.\n### Acceptance criteria\n- [${checked}] Verify.\n## Work performed\nRecorded.\n## Final state\nReady.\n`;
    await writeFile(path.join(repo, '.scratch/front-end/issues/01-ticket.md'), body('Frontend', 'pending', 'back-end:01', 'none'));
    await writeFile(path.join(repo, '.scratch/back-end/issues/01-ticket.md'), body('Backend', 'completed', 'none', 'abcdef123456', 'x'));
    const data = await loadTickets(repo, { strict: true });
    const result = deriveTicketStates(data.tickets);
    const frontend = result.find((item) => item.feature === 'front-end');
    assert.equal(frontend.displayState, 'Ready to implement');
    assert.equal(frontend.dependencies[0].id, 'back-end/01-ticket.md');
    assert.equal(frontend.dependencies[0].feature, 'back-end');
    await writeFile(path.join(repo, '.scratch/back-end/issues/01-ticket.md'), body('Backend', 'pending', 'none', 'none'));
    const pending = deriveTicketStates((await loadTickets(repo)).tickets);
    assert.equal(pending.find((item) => item.feature === 'front-end').displayState, 'Blocked');
  } finally { await rm(repo, { recursive: true, force: true }); }
});

test('fixtures matching qr-wedding yield agreed frontier and state counts', () => {
  const blockedBy = { 4: '3', 5: '4', 6: '5', 7: '6', 8: '7', 9: '7', 10: '5', 11: '7', 12: '9 — Cupos, autorizaciones y reintentos; 11 — Reveal', 13: '8, 10, 12' };
  const completed = new Set([3, 4, 5, 6, 10]);
  const pendingTriage = new Set([1, 2, 14]);
  const result = view(Array.from({ length: 14 }, (_, index) => {
    const number = index + 1;
    return ticket(number, { Status: completed.has(number) ? 'resolved' : pendingTriage.has(number) ? 'needs-triage' : 'ready-for-agent', 'Blocked by': blockedBy[number] ?? 'none' });
  }));
  const counts = result.reduce((all, item) => ({ ...all, [item.displayState]: (all[item.displayState] ?? 0) + 1 }), {});
  assert.deepEqual(counts, { Pending: 3, Completed: 5, 'Ready to implement': 1, Blocked: 5 });
  assert.equal(result[6].displayState, 'Ready to implement');
  assert.deepEqual(result[11].dependencies.map((item) => item.number), [9, 11]);
});
