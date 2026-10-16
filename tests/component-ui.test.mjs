import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';
import { createViewer } from '../skills/tripi-tropi/scripts/server.mjs';
import { loadTickets } from '../skills/tripi-tropi/scripts/tickets.mjs';

const browserPath = process.env.TRIPI_TROPI_BROWSER ?? (process.platform === 'win32' ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' : '');
const browserOptions = { skip: !browserPath || !existsSync(browserPath) };
const thread = '11111111-1111-1111-1111-111111111111';
const id = (number, feature = 'demo') => `${feature}/${String(number).padStart(2, '0')}-task.md`;
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
async function fixture(t) {
  const base = await mkdtemp(path.join(tmpdir(), 'tripi-component-ui-')); const repo = path.join(base, 'repo'); await mkdir(repo);
  const put = async (number, options = {}, feature = 'demo') => {
    const directory = path.join(repo, '.scratch', feature, 'issues'); await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${String(number).padStart(2, '0')}-task.md`), body(number, options));
  };
  const contents = async () => (await loadTickets(repo)).tickets.map((ticket) => [ticket.id, ticket.content]);
  t.after(() => rm(base, { recursive: true, force: true }));
  return { repo, put, contents, queueOptions: { stateDirectory: path.join(base, 'state'), resolveSessions: async () => [{ id: thread, name: 'Test session', threadSource: 'user' }], resolveThreadName: async () => 'Test session' } };
}
const stop = (viewer) => new Promise((resolve) => { viewer.server.close(resolve); viewer.server.closeAllConnections(); });
async function preparePage(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text) => { if (window.failClipboard) throw new Error('Clipboard denied'); window.copiedMessage = text; } } });
  });
  await page.goto(`${url}/?feature=demo&tickets=graph`);
  return page;
}
async function openReview(page, number = 1) {
  await page.locator(`#ticket-graph [data-ticket="${id(number)}"]`).click();
  await page.getByRole('button', { name: 'Isolate dependencies', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('[data-graph-action="review"]').disabled);
  await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.locator('.component-order').waitFor(); return dialog;
}

test('browser review errors identify the ticket and dismiss only when the click starts and ends outside', browserOptions, async (t) => {
  const f = await fixture(t); await f.put(7, { status: 'needs-info' }); const before = await f.contents();
  const viewer = await createViewer({ repo: f.repo, thread, queueOptions: { ...f.queueOptions, deliver: async () => assert.fail('must not send') } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await preparePage(browser, viewer.url);
    await page.locator(`#ticket-graph [data-ticket="${id(7)}"]`).click();
    await page.getByRole('button', { name: 'Isolate dependencies', exact: true }).click();
    const review = page.getByRole('button', { name: 'Review dependencies', exact: true });
    await review.click(); const dialog = page.getByRole('dialog');
    await dialog.getByRole('alert').waitFor();
    assert.equal(await dialog.getByRole('alert').textContent(), 'Ticket 07: Ticket 7 must be pending and ready-for-agent, without an existing claim.');
    assert.doesNotMatch(await dialog.textContent(), /demo\/07-task.md|Codex:|Questions are answered/);
    assert.deepEqual(await dialog.getByRole('button').allTextContents(), ['Cancel', 'Copy implementation message', 'Queue dependencies']);
    assert.equal(await dialog.locator('[data-component-action="copy"]').isDisabled(), true);
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), true);
    const box = await dialog.boundingBox();
    const inside = { x: box.x + 8, y: box.y + 8 };
    const outside = { x: box.x - 12, y: box.y + 8 };
    await page.mouse.click(inside.x, inside.y); assert.equal(await dialog.isVisible(), true);
    await page.mouse.move(inside.x, inside.y); await page.mouse.down();
    await page.mouse.move(outside.x, outside.y); await page.mouse.up();
    assert.equal(await dialog.isVisible(), true);
    await page.mouse.move(outside.x, outside.y); await page.mouse.down();
    await page.mouse.move(inside.x, inside.y); await page.mouse.up();
    assert.equal(await dialog.isVisible(), true);
    await page.mouse.click(outside.x, outside.y); assert.equal(await dialog.isVisible(), false);
    assert.equal(await review.evaluate((button) => button === document.activeElement), true);
    await review.click(); await dialog.getByRole('alert').waitFor();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await dialog.isVisible(), false);
    assert.deepEqual(await f.contents(), before);
    assert.deepEqual((await (await fetch(`${viewer.url}/api/queue`)).json()).records, {});
  } finally { await browser.close(); await stop(viewer); }
});

test('browser reviews full filtered components, copies without delivery and queues one instruction with separate delivery status', browserOptions, async (t) => {
  const f = await fixture(t); await f.put(1, { execution: 'completed' }); await f.put(2, { blockers: '01' }); await f.put(3, { blockers: '01' }); await f.put(4, { blockers: '02, 03' });
  await f.put(5);
  const before = await f.contents(); let release; const waiting = new Promise((resolve) => { release = resolve; }); const sent = [];
  const viewer = await createViewer({ repo: f.repo, thread, queueOptions: { ...f.queueOptions, deliver: async (value) => { sent.push(value); await waiting; } } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await preparePage(browser, viewer.url); const requests = [];
    page.on('request', (request) => { if (request.url().endsWith('/api/component-queue')) requests.push(request.url()); });
    await page.locator('#status-summary').click(); await page.locator('[data-state="Completed"]').click();
    let dialog = await openReview(page, 4);
    assert.equal(await page.locator('#ticket-graph [data-ticket="demo/05-task.md"].graph-outside').count(), 1);
    assert.deepEqual(await dialog.locator('.component-order li').allTextContents(), ['02: Ticket 2', '03: Ticket 3', '04: Ticket 4']);
    assert.match(await dialog.textContent(), /Filters do not exclude tickets/);
    assert.match(await dialog.textContent(), /Already completed.*Ticket 1/s);
    await dialog.getByRole('button', { name: 'Copy implementation message', exact: true }).click();
    await dialog.getByRole('button', { name: 'Copied', exact: true }).waitFor();
    assert.match(await page.evaluate(() => window.copiedMessage), /02-task\.md/);
    assert.equal(sent.length, 0);
    assert.deepEqual((await (await fetch(`${viewer.url}/api/queue`)).json()).records, {});
    await page.keyboard.press('Escape'); assert.equal(await dialog.isVisible(), false);
    assert.equal(await page.locator('[data-graph-action="review"]').evaluate((button) => button === document.activeElement), true);
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    dialog = page.getByRole('dialog'); await dialog.locator('.component-order').waitFor();
    await dialog.locator('[data-component-action="queue"]').evaluate((button) => { button.click(); button.click(); });
    await dialog.getByRole('button', { name: 'Sending', exact: true }).waitFor();
    assert.equal(await dialog.getByRole('button', { name: 'Sending', exact: true }).isDisabled(), true);
    release(); await dialog.getByRole('button', { name: 'Queued', exact: true }).waitFor();
    assert.equal(sent.length, 1); assert.equal(requests.length, 1);
    assert.equal(Object.hasOwn((await (await fetch(`${viewer.url}/api/queue`)).json()).records, id(5)), false);
    assert.match(await dialog.locator('#component-status').textContent(), /Delivery only/);
    assert.doesNotMatch(await dialog.textContent(), /Codex:|Questions are answered in the agent CLI|Closing the viewer does not cancel/);
    assert.equal(await dialog.getByRole('button', { name: 'Review again', exact: true }).count(), 0);
    assert.equal(await dialog.getByRole('button', { name: 'Queued', exact: true }).isDisabled(), true);
    assert.deepEqual(await f.contents(), before);
  } finally { release(); await browser.close(); await stop(viewer); }
});

test('browser external confirmation cancels safely, resets on stale plans and links to blockers before review', browserOptions, async (t) => {
  const f = await fixture(t); await f.put(1); await f.put(2, { blockers: '01, other:01' }); await f.put(1, {}, 'other');
  const before = await f.contents(); const sent = [];
  const viewer = await createViewer({ repo: f.repo, thread, queueOptions: { ...f.queueOptions, deliver: async (value) => sent.push(value) } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await preparePage(browser, viewer.url); let dialog = await openReview(page, 2);
    assert.match(await dialog.textContent(), /This ticket has an external dependency\. The implementation flow will pause before completing the full set\. Continue\?/);
    assert.equal(await dialog.locator('[data-component-confirm="confirmExternal"]').isChecked(), false);
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), true);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.deepEqual((await (await fetch(`${viewer.url}/api/queue`)).json()).records, {});
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    dialog = page.getByRole('dialog'); await dialog.locator('[data-component-confirm="confirmExternal"]').check();
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), false);
    await f.put(2, { blockers: '01, other:01', text: 'Updated requirements.' });
    await dialog.getByRole('alert').filter({ hasText: 'The plan or workspace changed' }).waitFor();
    assert.equal(await dialog.locator('[data-component-confirm="confirmExternal"]').isChecked(), false);
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), true);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    await dialog.locator('.component-order').waitFor();
    assert.equal(await dialog.locator('[data-component-confirm="confirmExternal"]').isChecked(), false);
    await dialog.locator('[data-component-ticket="other/01-task.md"]').click();
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await page.locator('#detail-path').textContent(), 'other/issues/01-task.md');
    await page.goBack(); await page.locator('#ticket-graph [data-ticket="demo/01-task.md"]').waitFor();
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    await dialog.locator('.component-order').waitFor();
    await f.put(1, { status: 'needs-info' });
    await dialog.getByRole('alert').filter({ hasText: 'The plan or workspace changed' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    await dialog.getByRole('alert').filter({ hasText: 'ready-for-agent' }).waitFor();
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), true);
    assert.equal(sent.length, 0);
    await f.put(1); await f.put(2, { blockers: '01, other:01' });
    assert.deepEqual(await f.contents(), before);
  } finally { await browser.close(); await stop(viewer); }
});

