import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { createViewer } from '../skills/tripi-tropi/scripts/server.mjs';

const browserPath = process.env.TRIPI_TROPI_BROWSER ?? (process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : '');
const browserAvailable = browserPath && existsSync(browserPath);
const content = `# 01: Diseñar página 404
Status: ready-for-agent
Execution: completed
Labels: design
Blocked by: none
Commits: abc123456789

## Estado inicial
### Qué construir
Conservar el contenido original en español.
### Atomicidad
Resultado completo.
### Criterios de aceptación
- [x] Verificar el diseño
## Trabajo realizado
Código y pruebas.
## Estado posterior
Completado.

| Name | Result |
| --- | --- |
| Markdown | Preserved |

\`\`\`js
const original = 'sin traducir';
\`\`\`

> Texto citado.

[Official documentation](https://example.com)
<img src=x onerror="window.ticketAttack=true">
<script>window.ticketAttack=true</script>
[Attack](javascript:alert(1))
<input type=text value=editable>
`;

async function fixture() {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-tropi-viewer-'));
  const issues = path.join(repo, '.scratch/feature-original/issues');
  await mkdir(issues, { recursive: true });
  await writeFile(path.join(issues, '01-original.md'), content);
  await writeFile(path.join(repo, '.scratch/feature-original/spec.md'), '# Descripción original\n\nFeature en español.');
  return repo;
}
async function chooseState(page, state) {
  await page.locator('#status-summary').click();
  await page.locator('[data-state]').filter({ hasText: state }).click();
}
async function digest(root) {
  const result = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filename);
      else result.push([path.relative(root, filename), createHash('sha256').update(await readFile(filename)).digest('hex')]);
    }
  }
  await walk(root); return result.sort(([a], [b]) => a.localeCompare(b));
}
function command(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['skills/tripi-tropi/scripts/launch.mjs', ...args], { env: { ...process.env, ...env }, windowsHide: true });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (data) => { stdout += data; }); child.stderr.on('data', (data) => { stderr += data; });
    child.once('error', reject); child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('HTTP viewer isolates repositories and rejects write requests, traversal and foreign origins', async () => {
  const repo = await fixture();
  const empty = await mkdtemp(path.join(tmpdir(), 'tripi-tropi-empty-'));
  const before = await digest(repo);
  const first = await createViewer({ repo });
  const second = await createViewer({ repo: empty });
  try {
    const snapshot = await (await fetch(`${first.url}/api/snapshot`)).json();
    assert.equal(snapshot.tickets[0].title, 'Diseñar página 404');
    assert.deepEqual(snapshot.tickets[0].commits, ['abc123456789']);
    assert.equal(snapshot.features[0].descriptionFile, 'spec.md');
    assert.equal((await (await fetch(`${second.url}/api/snapshot`)).json()).tickets.length, 0);
    for (const resource of ['/', '/app.js', '/style.css', '/vendor/marked.js', '/vendor/purify.js']) assert.equal((await fetch(`${first.url}${resource}`)).status, 200);
    assert.equal((await fetch(`${first.url}/api/snapshot`, { method: 'POST', body: 'Execution: completed' })).status, 405);
    assert.equal((await fetch(`${first.url}/api/snapshot`, { headers: { Origin: 'http://malicious.example' } })).status, 403);
    assert.equal((await fetch(`${first.url}/control/stop`, { method: 'POST' })).status, 403);
    assert.equal((await fetch(`${first.url}/..%2f..%2fpackage.json`)).status, 404);
    assert.deepEqual(await digest(repo), before);
  } finally {
    await Promise.all([first, second].map(({ server }) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); })));
    await rm(repo, { recursive: true, force: true }); await rm(empty, { recursive: true, force: true });
  }
});

