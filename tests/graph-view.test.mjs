import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { projectGraph } from '../skills/tripi-tropi/assets/graph.mjs';
import { createViewer } from '../skills/tripi-tropi/scripts/server.mjs';

const browserPath = process.env.TRIPI_TROPI_BROWSER ?? (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : '');
const node = (number, overrides = {}) => ({ id: `demo/${number}-task.md`, feature: 'demo', number, metadata: { Labels: 'design, backend' }, diagnostics: [], dependencies: [], ...overrides });
const dependency = (number, feature = 'demo') => ({ id: `${feature}/${number}-task.md`, feature, number, satisfied: false });

test('graph projection preserves local tickets, first explicit label and blocker-to-dependent edges without mutating input', () => {
  const tickets = [node(2, { dependencies: [dependency(1), dependency(1, 'external')], labels: ['backend', 'ready-for-agent'] }), node(1), node(3, { metadata: { Labels: 'none' } }), node(1, { id: 'external/1-task.md', feature: 'external' })];
  const before = structuredClone(tickets);
  const graph = projectGraph(tickets, 'demo');
  assert.deepEqual(graph.nodes.map((item) => item.ticket.number), [1, 2, 3]);
  assert.deepEqual(graph.edges, [{ from: 'demo/1-task.md', to: 'demo/2-task.md', satisfied: false }]);
  assert.equal(graph.nodes[1].external, true);
  assert.equal(graph.nodes[1].primaryLabel, 'design');
  assert.equal(graph.nodes[2].primaryLabel, null);
  assert.deepEqual(tickets, before);
});

test('graph layout places prerequisites before dependents with deterministic bounded coordinates', () => {
  const tickets = [node(4, { dependencies: [dependency(2), dependency(3)] }), node(3, { dependencies: [dependency(1)] }), node(1), node(2, { dependencies: [dependency(1)] }), node(5)];
  const graph = projectGraph(tickets, 'demo');
  assert.deepEqual(projectGraph([...tickets].reverse(), 'demo'), graph);
  const byId = new Map(graph.nodes.map((item) => [item.ticket.id, item]));
  for (const edge of graph.edges) assert.ok(byId.get(edge.from).x < byId.get(edge.to).x);
  assert.equal(new Set(graph.nodes.map((item) => `${item.x},${item.y}`)).size, tickets.length);
  for (const item of graph.nodes) {
    assert.ok(item.x > 35 && item.x + 35 < graph.width);
    assert.ok(item.y > 35 && item.y + 35 < graph.height);
  }
});

test('graph projection keeps cycles and invalid references visible without fabricating targets', () => {
  const graph = projectGraph([
    node(1, { dependencies: [dependency(2)], diagnostics: [{ severity: 'error', message: 'Cycle' }] }),
    node(2, { dependencies: [dependency(1)] }),
    node(3, { dependencies: [{ ...dependency(99), id: null }], diagnostics: [{ severity: 'error', message: 'Missing dependency' }] }),
  ], 'demo');
  assert.equal(graph.nodes.length, 3); assert.equal(graph.edges.length, 2);
  assert.deepEqual(graph.nodes[0].problems, ['Cycle']);
  assert.deepEqual(graph.nodes[2].problems, ['Missing dependency']);
  assert.ok(graph.nodes.every((item) => Number.isFinite(item.x) && Number.isFinite(item.y)));
});

test('graph projection handles empty features and tickets without explicit labels', () => {
  assert.deepEqual(projectGraph([], 'empty'), { nodes: [], edges: [], width: 150, height: 144 });
  const graph = projectGraph([node(1, { metadata: {} })], 'demo');
  assert.equal(graph.nodes[0].primaryLabel, null);
  assert.equal(graph.nodes[0].external, false);
  assert.deepEqual(graph.edges, []);
});