test('browser manually resumes paused component work with fresh acknowledgment and skips completed tickets', browserOptions, async (t) => {
  const f = await fixture(t); await f.put(1); await f.put(2, { blockers: '01, other:01' }); await f.put(3, { blockers: '02' }); await f.put(1, {}, 'other'); const sent = [];
  const viewer = await createViewer({ repo: f.repo, thread, queueOptions: { ...f.queueOptions, deliver: async (value) => sent.push(value) } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await preparePage(browser, viewer.url); const dialog = await openReview(page, 3);
    await dialog.locator('[data-component-confirm="confirmExternal"]').check();
    await dialog.getByRole('button', { name: 'Queue dependencies', exact: true }).click();
    await dialog.getByRole('button', { name: 'Queued', exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await f.put(1, { execution: 'completed' }); await f.put(1, { execution: 'completed' }, 'other');
    await page.locator('#ticket-graph [data-ticket="demo/01-task.md"].completed').waitFor();
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    await dialog.locator('[data-component-confirm="confirmPaused"]').waitFor();
    assert.equal(await dialog.locator('[data-component-confirm="confirmExternal"]').count(), 0);
    assert.deepEqual(await dialog.locator('.component-order li').allTextContents(), ['02: Ticket 2', '03: Ticket 3']);
    assert.equal(await dialog.getByRole('button', { name: 'Queue remaining tickets', exact: true }).isDisabled(), true);
    await dialog.locator('[data-component-confirm="confirmPaused"]').check();
    await dialog.getByRole('button', { name: 'Queue remaining tickets', exact: true }).click();
    await dialog.getByRole('button', { name: 'Queued', exact: true }).waitFor();
    assert.equal(sent.length, 2);
    const plan = JSON.parse(sent[1].message.split('Plan (JSON data):\n')[1].split('\nRules:')[0]);
    assert.deepEqual(plan.order.map((ticket) => ticket.id), [id(2), id(3)]);
    assert.equal((await loadTickets(f.repo)).tickets.find((ticket) => ticket.id === id(2)).execution, 'pending');
  } finally { await browser.close(); await stop(viewer); }
});

test('browser allows unlinked copy, reports clipboard and delivery errors and never automatically retries', browserOptions, async (t) => {
  const f = await fixture(t); await f.put(1); const before = await f.contents(); let calls = 0;
  const viewer = await createViewer({ repo: f.repo, queueOptions: { ...f.queueOptions, deliver: async () => { calls++; throw new Error('Simulated uncertain delivery'); } } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await preparePage(browser, viewer.url); const dialog = await openReview(page);
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), true);
    assert.equal(await dialog.locator('[data-component-action="copy"]').isDisabled(), false);
    await page.evaluate(() => { window.failClipboard = true; });
    await dialog.locator('[data-component-action="copy"]').click();
    await dialog.getByRole('alert').filter({ hasText: 'Clipboard denied' }).waitFor();
    await page.evaluate(() => { window.failClipboard = false; });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    await dialog.locator('.component-order').waitFor(); await dialog.locator('[data-component-action="copy"]').click();
    await dialog.getByRole('button', { name: 'Copied', exact: true }).waitFor();
    assert.equal(calls, 0); assert.deepEqual((await (await fetch(`${viewer.url}/api/queue`)).json()).records, {});
    await page.keyboard.press('Escape');
    await page.locator('#queue-session').click(); await page.locator(`#session-menu [data-session="${thread}"]`).click();
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    await dialog.locator('.component-order').waitFor(); await dialog.locator('[data-component-action="queue"]').click();
    await dialog.getByRole('alert').filter({ hasText: 'Simulated uncertain delivery' }).waitFor();
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), true);
    assert.match(await dialog.textContent(), /No retry was sent/);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    await dialog.getByText('Some tickets already have a delivery attempt.', { exact: false }).waitFor();
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), true);
    assert.equal(calls, 1); assert.deepEqual(await f.contents(), before);
  } finally { await browser.close(); await stop(viewer); }
});