test('session API accepts only indexed destinations and authenticated Exit stops only its viewer', async () => {
  const repo = await fixture(); const before = await digest(repo);
  const otherRepo = await mkdtemp(path.join(tmpdir(), 'tripi-tropi-other-viewer-'));
  const registryFile = path.join(tmpdir(), `tripi-tropi-viewer-${process.pid}-${Date.now()}.json`);
  const sessions = [{ id: 'session-one', name: 'First' }, { id: 'session-two', name: 'Second' }];
  const viewer = await createViewer({ repo, thread: 'session-one', controlToken: 'viewer-control-token', registryFile, queueOptions: { resolveSessions: async () => sessions, resolveThreadName: async (id) => sessions.find((item) => item.id === id)?.name ?? null } });
  const other = await createViewer({ repo: otherRepo, controlToken: 'other-viewer-token' });
  try {
    await writeFile(registryFile, JSON.stringify({ pid: process.pid, repo, token: 'viewer-control-token' }));
    assert.match(await (await fetch(viewer.url)).text(), /data-control-token="viewer-control-token"/);
    assert.deepEqual((await (await fetch(`${viewer.url}/api/sessions`)).json()).sessions, sessions);
    const queue = await (await fetch(`${viewer.url}/api/queue`)).json();
    const update = (session, headers = {}) => fetch(`${viewer.url}/api/session`, { method: 'POST', headers: { Origin: viewer.url, 'Content-Type': 'application/json', 'X-Queue-Token': queue.token, ...headers }, body: JSON.stringify({ session }) });
    assert.equal((await update('session-two', { 'X-Queue-Token': 'wrong' })).status, 403);
    assert.equal((await update('session-two', { Origin: 'http://malicious.example' })).status, 403);
    assert.equal((await update('not-in-index')).status, 409);
    assert.equal((await update('session-two')).status, 200);
    assert.equal((await (await fetch(`${viewer.url}/api/health`)).json()).thread, 'session-two');
    assert.equal((await update(null)).status, 200);
    assert.equal((await (await fetch(`${viewer.url}/api/health`)).json()).thread, null);
    const stopped = await fetch(`${viewer.url}/control/stop`, { method: 'POST', headers: { 'X-Viewer-Token': 'viewer-control-token' } });
    assert.deepEqual(await stopped.json(), { stopped: true });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await assert.rejects(fetch(`${viewer.url}/api/health`));
    await assert.rejects(readFile(registryFile));
    assert.equal((await fetch(`${other.url}/api/health`)).status, 200);
    assert.deepEqual(await digest(repo), before);
  } finally {
    await Promise.all([viewer, other].map(({ server }) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); })));
    await rm(registryFile, { force: true });
    await rm(otherRepo, { recursive: true, force: true });
  }
});

test('browser renders original Markdown and hashes, with inert checkboxes and sanitized content', { skip: !browserAvailable }, async () => {
  const repo = await fixture();
  const before = await digest(repo);
  const viewer = await createViewer({ repo });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto(viewer.url);
    await page.getByRole('button', { name: 'Diseñar página 404' }).waitFor();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.equal(await page.locator('#detail .markdown h1').textContent(), 'Descripción original');
    await page.getByRole('button', { name: 'Diseñar página 404' }).click();
    assert.equal(await page.locator('#detail .markdown h1').textContent(), '01: Diseñar página 404');
    assert.equal(await page.locator('#detail .commit-record code').textContent(), 'abc123456789');
    assert.deepEqual(await page.locator('.ticket-info th').allTextContents(), ['Status', 'Triage', 'Labels', 'Acceptance criteria', 'Commits', 'Dependencies']);
    assert.equal(await page.locator('.ticket-info th, .ticket-info td').evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).borderBottomWidth === '0px')), true);
    assert.equal(await page.locator('#detail .markdown').textContent().then((text) => text.includes('Status: ready-for-agent')), false);
    assert.equal(await page.locator('#detail .markdown table td').first().textContent(), 'Markdown');
    assert.ok((await page.locator('#detail pre').textContent()).includes('sin traducir'));
    assert.equal(await page.locator('#detail .markdown input[type=checkbox]').isDisabled(), true);
    assert.equal(await page.locator('#detail input[type=text]').count(), 0);
    assert.equal(await page.locator('#detail script, #detail [onerror], #detail a[href^="javascript:"]').count(), 0);
    assert.equal(await page.evaluate(() => window.ticketAttack), undefined);
    assert.equal(await page.locator('#detail a[href="https://example.com"]').getAttribute('rel'), 'noopener noreferrer');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight), false);
    await mkdir('.cache', { recursive: true });
    await page.screenshot({ path: '.cache/tripi-tropi-desktop.png', fullPage: true });
    // External change is visible through explicit Refresh in ticket 02.
    await writeFile(path.join(repo, '.scratch/feature-original/issues/01-original.md'), content.replace('abc123456789', 'def123456789'));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.locator('#detail .commit-record code').filter({ hasText: 'def123456789' }).waitFor();
    await writeFile(path.join(repo, '.scratch/feature-original/issues/01-original.md'), content);
    assert.deepEqual(await digest(repo), before);
    assert.deepEqual(failures, []);
  } finally {
    await browser.close(); await new Promise((resolve) => { viewer.server.close(resolve); viewer.server.closeAllConnections(); });
    await rm(repo, { recursive: true, force: true });
  }
});