const body = (number, title, { blockers = 'none', labels = 'design, backend', execution = 'pending' } = {}) => `# ${number}: ${title}
Status: ready-for-agent
Execution: ${execution}
Labels: ${labels}
Blocked by: ${blockers}
Commits: ${execution === 'completed' ? 'abcdef123456' : 'none'}

## Initial state
### What to build
Original Markdown **sin traducir**.
### Atomicity
One complete result.
### Acceptance criteria
- [ ] Verify.
## Work performed
Pending.
## Final state
Pending.
`;

async function fixture(t) {
  const repo = await mkdtemp(path.join(tmpdir(), 'tripi-graph-'));
  const put = async (feature, number, content) => {
    const directory = path.join(repo, '.scratch', feature, 'issues');
    await mkdir(directory, { recursive: true });
    const file = path.join(directory, `${number}-task.md`);
    await writeFile(file, content); return file;
  };
  const readTree = async () => {
    const files = [];
    async function walk(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) await walk(file); else files.push([path.relative(repo, file), await readFile(file, 'utf8')]);
      }
    }
    await walk(repo); return files;
  };
  t.after(() => rm(repo, { recursive: true, force: true }));
  return { repo, put, readTree };
}
const stop = (viewer) => new Promise((resolve) => { viewer.server.close(resolve); viewer.server.closeAllConnections(); });

