import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseTicket, validateGraph, loadTickets, within } from '../skills/tripi-tropi/scripts/tickets.mjs';

function canonical(number = 1, overrides = {}) {
  const fields = { Status: 'ready-for-agent', Execution: 'pending', Labels: 'backend, migration', 'Blocked by': 'none', Commits: 'none', ...overrides };
  return `# ${number}: Implementación completa\n${Object.entries(fields).map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n## Estado inicial\n### Qué construir\nResultado verificable.\n### Atomicidad\nSin intercalar trabajo.\n### Criterios de aceptación\n- [ ] Resultado\n## Trabajo realizado\nPendiente.\n## Estado posterior\nPendiente.\n`;
}
const parse = (body, number = 1, options = {}) => parseTicket(body, { feature: 'demo', filename: `${String(number).padStart(2, '0')}-ticket.md`, ...options });
const codes = (ticket) => ticket.diagnostics.filter((item) => item.severity === 'error').map((item) => item.code);

test('strict guide format separates triage, execution, labels, commits and acceptance progress', () => {
  const ticket = parse(canonical(1, { Execution: 'completed', Commits: 'a1234567, b123456789ab' }).replace('[ ]', '[x]'), 1, { strict: true });
  assert.deepEqual(codes(ticket), []);
  assert.deepEqual(ticket.labels, ['backend', 'migration', 'ready-for-agent']);
  assert.deepEqual(ticket.commits, ['a1234567', 'b123456789ab']);
  assert.deepEqual(ticket.progress, { checked: 1, total: 1 });
  assert.equal(ticket.title, 'Implementación completa');
});

test('original to-tickets template is compatible without migration', () => {
  const ticket = parse('# 01: Deliver result\n\n**What to build:** Complete behaviour.\n**Blocked by:** None (can start immediately).\n**Status:** ready-for-agent\n\n- [ ] Verify result');
  assert.deepEqual(codes(ticket), []);
  assert.equal(ticket.status, 'ready-for-agent');
  assert.deepEqual(ticket.blockers, []);
  assert.ok(ticket.diagnostics.some((item) => item.code === 'missing-field'));
});

test('qr-wedding variants retain unnumbered titles and parse multiple dependencies', () => {
  const unnumbered = parse('# Diseñar página 404\nStatus: needs-triage\n## Estado inicial\nPendiente.');
  assert.equal(unnumbered.number, 1);
  assert.equal(unnumbered.title, 'Diseñar página 404');
  const ticket = parse('# 12: Prueba\nStatus: ready-for-agent\nBlocked by: 09 — Cupos, autorizaciones y reintentos; 11 — Reveal.\n- [ ] Verificar', 12);
  assert.deepEqual(ticket.blockers, [9, 11]);
  assert.deepEqual(parse('# 14: Admin\nStatus: needs-triage\nBlocked by: Ninguno para definir el diseño; integración posterior.', 14).blockers, []);
});

test('code examples cannot override metadata or contribute fake acceptance checkboxes', () => {
  const ticket = parse(canonical() + '\n```markdown\nStatus: resolved\n- [x] Fake\n```\n');
  assert.equal(ticket.status, 'ready-for-agent');
  assert.deepEqual(ticket.progress, { checked: 0, total: 1 });
});

test('strict validation catches missing sections, invalid states, hashes and completed tickets without commits', () => {
  assert.ok(codes(parse('# 01: Incomplete\nStatus: invented\nExecution: other\nCommits: xyz', 1, { strict: true })).includes('invalid-commit'));
  assert.ok(codes(parse(canonical(1, { Execution: 'completed' }), 1, { strict: true })).includes('missing-implementation-commit'));
  assert.ok(codes(parse(canonical() + '\n', 1, { strict: true })).length === 0);
  assert.ok(codes(parse(canonical().replace('Status:', 'Status: needs-info\nStatus:'))).includes('duplicate-field'));
  assert.ok(codes(parse(canonical().replace('# 1:', '# 2:'))).includes('number-mismatch'));
});

test('graph validation handles missing/ambiguous references, self edges and every cycle member', () => {
  const tickets = [parse(canonical(1, { 'Blocked by': '02' }), 1), parse(canonical(2, { 'Blocked by': '01' }), 2), parse(canonical(3, { 'Blocked by': '03, 99' }), 3)];
  validateGraph(tickets);
  assert.ok(codes(tickets[0]).includes('dependency-cycle'));
  assert.ok(codes(tickets[1]).includes('dependency-cycle'));
  assert.ok(codes(tickets[2]).includes('self-dependency'));
  assert.ok(codes(tickets[2]).includes('missing-dependency'));
  const duplicates = [parse(canonical(1), 1), parse(canonical(1), 1), parse(canonical(2, { 'Blocked by': '01' }), 2)];
  validateGraph(duplicates);
  assert.ok(codes(duplicates[0]).includes('duplicate-number'));
  assert.ok(codes(duplicates[2]).includes('ambiguous-dependency'));
});

test('loader and CLI read complete features without altering observed files', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-tropi-test-'));
  try {
    const issues = path.join(repo, '.scratch/demo/issues');
    await mkdir(issues, { recursive: true });
    const body = canonical();
    const filename = path.join(issues, '01-ticket.md');
    await writeFile(filename, body);
    await writeFile(path.join(repo, '.scratch/demo/spec.md'), '# Feature original');
    const before = await readdir(issues);
    const result = await loadTickets(repo, { strict: true });
    assert.equal(result.tickets.length, 1);
    assert.equal(result.features[0].description, '# Feature original');
    assert.deepEqual(codes(result.tickets[0]), []);
    const cli = spawnSync(process.execPath, ['skills/tripi-tropi/scripts/validate-tickets.mjs', '--repo', repo, '--strict', '--json'], { encoding: 'utf8' });
    assert.equal(cli.status, 0, cli.stderr);
    assert.equal(JSON.parse(cli.stdout).errors, 0);
    assert.equal(await readFile(filename, 'utf8'), body);
    assert.deepEqual(await readdir(issues), before);
    await assert.rejects(loadTickets(repo, { feature: '../demo' }), /directory name/);
  } finally { await rm(repo, { recursive: true, force: true }); }
});

test('path containment rejects traversal and sibling-prefix lookalikes', () => {
  const root = path.resolve('demo/.scratch');
  assert.equal(within(root, path.join(root, 'feature/issues/01-test.md')), true);
  assert.equal(within(root, path.resolve('demo/.scratch-extra/file.md')), false);
  assert.equal(within(root, path.resolve('demo/private.md')), false);
});