test('detached launcher reuses same repo, separates another repo and stops only its own instance', { timeout: 30000 }, async () => {
  const first = await fixture();
  const second = await fixture();
  const sessionsHome = await mkdtemp(path.join(tmpdir(), 'tripi-launch-sessions-'));
  const launchEnv = { CODEX_HOME: sessionsHome };
  await writeFile(path.join(sessionsHome, 'session_index.jsonl'), [
    JSON.stringify({ id: 'session-one', thread_name: 'First session' }),
    JSON.stringify({ id: 'session-two', thread_name: 'Second session' }),
  ].join('\n'));
  try {
    const started = await command(['--repo', first, '--no-open', '--thread', 'session-one'], launchEnv);
    assert.equal(started.code, 0, started.stderr);
    const a = JSON.parse(started.stdout);
    assert.equal(a.reused, false);
    const reused = await command(['--repo', first, '--no-open', '--thread', 'session-one'], launchEnv);
    assert.equal(reused.code, 0, reused.stderr);
    const b = JSON.parse(reused.stdout);
    assert.equal(b.reused, true); assert.equal(b.pid, a.pid); assert.equal(b.url, a.url);
    const queue = await (await fetch(`${a.url}/api/queue`)).json();
    const changed = await fetch(`${a.url}/api/session`, { method: 'POST', headers: { Origin: a.url, 'Content-Type': 'application/json', 'X-Queue-Token': queue.token }, body: JSON.stringify({ session: 'session-two' }) });
    assert.equal(changed.status, 200);
    const afterChange = await command(['--repo', first, '--no-open', '--thread', 'session-two'], launchEnv);
    assert.equal(afterChange.code, 0, afterChange.stderr);
    assert.equal(JSON.parse(afterChange.stdout).reused, true);
    const staleDestination = await command(['--repo', first, '--no-open', '--thread', 'session-one'], launchEnv);
    assert.notEqual(staleDestination.code, 0);
    assert.match(staleDestination.stderr, /Stop it before linking a different Codex session/);
    const other = await command(['--repo', second, '--no-open']);
    assert.equal(other.code, 0, other.stderr);
    assert.notEqual(JSON.parse(other.stdout).url, a.url);
    assert.equal((await fetch(`${a.url}/api/health`)).status, 200);
    const stopped = await command(['--repo', first, '--stop']);
    assert.equal(stopped.code, 0, stopped.stderr);
    assert.equal((await fetch(`${JSON.parse(other.stdout).url}/api/health`)).status, 200);
  } finally {
    await command(['--repo', first, '--stop']); await command(['--repo', second, '--stop']);
    await rm(first, { recursive: true, force: true }); await rm(second, { recursive: true, force: true }); await rm(sessionsHome, { recursive: true, force: true });
  }
});