test('browser invalidates review on history context changes and closing a pending delivery never resends it', browserOptions, async (t) => {
  const f = await fixture(t); await f.put(1); await f.put(2, { blockers: '01, other:01' }); await f.put(1, {}, 'other');
  const before = await f.contents(); let release; const waiting = new Promise((resolve) => { release = resolve; }); let calls = 0;
  const viewer = await createViewer({ repo: f.repo, thread, queueOptions: { ...f.queueOptions, deliver: async () => { calls++; await waiting; } } });
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    const page = await preparePage(browser, viewer.url);
    await page.locator('#status-summary').click(); await page.locator('[data-state="Blocked"]').click();
    const dialog = await openReview(page, 2);
    await dialog.locator('[data-component-confirm="confirmExternal"]').check();
    await page.goBack(); await page.goBack();
    await dialog.getByRole('alert').filter({ hasText: 'workspace changed' }).waitFor();
    assert.equal(await dialog.locator('[data-component-confirm="confirmExternal"]').isChecked(), false);
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), true);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    await dialog.locator('.component-order').waitFor();
    await dialog.locator('[data-component-confirm="confirmExternal"]').check();
    await dialog.locator('[data-component-action="queue"]').click();
    await dialog.getByRole('button', { name: 'Sending', exact: true }).waitFor();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    assert.equal(await dialog.isVisible(), false);
    assert.equal(await page.locator('[data-graph-action="review"]').isDisabled(), true);
    release(); await page.waitForFunction(() => !document.querySelector('[data-graph-action="review"]').disabled);
    await page.getByRole('button', { name: 'Review dependencies', exact: true }).click();
    await dialog.getByText('Some tickets already have a delivery attempt.', { exact: false }).waitFor();
    assert.equal(await dialog.locator('[data-component-action="queue"]').isDisabled(), true);
    assert.equal(calls, 1); assert.deepEqual(await f.contents(), before);
  } finally { release(); await browser.close(); await stop(viewer); }
});
