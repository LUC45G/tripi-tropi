import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createSnapshotStream } from '../skills/tripi-tropi/scripts/snapshot-stream.mjs';
import { createViewer } from '../skills/tripi-tropi/scripts/server.mjs';

const browserPath = process.env.TRIPI_TROPI_BROWSER ?? (process.platform === 'win32' ? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' : '');
const browserAvailable = browserPath && existsSync(browserPath);
const ticket = (number, execution = 'pending', blocker = 'none') => `# ${number}: Ticket original ${number}
Status: ready-for-agent
Execution: ${execution}
Labels: viewer
Blocked by: ${blocker}
Commits: ${execution === 'completed' ? 'abc123456789' : 'none'}

## Estado inicial
### Qué construir
${'Descripción original para conservar la posición de lectura.\n\n'.repeat(70)}
### Atomicidad
Resultado completo.
### Criterios de aceptación
- [ ] Verificar resultado.
## Trabajo realizado
Pendiente.
## Estado posterior
Pendiente.
`;
async function until(predicate, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  assert.fail('Expected live update did not arrive');
}
const stop = ({ server }) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); });

test('watcher observes a newly created tree, atomic saves, dependencies, config, renames and removal', async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-live-events-'));
  const stream = await createSnapshotStream(repo);
  const issues = path.join(repo, '.scratch/original/issues');
  const first = path.join(issues, '01-original.md');
  try {
    assert.equal(stream.snapshot().tickets.length, 0);
    await mkdir(issues, { recursive: true });
    await writeFile(first, ticket('01'));
    await writeFile(path.join(issues, '02-dependent.md'), ticket('02', 'pending', '01'));
    await until(() => stream.snapshot().tickets.length === 2);
    assert.equal(stream.snapshot().tickets[1].displayState, 'Blocked');
    const started = Date.now();
    await writeFile(`${first}.tmp`, ticket('01', 'completed').replace('viewer', 'updated'));
    await rename(`${first}.tmp`, first);
    await until(() => stream.snapshot().tickets[1].displayState === 'Ready to implement');
    assert.ok(Date.now() - started < 1000, 'normal atomic saves publish within one second');
    assert.deepEqual(stream.snapshot().tickets[0].commits, ['abc123456789']);
    assert.ok(stream.snapshot().tickets[0].labels.includes('updated'));
    await writeFile(path.join(repo, '.scratch/original/map.md'), '# Mapa original');
    await until(() => stream.snapshot().features[0].descriptionFile === 'map.md');
    await writeFile(path.join(repo, '.scratch/original/spec.md'), '# Spec original');
    await until(() => stream.snapshot().features[0].description === '# Spec original');
    await mkdir(path.join(repo, 'docs/agents'), { recursive: true });
    await writeFile(path.join(repo, 'docs/agents/triage-labels.md'), '| ready-for-agent | aprobado |');
    await until(() => stream.snapshot().triageRoles.aprobado === 'ready-for-agent');
    await rename(first, path.join(issues, '01-renamed.md'));
    await until(() => stream.snapshot().tickets[0].filename === '01-renamed.md');
    await rm(path.join(repo, '.scratch'), { recursive: true });
    await until(() => stream.snapshot().features.length === 0);
    await mkdir(issues, { recursive: true }); await writeFile(first, ticket('01'));
    await until(() => stream.snapshot().tickets.length === 1);
    const revision = stream.snapshot().revision;
    await writeFile(path.join(repo, 'unrelated.md'), 'No tickets here.');
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(stream.snapshot().revision, revision);
  } finally { await stream.close(); await rm(repo, { recursive: true, force: true }); }
});

