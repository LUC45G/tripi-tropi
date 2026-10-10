import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { encode, decode } from '../skills/tripi-tropi/node_modules/@toon-format/toon/dist/index.mjs';
import { ticketIndex } from '../skills/tripi-tropi/scripts/ticket-index.mjs';
import { parseTicket } from '../skills/tripi-tropi/scripts/tickets.mjs';

const cli = path.resolve('skills/tripi-tropi/scripts/ticket-index.mjs');
const body = (number, execution = 'pending', blockers = 'none') => `# ${number}: Texto, "quoted" y Unicode ñ
Status: ready-for-agent
Execution: ${execution}
Labels: backend, "quoted"
Blocked by: ${blockers}
Commits: ${execution === 'completed' ? 'abcdef123456' : 'none'}

## Initial state
### What to build
One observable outcome.
### Atomicity
No interleaving.
### Acceptance criteria
- [ ] Verify.
## Work performed
Pending.
## Final state
Pending.
`;

test('progressively disclosed creation template preserves strict format and dependency references', () => {
  return readFile('skills/tripi-tropi/references/ticket-format.md', 'utf8').then((format) => {
    const template = format.match(/```markdown\r?\n([\s\S]*?)```/)[1];
    const ticket = parseTicket(template, { feature: 'demo', filename: '05-template.md', strict: true });
    assert.deepEqual(ticket.diagnostics, []);
    assert.equal(ticket.execution, 'pending');
    assert.deepEqual(ticket.blockers, [3, 4]);
    assert.deepEqual(ticket.progress, { checked: 0, total: 1 });
  });
});

test('discovery preserves metadata, roundtrips escaped cells, filters after deriving dependencies and rereads without writes', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-index-'));
  try {
    const issues = path.join(repo, '.scratch/demo/issues');
    await mkdir(issues, { recursive: true });
    const first = path.join(issues, '01-first.md');
    const second = path.join(issues, '02-second.md');
    await writeFile(first, body(1)); await writeFile(second, body(2, 'pending', '01'));
    const original = await readFile(second, 'utf8');
    const blocked = await ticketIndex(repo, { feature: 'demo', state: 'Blocked' });
    assert.equal(blocked.tickets.length, 1); assert.equal(blocked.tickets[0].id, 'demo/02-second.md');
    assert.deepEqual(JSON.parse(blocked.tickets[0].blockers), [1]);
    assert.deepEqual(decode(encode(blocked)), blocked);
    assert.equal(blocked.tickets[0].title, 'Texto, "quoted" y Unicode ñ');
    assert.deepEqual(JSON.parse(blocked.tickets[0].labels), ['backend', '"quoted"', 'ready-for-agent']);
    await writeFile(first, body(1, 'completed'));
    const ready = await ticketIndex(repo, { label: 'backend', state: 'Ready to implement' });
    assert.equal(ready.tickets.length, 1); assert.equal(ready.tickets[0].id, 'demo/02-second.md');
    assert.equal((await ticketIndex(repo, { label: 'absent' })).tickets.length, 0);
    assert.equal(await readFile(second, 'utf8'), original);
    assert.deepEqual((await readdir(issues)).sort(), ['01-first.md', '02-second.md']);
    assert.equal((await ticketIndex(repo, { feature: 'absent' })).tickets.length, 0);
    await assert.rejects(ticketIndex(repo, { feature: '..' }), /Feature/);
    await assert.rejects(ticketIndex(repo, { state: 'typo' }), /Unknown state/);
  } finally { await rm(repo, { recursive: true, force: true }); }
});

test('CLI exposes invalid graph even when filters hide its tickets and never prints Markdown bodies', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-index-invalid-'));
  try {
    const issues = path.join(repo, '.scratch/demo/issues');
    await mkdir(issues, { recursive: true });
    await writeFile(path.join(issues, '01-first.md'), body(1, 'pending', '99'));
    const run = (...args) => spawnSync(process.execPath, [cli, '--repo', repo, ...args], { encoding: 'utf8' });
    const result = run('--label', 'absent', '--json');
    assert.equal(result.status, 1);
    const parsed = JSON.parse(result.stdout);
    assert.deepEqual(parsed.tickets, []);
    assert.ok(parsed.diagnostics.some((item) => item.code === 'missing-dependency'));
    const toon = run(); assert.equal(toon.status, 1);
    assert.deepEqual(decode(toon.stdout), JSON.parse(run('--json').stdout));
    assert.ok(!toon.stdout.includes('One observable outcome.'));
  } finally { await rm(repo, { recursive: true, force: true }); }
});