test('browser filters use label OR and status AND and navigate to blockers outside filters without writes', { skip: !browserAvailable }, async () => {
  const repo = await fixture();
  const issues = path.join(repo, '.scratch/feature-original/issues');
  const make = (number, title, status, labels, blocker = 'none') => `# ${number}: ${title}\nStatus: ${status}\nExecution: pending\nLabels: ${labels}\nBlocked by: ${blocker}\nCommits: none\n\n## What to build\nDeliver ${title}.\n## Acceptance criteria\n- [x] Acceptance progress\n\n[Previous ticket](01-original.md)\n`;
  const second = make(2, 'Backend ready', 'ready-for-agent', 'backend', '01');
  await writeFile(path.join(issues, '02-ready.md'), second);
  await writeFile(path.join(issues, '03-blocked.md'), make(3, 'Dependent work', 'ready-for-agent', 'ops', '02'));
  await writeFile(path.join(issues, '04-pending.md'), make(4, 'Need information', 'needs-info', 'design'));
  await writeFile(path.join(issues, '05-human.md'), make(5, 'Human work', 'ready-for-human', 'backend'));
  await writeFile(path.join(issues, '06-invalid.md'), make(6, 'Missing dependency', 'ready-for-agent', 'backend', '99'));
  const other = path.join(repo, '.scratch/other-feature/issues');
  await mkdir(other, { recursive: true });
  await writeFile(path.join(other, '01-other.md'), make(1, 'Other feature work', 'ready-for-agent', 'design'));
  const before = await digest(repo);
  const viewer = await createViewer({ repo });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(viewer.url);
    await page.getByRole('button', { name: 'Dependent work', exact: true }).waitFor();
    assert.equal(await page.locator('#ticket-list tbody tr').count(), 6);
    await chooseState(page, 'Blocked');
    assert.equal(await page.locator('#ticket-list tbody tr').count(), 2);
    await page.locator('#label-summary').click();
    await page.locator('input[data-label="ops"]').check();
    assert.equal(await page.locator('#ticket-list tbody tr').count(), 1);
    await page.locator('input[data-label="backend"]').check();
    assert.equal(await page.locator('#ticket-list tbody tr').count(), 2);
    await chooseState(page, 'Ready to implement');
    assert.equal(await page.locator('#ticket-list tbody tr').count(), 2);
    await page.locator('#label-summary').click();
    await page.locator('input[data-label="backend"]').uncheck();
    assert.equal(await page.locator('#ticket-list tbody tr').count(), 0);
    assert.equal(await page.getByText('No tickets match these filters', { exact: true }).count(), 1);
    await chooseState(page, 'Blocked');
    await page.locator('#list-title').click();
    assert.equal(await page.locator('#label-filter').getAttribute('open'), null);
    await page.getByRole('button', { name: 'Dependent work', exact: true }).click();
    assert.equal(await page.locator('#detail .ticket-meta .state').textContent(), 'Blocked');
    assert.equal(await page.locator('#detail .acceptance-progress').textContent().then((text) => text.includes('1 / 1')), true);
    await page.locator('#detail .dependency-link[data-ticket]').click();
    assert.equal(await page.locator('#detail .markdown h1').textContent(), '2: Backend ready');
    assert.equal(await page.locator('#detail .ticket-meta .state').textContent(), 'Ready to implement');
    assert.equal(await page.locator('#detail .filtered-selection').count(), 1);
    assert.equal(await page.locator('#state-filter').inputValue(), 'Blocked');
    assert.equal(await page.locator('input[data-label="ops"]').isChecked(), true);
    assert.equal(await page.locator('#ticket-list tbody tr').count(), 1);
    assert.equal(await page.locator('#detail .dependency-resolved').count(), 1);
    await page.locator('#detail .markdown a[data-ticket]').click();
    assert.equal(await page.locator('#detail .markdown h1').textContent(), '01: Diseñar página 404');
    assert.equal(await page.locator('#detail .commit-record code').textContent(), 'abc123456789');
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await page.getByRole('button', { name: 'Missing dependency', exact: true }).click();
    assert.equal(await page.locator('#detail .dependency-invalid').count(), 1);
    assert.equal(await page.locator('#detail .dependency-link[data-ticket]').count(), 0);
    assert.ok((await page.locator('#detail .dependency-invalid').textContent()).includes('Ticket not found'));
    await page.locator('[data-feature="other-feature"]').click();
    assert.equal(await page.locator('#ticket-list tbody tr').count(), 1);
    await page.locator('[data-feature="feature-original"]').click();
    await page.getByRole('button', { name: 'Dependent work', exact: true }).click();
    await page.screenshot({ path: '.cache/tripi-tropi-states.png', fullPage: true });
    // Agent's external completion recalculates the dependent's frontier on Refresh.
    await writeFile(path.join(issues, '02-ready.md'), second.replace('Execution: pending', 'Execution: completed').replace('Commits: none', 'Commits: def123456789'));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.locator('#detail .ticket-meta .ready').waitFor();
    assert.equal(await page.locator('#detail .dependency-resolved').count(), 1);
    await writeFile(path.join(issues, '02-ready.md'), second);
    assert.deepEqual(await digest(repo), before);
  } finally {
    await browser.close(); await new Promise((resolve) => { viewer.server.close(resolve); viewer.server.closeAllConnections(); });
    await rm(repo, { recursive: true, force: true });
  }
});