test('live browser preserves workspace, navigates history, reconnects and falls back after deletion', { skip: !browserAvailable }, async () => {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-live-browser-'));
  const issues = path.join(repo, '.scratch/original/issues');
  await mkdir(issues, { recursive: true });
  const first = path.join(issues, '01-original.md');
  await writeFile(first, ticket('01')); await writeFile(path.join(issues, '02-original.md'), ticket('02'));
  let viewer = await createViewer({ repo });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const failures = []; page.on('pageerror', (error) => failures.push(error.message));
    await page.goto(viewer.url);
    await page.waitForFunction(() => document.querySelector('#live-status').textContent === 'Live');
    assert.equal(await page.locator('link[rel=icon]').getAttribute('href'), '/icon.svg');
    const favicon = await fetch(`${viewer.url}/icon.svg`);
    assert.match(favicon.headers.get('content-type'), /image\/svg\+xml/);
    assert.equal(await favicon.text(), await readFile('icon.svg', 'utf8'));
    await page.getByRole('button', { name: 'Ticket original 01', exact: true }).click();
    await page.locator('#state-filter').selectOption('Ready to implement');
    await page.locator('#label-summary').click();
    await page.locator('[data-label=viewer]').check();
    await page.locator('#label-summary').click();
    const sidebar = page.locator('.sidebar');
    const sidebarHandle = await page.locator('#sidebar-splitter').boundingBox();
    await page.mouse.move(sidebarHandle.x + 3, sidebarHandle.y + 100); await page.mouse.down();
    await page.mouse.move(sidebarHandle.x + 63, sidebarHandle.y + 100); await page.mouse.up();
    assert.ok((await sidebar.boundingBox()).width > 270);
    const detailHandle = await page.locator('#detail-splitter').boundingBox();
    const beforeWidth = (await page.locator('.tickets-pane').boundingBox()).width;
    await page.mouse.move(detailHandle.x + 3, detailHandle.y + 100); await page.mouse.down();
    await page.mouse.move(detailHandle.x + 83, detailHandle.y + 100); await page.mouse.up();
    assert.ok((await page.locator('.tickets-pane').boundingBox()).width > beforeWidth + 70);
    await page.locator('#sidebar-splitter').focus(); await page.keyboard.press('ArrowRight');
    const sidebarWidth = (await sidebar.boundingBox()).width;
    await page.locator('#detail').evaluate((node) => { node.scrollTop = 700; });
    await until(() => page.evaluate(() => history.state?.scroll.detail === 700));
    await writeFile(`${first}.tmp`, ticket('01').replace('Commits: none', 'Commits: def123456789'));
    await rename(`${first}.tmp`, first);
    await page.waitForFunction(() => document.querySelector('#detail .commit-record').textContent.includes('def123456789'));
    assert.equal(await page.locator('#detail').evaluate((node) => node.scrollTop), 700);
    assert.equal(await page.locator('#state-filter').inputValue(), 'Ready to implement');
    assert.equal(await page.locator('[data-label=viewer]').isChecked(), true);
    assert.equal((await sidebar.boundingBox()).width, sidebarWidth);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#detail .commit-record')?.textContent.includes('def123456789'));
    assert.equal(await page.locator('#detail').evaluate((node) => node.scrollTop), 700);
    assert.equal((await sidebar.boundingBox()).width, sidebarWidth);
    const deepLink = page.url();
    await page.getByRole('button', { name: 'Ticket original 02', exact: true }).click();
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('#detail-kind').textContent === 'Ticket 01');
    await page.goForward();
    await page.waitForFunction(() => document.querySelector('#detail-kind').textContent === 'Ticket 02');
    await page.goto(deepLink);
    await page.waitForFunction(() => document.querySelector('#detail-kind').textContent === 'Ticket 01');
    assert.deepEqual(await page.locator('button:enabled, a[href], summary, select, input[type=checkbox]:enabled, #ticket-list tbody tr, .splitter').evaluateAll((nodes) => nodes.filter((node) => getComputedStyle(node).cursor !== 'pointer').map((node) => node.outerHTML)), []);
    const port = Number(new URL(viewer.url).port);
    await stop(viewer);
    await page.waitForFunction(() => document.querySelector('#live-status').textContent.includes('Reconnecting'));
    await writeFile(first, ticket('01').replace('Commits: none', 'Commits: fed123456789'));
    viewer = await createViewer({ repo, port });
    await page.waitForFunction(() => document.querySelector('#detail .commit-record')?.textContent.includes('fed123456789'));
    await page.waitForFunction(() => document.querySelector('#live-status').textContent === 'Live');
    // An unreadable tree reports an error while keeping the last good snapshot.
    const scratch = path.join(repo, '.scratch');
    await rm(scratch, { recursive: true }); await writeFile(scratch, 'Not a directory');
    await page.waitForFunction(() => !document.querySelector('#error').hidden);
    assert.match(await page.locator('#error').textContent(), /Could not read updates/);
    assert.equal(await page.locator('#detail-kind').textContent(), 'Ticket 01');
    await rm(scratch); await mkdir(issues, { recursive: true });
    await writeFile(first, ticket('01').replace('Commits: none', 'Commits: fed123456789'));
    await writeFile(path.join(issues, '02-original.md'), ticket('02'));
    await page.waitForFunction(() => document.querySelector('#error').hidden);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('.tickets-pane').isVisible(), false);
    await page.locator('[data-mobile-view=list]').click();
    assert.equal(await page.locator('.tickets-pane').isVisible(), true);
    assert.equal(await page.locator('.detail-pane').isVisible(), false);
    await page.getByRole('button', { name: 'Ticket original 01', exact: true }).click();
    assert.equal(await page.locator('.detail-pane').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await mkdir('.cache', { recursive: true });
    await page.screenshot({ path: '.cache/tripi-tropi-mobile.png' });
    await rm(first);
    await page.waitForFunction(() => document.querySelector('#detail-kind').textContent === 'Feature overview');
    assert.equal(new URL(page.url()).searchParams.has('ticket'), false);
    assert.equal(await page.locator('#state-filter').inputValue(), 'Ready to implement');
    assert.deepEqual(failures, []);
  } finally { await browser.close(); await stop(viewer); await rm(repo, { recursive: true, force: true }); }
});