test('browser graph navigates tickets, retains filtered context and updates live with original files untouched', { skip: !browserPath || !existsSync(browserPath) }, async (t) => {
  const f = await fixture(t);
  const firstBody = body('01', 'Inicio original', { execution: 'completed' });
  const first = await f.put('demo', '01', firstBody);
  await f.put('demo', '02', body('02', 'Trabajo dependiente', { blockers: '01, external:01', labels: 'backend' }));
  await f.put('external', '01', body('01', 'External prerequisite'));
  const before = await f.readTree();
  const viewer = await createViewer({ repo: f.repo });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = []; page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(viewer.url);
    await page.getByRole('button', { name: 'Graph', exact: true }).click();
    const graph = page.locator('#ticket-graph');
    await graph.locator('.graph-node').first().waitFor();
    assert.equal(await graph.locator('.graph-node').count(), 2);
    assert.equal(await page.locator('#ticket-list').isVisible(), false);
    assert.equal(await graph.locator('.graph-node[data-ticket^="external/"]').count(), 0);
    assert.equal(await graph.locator('.graph-external').count(), 1);
    assert.equal(await graph.locator('.graph-external').textContent(), 'External dependency. See ticket details.');
    const edge = graph.locator('.graph-edge');
    assert.equal(await edge.getAttribute('data-from'), 'demo/01-task.md');
    assert.equal(await edge.getAttribute('data-to'), 'demo/02-task.md');
    assert.equal(await graph.locator('.graph-number').allTextContents().then((values) => values.join(',')), '01,02');
    const selected = graph.locator('[data-ticket="demo/02-task.md"]');
    await selected.hover();
    assert.match(await page.locator('#graph-tooltip').textContent(), /Trabajo dependiente.*Blocked.*backend/);
    assert.equal(await page.locator('#graph-tooltip').isVisible(), true);
    await selected.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#detail .markdown h1').textContent(), '02: Trabajo dependiente');
    assert.equal(await page.locator('#detail .markdown strong').textContent(), 'sin traducir');
    assert.match(await page.locator('#detail .dependency-record').textContent(), /external.*External prerequisite/s);
    assert.equal(await selected.getAttribute('aria-pressed'), 'true');
    const colors = await selected.evaluate((item) => ({ fill: getComputedStyle(item.querySelector('.graph-fill')).fill, border: getComputedStyle(item.querySelector('.graph-border')).stroke }));
    assert.equal(colors.fill, await page.locator('#detail .state').first().evaluate((item) => getComputedStyle(item).backgroundColor));
    assert.equal(colors.border, await page.locator('#detail .label-chip').first().evaluate((item) => getComputedStyle(item).color));
    await page.locator('#status-summary').click(); await page.locator('[data-state="Completed"]').click();
    assert.equal(await graph.locator('.graph-node').count(), 2);
    assert.equal(await graph.locator('.graph-edge').count(), 1);
    assert.equal(await selected.evaluate((item) => item.classList.contains('graph-dimmed')), true);
    await page.locator('#label-summary').click(); await page.locator('[data-label="design"]').check();
    assert.equal(await graph.locator('.graph-node').count(), 2);
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await writeFile(first, body('01', 'Inicio actualizado', { labels: 'ops', execution: 'in-progress' }));
    await page.waitForFunction(() => document.querySelector('#ticket-graph [data-ticket="demo/01-task.md"]')?.getAttribute('aria-label').includes('Inicio actualizado'));
    assert.equal(await graph.locator('[data-ticket="demo/01-task.md"].in-progress').count(), 1);
    assert.equal(await edge.evaluate((item) => item.classList.contains('resolved')), false);
    await graph.locator('[data-ticket="demo/01-task.md"]').click();
    await page.goBack();
    await page.waitForFunction(() => document.querySelector('#detail-kind').textContent === 'Ticket 02');
    assert.equal(await graph.isVisible(), true);
    await page.getByRole('button', { name: 'List', exact: true }).click();
    assert.equal(await page.locator('#ticket-list').isVisible(), true);
    assert.equal(await graph.isVisible(), false);
    assert.equal(await page.locator('#detail-kind').textContent(), 'Ticket 02');
    await page.getByRole('button', { name: 'Graph', exact: true }).click();
    await page.locator('#detail .dependency-link[data-ticket="external/01-task.md"]').click();
    assert.equal(await graph.locator('.graph-node').count(), 1);
    assert.equal(await graph.locator('[data-ticket="external/01-task.md"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(errors, []);
    await writeFile(first, firstBody);
    assert.deepEqual(await f.readTree(), before);
  } finally { await browser.close(); await stop(viewer); }
});

test('browser graph exposes cycles, invalid references and neutral labels within a responsive accessible panel', { skip: !browserPath || !existsSync(browserPath) }, async (t) => {
  const f = await fixture(t);
  await f.put('demo', '01', body('01', '<img src=x onerror=alert(1)>', { blockers: '02', labels: 'none' }));
  await f.put('demo', '02', body('02', 'Cycle partner', { blockers: '01' }));
  await f.put('demo', '03', body('03', 'Missing dependency', { blockers: '99' }));
  await f.put('demo', '04', body('04', 'Independent'));
  await mkdir(path.join(f.repo, '.scratch/empty/issues'), { recursive: true });
  const before = await f.readTree();
  const viewer = await createViewer({ repo: f.repo });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(`${viewer.url}/?feature=demo&tickets=graph`);
    const graph = page.locator('#ticket-graph');
    await graph.locator('.graph-node').first().waitFor();
    assert.equal(await graph.locator('.graph-node').count(), 4);
    assert.equal(await graph.locator('.graph-warning').count(), 3);
    assert.equal(await graph.locator('.graph-edge').count(), 2);
    assert.equal(await graph.locator('img, script, [onerror]').count(), 0);
    const first = graph.locator('[data-ticket="demo/01-task.md"]');
    assert.equal(await first.locator('.graph-neutral').count(), 1);
    await first.focus();
    assert.match(await page.locator('#graph-tooltip').textContent(), /dependency cycle/);
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#detail-kind').textContent(), 'Ticket 01');
    assert.equal(await first.evaluate((item) => item === document.activeElement), true);
    await page.locator('#detail-splitter').focus(); await page.keyboard.press('Home');
    for (const width of [1000, 390]) {
      await page.setViewportSize({ width, height: 844 });
      if (width === 390) await page.locator('[data-mobile-view="list"]').click();
      assert.equal(await graph.isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await graph.evaluate((item) => item.scrollWidth > item.clientWidth), false);
    }
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.locator('[data-feature="empty"]').click();
    assert.equal(await graph.getByText('No tickets in this feature', { exact: true }).isVisible(), true);
    assert.equal(await graph.locator('.graph-node').count(), 0);
    assert.deepEqual(await f.readTree(), before);
  } finally { await browser.close(); await stop(viewer); }
});