test('browser follows a qualified blocker to the exact feature while preserving filters', { skip: !browserAvailable }, async () => {
  const repo = await fixture();
  const feature = path.join(repo, '.scratch/other-feature/issues');
  await mkdir(feature, { recursive: true });
  const ticket = (number, title, execution, dependency, commit) => `# ${number}: ${title}\nStatus: ready-for-agent\nExecution: ${execution}\nLabels: viewer\nBlocked by: ${dependency}\nCommits: ${commit}\n\n## Initial state\n### What to build\nDeliver ${title}.\n### Atomicity\nOne complete result.\n### Acceptance criteria\n- [x] Verify.\n## Work performed\nRecorded.\n## Final state\nReady.\n`;
  await writeFile(path.join(feature, '01-original.md'), ticket('01', 'Other feature', 'pending', 'none', 'none'));
  const source = path.join(repo, '.scratch/feature-original/issues/02-dependent.md');
  await writeFile(source, ticket('02', 'Dependent ticket', 'pending', 'other-feature:01', 'none'));
  const viewer = await createViewer({ repo });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(viewer.url);
    await page.getByRole('button', { name: 'Dependent ticket', exact: true }).click();
    assert.equal(await page.locator('#detail .ticket-meta .state').textContent(), 'Blocked');
    assert.match(await page.locator('.dependency-link').first().textContent(), /other-feature.*01.*Other feature/s);
    await page.locator('.dependency-link[data-ticket]').first().click();
    assert.equal(await page.locator('#detail-path').textContent(), 'other-feature/issues/01-original.md');
    assert.equal(await page.locator('#detail-kind').textContent(), 'Ticket 01');
    assert.equal(await page.locator('#detail .markdown h1').textContent(), '01: Other feature');
    assert.equal(new URL(page.url()).searchParams.get('feature'), 'other-feature');
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('#detail-path').textContent === 'feature-original/issues/02-dependent.md');
  } finally {
    await browser.close(); await new Promise((resolve) => { viewer.server.close(resolve); viewer.server.closeAllConnections(); });
    await rm(repo, { recursive: true, force: true });
  }
});

test('browser selects and unlinks Codex sessions, closes the menu accessibly and exits without closing its tab', { skip: !browserAvailable }, async () => {
  const repo = await fixture();
  await writeFile(path.join(repo, '.scratch/feature-original/issues/02-ready.md'), '# 02: Ready ticket\nStatus: ready-for-agent\nExecution: pending\nLabels: demo\nBlocked by: none\nCommits: none\n\n## Initial state\n### What to build\nOne outcome.\n### Atomicity\nComplete result.\n### Acceptance criteria\n- [ ] Verify.\n## Work performed\nPending.\n## Final state\nPending.\n');
  const before = await digest(repo);
  const sessions = [{ id: 'session-one', name: 'First session' }, { id: 'session-two', name: 'Second session' }];
  const viewer = await createViewer({ repo, thread: 'session-one', controlToken: 'viewer-control-token', queueOptions: { resolveSessions: async () => sessions, resolveThreadName: async (id) => sessions.find((item) => item.id === id)?.name ?? null } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  let emptyViewer;
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.goto(viewer.url);
    const session = page.locator('#queue-session');
    await page.waitForFunction(() => !document.querySelector('#queue-session').disabled);
    await session.click();
    await page.getByRole('menuitemradio', { name: /Second session.*session-two/ }).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#session-menu').isHidden(), true);
    assert.equal(await session.evaluate((node) => node === document.activeElement), true);
    await session.click(); await page.mouse.click(20, 500);
    assert.equal(await page.locator('#session-menu').isHidden(), true);
    await session.click(); await page.getByRole('menuitemradio', { name: /Second session.*session-two/ }).click();
    await page.waitForFunction(() => document.querySelector('#queue-session').textContent.includes('Second session - session-two'));
    assert.match(await session.textContent(), /Second session - session-two/, await page.locator('#error').textContent());
    await session.click(); await page.locator('.session-unlink').click();
    await page.waitForFunction(() => document.querySelector('#queue-session').textContent === 'Codex: not linked');
    assert.equal(await session.textContent(), 'Codex: not linked');
    await page.locator('[data-feature="feature-original"]').click();
    await page.locator('#ticket-list [data-ticket="feature-original/02-ready.md"]').click();
    assert.equal(await page.getByRole('button', { name: 'Queue implementation', exact: true }).isDisabled(), true);
    await page.route('**/control/stop', (route) => route.abort());
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Could not exit the viewer' }).waitFor();
    await page.unroute('**/control/stop');
    await page.getByRole('button', { name: 'Exit', exact: true }).click();
    await page.getByText('Viewer stopped. This browser tab stays open.', { exact: true }).waitFor();
    assert.equal(page.isClosed(), false);
    emptyViewer = await createViewer({ repo, queueOptions: { resolveSessions: async () => [] } });
    await page.goto(emptyViewer.url);
    await page.waitForFunction(() => !document.querySelector('#queue-session').disabled);
    await page.locator('#queue-session').click();
    await page.getByText('No sessions are available in the local Codex index.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('menuitemradio').count(), 0);
    assert.deepEqual(await digest(repo), before);
  } finally {
    await browser.close();
    await Promise.all([viewer, emptyViewer].filter(Boolean).map(({ server }) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); })));
    await rm(repo, { recursive: true, force: true });
  }
});
