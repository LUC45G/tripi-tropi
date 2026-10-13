/* All file content is data. Only sanitized Markdown is inserted as HTML. */
const el = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
let snapshot = { features: [], tickets: [], diagnostics: [] };
let selectedFeature = null;
let selectedTicket = null;
let loading = false;
let selectedState = '';
const selectedLabels = new Set();
const filterStates = ['', 'Pending', 'Ready to implement', 'In progress', 'Blocked', 'Completed', 'Discarded', 'Unknown'];
let workspaceKey;
let mobileView = 'list';
let layout = { sidebar: 220, split: 50 };
let sidebarCollapsed = false;
let storageTimer;
let eventSource;
let queueInfo = { thread: null, token: '', records: {} };
const workspace = document.querySelector('.workspace');
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
async function loadSkillVersion() {
  try {
    const response = await fetch('/api/health');
    const health = await response.json();
    if (response.ok && health.skillVersion) el('skill-version').textContent = `v${health.skillVersion}`;
  } catch { /* The live connection reports any later server error. */ }
}

function scrollPositions() {
  return { detail: el('detail').scrollTop, list: el('ticket-list').scrollTop, features: el('features').scrollTop };
}
function restoreScroll(scroll = {}) {
  el('detail').scrollTop = scroll.detail ?? 0;
  el('ticket-list').scrollTop = scroll.list ?? 0;
  el('features').scrollTop = scroll.features ?? 0;
}
function savedWorkspace() {
  try { return JSON.parse(localStorage.getItem(workspaceKey)) ?? {}; } catch { return {}; }
}
function persistWorkspace() {
  if (!workspaceKey) return;
  try { localStorage.setItem(workspaceKey, JSON.stringify({ feature: selectedFeature, ticket: selectedTicket, state: selectedState, labels: [...selectedLabels], mobileView, layout, sidebarCollapsed, scroll: scrollPositions() })); } catch { /* Storage disabled: the viewer still works. */ }
}
function readRoute() {
  const params = new URLSearchParams(location.search);
  selectedFeature = params.get('feature'); selectedTicket = params.get('ticket');
  selectedState = params.get('state') ?? '';
  selectedLabels.clear(); for (const label of params.getAll('label')) selectedLabels.add(label);
  mobileView = params.get('view') === 'detail' ? 'detail' : 'list';
}
function writeRoute(method = 'replace') {
  const params = new URLSearchParams();
  if (selectedFeature) params.set('feature', selectedFeature);
  if (selectedTicket) params.set('ticket', selectedTicket);
  if (selectedState) params.set('state', selectedState);
  for (const label of selectedLabels) params.append('label', label);
  if (mobileView === 'detail') params.set('view', 'detail');
  history[`${method}State`]({ scroll: scrollPositions() }, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
  persistWorkspace();
}
function recordCurrentScroll() { history.replaceState({ scroll: scrollPositions() }, '', location.href); }
function applyLayout() {
  const width = workspace.clientWidth;
  const sidebarMax = Math.max(160, Math.min(400, width - 510));
  const sidebar = sidebarCollapsed ? 44 : clamp(layout.sidebar, 160, sidebarMax);
  const available = Math.max(0, width - sidebar - (sidebarCollapsed ? 6 : 12));
  const minimumPercent = Math.min(40, (240 / Math.max(1, available)) * 100);
  const split = clamp(layout.split, minimumPercent, 100 - minimumPercent);
  workspace.style.setProperty('--sidebar-size', `${sidebar}px`);
  workspace.style.setProperty('--ticket-share', `${split}fr`);
  workspace.style.setProperty('--detail-share', `${100 - split}fr`);
  el('sidebar-splitter').setAttribute('aria-valuemax', String(Math.round(sidebarMax)));
  el('sidebar-splitter').setAttribute('aria-valuenow', String(Math.round(sidebar)));
  el('detail-splitter').setAttribute('aria-valuemin', String(Math.round(minimumPercent)));
  el('detail-splitter').setAttribute('aria-valuemax', String(Math.round(100 - minimumPercent)));
  el('detail-splitter').setAttribute('aria-valuenow', String(Math.round(split)));
  workspace.dataset.sidebarCollapsed = String(sidebarCollapsed);
  el('toggle-sidebar').setAttribute('aria-expanded', String(!sidebarCollapsed));
  el('toggle-sidebar').setAttribute('aria-label', `${sidebarCollapsed ? 'Expand' : 'Collapse'} features sidebar`);
  el('toggle-sidebar').firstElementChild.textContent = sidebarCollapsed ? '›' : '‹';
}
function applyMobileView() {
  workspace.dataset.mobileView = mobileView;
  for (const button of document.querySelectorAll('[data-mobile-view]')) button.setAttribute('aria-pressed', String(button.dataset.mobileView === mobileView));
}
function initializeWorkspace() {
  workspaceKey = `tripi-tropi:${snapshot.repo}`;
  const saved = savedWorkspace();
  sidebarCollapsed = saved.sidebarCollapsed === true;
  if (Number.isFinite(saved.layout?.sidebar) && Number.isFinite(saved.layout?.split)) layout = saved.layout;
  if (location.search) readRoute();
  else {
    selectedFeature = typeof saved.feature === 'string' ? saved.feature : null;
    selectedTicket = typeof saved.ticket === 'string' ? saved.ticket : null;
    selectedState = typeof saved.state === 'string' ? saved.state : '';
    selectedLabels.clear(); for (const label of Array.isArray(saved.labels) ? saved.labels : []) if (typeof label === 'string') selectedLabels.add(label);
    mobileView = saved.mobileView === 'detail' ? 'detail' : 'list';
  }
  if (!filterStates.includes(selectedState)) selectedState = '';
  applyLayout(); return saved;
}
const stateClass = (state) => ({ Completed: 'completed', 'Ready to implement': 'ready', 'In progress': 'in-progress', Blocked: 'blocked', Discarded: 'discarded', Pending: 'pending' }[state] ?? 'unknown');
const stateChip = (state) => `<span class="state ${stateClass(state)}">${escapeHTML(state)}</span>`;
const completionChip = (percent) => `<span class="completion-badge" aria-label="${percent}% complete">${percent}%</span>`;
const commitChips = (ticket) => ticket.commits.length ? ticket.commits.map((hash) => `<code class="commit" title="Implementation commit">${escapeHTML(hash)}</code>`).join(' ') : '<span class="muted">No commits recorded</span>';

function labelClass(label) {
  const role = snapshot.triageRoles && Object.hasOwn(snapshot.triageRoles, label.toLowerCase()) ? snapshot.triageRoles[label.toLowerCase()] : null;
  if (role) return `label-${role}`;
  let hash = 0;
  for (const character of label) hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  return `label-tone-${hash % 6}`;
}
const labelChip = (label) => `<span class="label-chip ${labelClass(label)}">${escapeHTML(label)}</span>`;
const matchesFilters = (ticket) => (!selectedState || ticket.displayState === selectedState) && (!selectedLabels.size || ticket.labels.some((label) => selectedLabels.has(label)));

function renderFilters() {
  const labels = [...new Set(snapshot.tickets.flatMap((ticket) => ticket.labels))].sort((a, b) => a.localeCompare(b));
  el('label-options').innerHTML = labels.length ? labels.map((label) => `<label class="label-option"><input type="checkbox" data-label="${escapeHTML(label)}" ${selectedLabels.has(label) ? 'checked' : ''}>${labelChip(label)}<span class="label-count">${snapshot.tickets.filter((ticket) => ticket.labels.includes(label)).length}</span></label>`).join('') : '<p class="muted">No labels available.</p>';
  el('state-options').innerHTML = filterStates.map((state) => `<button type="button" class="status-option" data-state="${escapeHTML(state)}" aria-pressed="${state === selectedState}">${state ? stateChip(state) : 'All states'}<span class="option-check" aria-hidden="true">${state === selectedState ? '✓' : ''}</span></button>`).join('');
}

function updateFilterControls() {
  el('state-filter').value = selectedState;
  el('label-summary').textContent = selectedLabels.size ? `${selectedLabels.size} selected` : 'All labels';
  el('status-summary').textContent = selectedState || 'All states';
  for (const button of el('state-options').querySelectorAll('[data-state]')) {
    button.setAttribute('aria-pressed', String(button.dataset.state === selectedState));
    button.querySelector('.option-check').textContent = button.dataset.state === selectedState ? '✓' : '';
  }
  el('clear-filters').disabled = !selectedState && !selectedLabels.size;
}

function dependencyList(ticket) {
  if (!ticket.dependencies?.length) return '<p class="muted dependency-empty">No ticket dependencies declared.</p>';
  return `<ul class="dependencies">${ticket.dependencies.map((dependency) => {
    const name = `${dependency.feature !== ticket.feature ? `${dependency.feature} · ` : ''}${String(dependency.number).padStart(2, '0')}${dependency.title ? ` · ${dependency.title}` : ''}`;
    const content = `<span class="dependency-name">${escapeHTML(name)}</span><span class="dependency-status">${stateChip(dependency.state)}<span>${dependency.problem ? escapeHTML(dependency.problem) : dependency.satisfied ? 'Resolved' : 'Blocks this ticket'}</span></span>`;
    return `<li>${dependency.id ? `<button class="dependency-link ${dependency.satisfied ? 'dependency-resolved' : 'dependency-pending'}" data-ticket="${escapeHTML(dependency.id)}">${content}</button>` : `<div class="dependency-link dependency-invalid">${content}</div>`}</li>`;
  }).join('')}</ul>`;
}

function navigateTicket(id) {
  const ticket = snapshot.tickets.find((item) => item.id === id);
  if (!ticket) return;
  recordCurrentScroll();
  const sameFeature = ticket.feature === selectedFeature;
  selectedFeature = ticket.feature; selectedTicket = ticket.id; mobileView = 'detail'; render();
  if (sameFeature) requestAnimationFrame(() => document.querySelector(`[data-ticket-row="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  el('detail').scrollTop = 0; writeRoute('push');
}

function markdown(content) {
  const html = DOMPurify.sanitize(marked.parse(content ?? '', { gfm: true, breaks: false }), {
    FORBID_TAGS: ['form', 'button', 'iframe', 'style', 'script', 'video', 'audio'],
    FORBID_ATTR: ['style', 'autofocus'],
  });
  const template = document.createElement('template');
  template.innerHTML = html;
  for (const input of template.content.querySelectorAll('input')) {
    if (input.type !== 'checkbox') { input.remove(); continue; }
    input.disabled = true;
  }
  for (const link of template.content.querySelectorAll('a')) {
    const href = link.getAttribute('href');
    let target = null;
    if (href && !/^[a-z][a-z\d+.-]*:/i.test(href) && !href.startsWith('//') && selectedTicket) {
      try {
        const current = snapshot.tickets.find((ticket) => ticket.id === selectedTicket);
        const base = `http://local.invalid/.scratch/${encodeURIComponent(current.feature)}/issues/${encodeURIComponent(current.filename)}`;
        const url = new URL(href.startsWith('.scratch/') ? `/${href}` : href, base);
        target = snapshot.tickets.find((ticket) => decodeURIComponent(url.pathname) === `/.scratch/${ticket.feature}/issues/${ticket.filename}`);
      } catch { /* Malformed local paths are inert. */ }
    }
    if (target) {
      link.setAttribute('href', '#ticket'); link.dataset.ticket = target.id;
    } else if (!href || (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href))) {
      link.removeAttribute('href');
      link.title = 'Local file link; the viewer does not open files outside the ticket list.';
    } else { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
  }
  // Only embedded images are permitted in v1; remote requests would leak local reading activity.
  for (const img of template.content.querySelectorAll('img')) {
    if (!/^data:image\//i.test(img.getAttribute('src') ?? '')) {
      const placeholder = document.createElement('span');
      placeholder.textContent = img.alt ? `[${img.alt}]` : '[Image not loaded]';
      placeholder.title = 'External or local-file image not loaded.';
      img.replaceWith(placeholder);
    }
  }
  return template.innerHTML;
}

function summary(ticket) {
  const inline = ticket.content.match(/^\*\*What to build:\*\*\s*(.+)$/im);
  if (inline) return inline[1].trim();
  const section = ticket.content.match(/^#{2,6}\s+(?:Qué construir|What to build)\s*\r?\n([\s\S]*?)(?=^#{1,6}\s|$(?![\s\S]))/im);
  if (section) return section[1].trim().split(/\r?\n\s*\r?\n/)[0].replace(/\s+/g, ' ');
  let inFence = false;
  for (const line of ticket.content.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) { inFence = !inFence; continue; }
    if (!inFence && line.trim() && !/^\s*(?:#|Status:|Execution:|Labels:|Blocked by:|Commits:|---|[-*]\s)/i.test(line)) return line.replace(/\*\*/g, '').trim();
  }
  return '';
}

function diagnostics(items) {
  if (!items.length) return '';
  const errors = items.filter((item) => item.severity === 'error').length;
  return `<details class="diagnostics" ${errors ? 'open' : ''}><summary>${errors ? `${errors} validation errors` : `${items.length} format notices`}</summary><ul>${items.map((item) => `<li class="${item.severity === 'error' ? 'error-text' : ''}">${escapeHTML(item.message)}</li>`).join('')}</ul></details>`;
}

function queueControls(ticket) {
  const record = Object.hasOwn(queueInfo.records, ticket.id) ? queueInfo.records[ticket.id] : null;
  const ready = ticket.displayState === 'Ready to implement' && ticket.triageRole === 'ready-for-agent';
  if (!ready && !record) return '';
  const disabled = !queueInfo.thread || !queueInfo.token || Boolean(record);
  const button = ready ? `<button type="button" class="refresh" data-queue="${escapeHTML(ticket.id)}" ${disabled ? 'disabled' : ''}>${escapeHTML(record?.status ?? 'Queue implementation')}</button>` : '';
  const message = record?.error ?? (record ? 'Delivery status only; ticket execution is shown separately. Check the linked session before any new send.' : queueInfo.thread ? 'Send this ticket to the linked Codex session after its current turn.' : 'No Codex session linked. Launch with --thread to enable sending.');
  return `<section class="queue-controls">${button}<p role="status" class="${record?.error ? 'error-text' : 'muted'}">${escapeHTML(message)}</p></section>`;
}

function ticketBody(content) {
  // Present the header metadata in the table, retaining prose and fenced examples.
  let inHeader = true; let fence = null;
  return content.split(/\r?\n/).filter((line) => {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      return true;
    }
    if (fence) return true;
    if (/^#{2,6}\s+/.test(line)) inHeader = false;
    return !inHeader || !/^(Status|Execution|Labels|Blocked by|Commits):\s*/i.test(line.replace(/\*\*/g, ''));
  }).join('\n');
}

function ticketInfo(ticket) {
  const progress = ticket.progress.total ? `<div class="acceptance-progress"><progress value="${ticket.progress.checked}" max="${ticket.progress.total}" aria-label="Acceptance criteria progress"></progress><span>${ticket.progress.checked} / ${ticket.progress.total}</span></div>` : '<span class="muted">No acceptance checklist recorded</span>';
  const rows = [
    ['Status', `<div class="ticket-meta">${stateChip(ticket.displayState)}</div>`],
    ['Triage', `<span class="raw-status">${escapeHTML(ticket.metadata.Status || 'Not recorded')}</span>`],
    ['Labels', `<div class="detail-labels">${ticket.labels.length ? ticket.labels.map(labelChip).join('') : '<span class="muted">None</span>'}</div>`],
    ['Acceptance criteria', progress],
    ['Commits', `<div class="commit-record">${commitChips(ticket)}</div>`],
    ['Dependencies', `<section class="dependency-record">${dependencyList(ticket)}</section>`],
  ];
  return `<table class="ticket-info" aria-label="Ticket information"><tbody>${rows.map(([title, values]) => `<tr><th scope="row">${title}</th><td>${values}</td></tr>`).join('')}</tbody></table>`;
}

async function loadQueue() {
  try {
    const response = await fetch('/api/queue');
    if (!response.ok) throw new Error('Could not read linked session.');
    queueInfo = await response.json();
    el('queue-session').replaceChildren();
    if (queueInfo.thread) {
      el('queue-session').append(document.createTextNode(`Codex: ${queueInfo.threadName || 'Unnamed session'} - `));
      const id = document.createElement('span'); id.className = 'session-id'; id.textContent = queueInfo.thread;
      el('queue-session').append(id);
    } else el('queue-session').textContent = 'Codex: not linked';
    el('queue-session').title = queueInfo.thread ? `Queue destination: ${queueInfo.threadName || 'Unnamed session'} - ${queueInfo.thread}` : 'No Codex session linked';
  } catch {
    queueInfo = { thread: null, token: '', records: {} };
    el('queue-session').textContent = 'Codex: unavailable';
  }
}

function render() {
  const scroll = scrollPositions();
  const openDiagnostics = el('detail').querySelector('.diagnostics')?.open;
  updateFilterControls();
  el('repo-name').textContent = snapshot.repoName ? `/${snapshot.repoName}` : 'Local tickets';
  el('repo-name').title = snapshot.repo ?? '';
  el('feature-count').textContent = snapshot.features.length;
  el('features').innerHTML = snapshot.features.length ? snapshot.features.map((feature) => {
    const featureTickets = snapshot.tickets.filter((ticket) => ticket.feature === feature.name);
    const completed = featureTickets.filter((ticket) => ticket.displayState === 'Completed').length;
    const percent = featureTickets.length ? Math.round(completed / featureTickets.length * 100) : 0;
    return `<button class="feature ${feature.name === selectedFeature ? 'selected' : ''}" data-feature="${escapeHTML(feature.name)}" ${feature.name === selectedFeature ? 'aria-current="true"' : ''}><span>${escapeHTML(feature.name)}</span><span class="feature-count">${percent}%</span></button>`;
  }).join('') : '<p class="empty sidebar-empty">No features yet.<br>Create local tickets with to-tickets.</p>';
  const featureTickets = snapshot.tickets.filter((ticket) => ticket.feature === selectedFeature);
  const tickets = featureTickets.filter(matchesFilters);
  el('list-title').textContent = selectedFeature ?? 'Tickets';
  el('ticket-count').textContent = selectedFeature ? '' : tickets.length;
  el('ticket-list').innerHTML = tickets.length ? `<table><thead><tr><th scope="col">Number</th><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead><tbody>${tickets.map((ticket) => `<tr data-ticket-row="${escapeHTML(ticket.id)}" class="${ticket.id === selectedTicket ? 'selected' : ''}"><td class="ticket-number">${String(ticket.number ?? '?').padStart(2, '0')}</td><td><button class="ticket-link" data-ticket="${escapeHTML(ticket.id)}">${escapeHTML(ticket.title || ticket.filename)}</button><div class="row-labels">${ticket.labels.map(labelChip).join('')}</div>${ticket.commits.length ? `<div class="row-commits">${commitChips(ticket)}</div>` : ''}</td><td>${stateChip(ticket.displayState)}${ticket.displayState === 'In progress' ? completionChip(ticket.progress.total ? Math.round(ticket.progress.checked / ticket.progress.total * 100) : 0) : ''}</td><td><span class="ticket-summary" title="${escapeHTML(summary(ticket))}">${escapeHTML(summary(ticket))}</span></td></tr>`).join('')}</tbody></table>` : `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">◇</span><h3>${featureTickets.length ? 'No tickets match these filters' : selectedFeature ? 'No tickets in this feature' : 'No local tickets yet'}</h3><p>${featureTickets.length ? 'Change the selected labels or status, or clear the filters.' : selectedFeature ? 'Tickets will appear here when they are created.' : 'Create a feature and its tickets with to-tickets, then select Refresh.'}</p></div>`;
  const ticket = snapshot.tickets.find((item) => item.id === selectedTicket);
  const feature = snapshot.features.find((item) => item.name === selectedFeature);
  if (ticket) {
    el('detail-kind').textContent = `Ticket ${String(ticket.number ?? '?').padStart(2, '0')}`;
    el('detail-path').textContent = `${ticket.feature}/issues/${ticket.filename}`;
    const filtered = !matchesFilters(ticket) ? '<div class="filtered-selection" role="status">This ticket is outside the current filters. Filters are still active.</div>' : '';
    el('detail').innerHTML = `${queueControls(ticket)}${filtered}${ticketInfo(ticket)}${diagnostics(ticket.diagnostics)}<article class="markdown">${markdown(ticketBody(ticket.content))}</article>`;
  } else if (feature) {
    el('detail-kind').textContent = 'Feature overview';
    el('detail-path').textContent = feature.descriptionFile ? `${feature.name}/${feature.descriptionFile}` : feature.name;
    const counts = new Map();
    for (const item of featureTickets) counts.set(item.displayState, (counts.get(item.displayState) ?? 0) + 1);
    el('detail').innerHTML = `<div class="feature-overview"><h2>${escapeHTML(feature.name)}</h2><dl class="state-summary">${[...counts].map(([state, count]) => `<div><dt>${stateChip(state)}</dt><dd>${count}</dd></div>`).join('')}</dl></div>${diagnostics(snapshot.diagnostics)}${feature.description !== null ? `<article class="markdown feature-description">${markdown(feature.description)}</article>` : '<div class="no-description"><h3>No description available</h3><p>This feature has no spec.md or map.md. Its ticket summary is shown above.</p></div>'}`;
  } else {
    el('detail-kind').textContent = 'Overview'; el('detail-path').textContent = '';
    el('detail').innerHTML = `${diagnostics(snapshot.diagnostics)}<div class="empty-state"><h3>Your local ticket desk</h3><p>Select a feature to see its summary, then select a ticket to read the full Markdown.</p><p class="muted">Files stay untouched. The viewer only reads.</p></div>`;
  }
  if (openDiagnostics !== undefined && el('detail').querySelector('.diagnostics')) el('detail').querySelector('.diagnostics').open = openDiagnostics;
  restoreScroll(scroll); applyMobileView();
}

function applySnapshot(data) {
  if (data.instance === snapshot.instance && data.revision < snapshot.revision) return;
  const focused = document.activeElement;
  const focusKey = focused?.dataset.label !== undefined ? ['data-label', focused.dataset.label] : focused?.dataset.ticket ? ['data-ticket', focused.dataset.ticket] : focused?.dataset.feature ? ['data-feature', focused.dataset.feature] : null;
  const first = !workspaceKey;
  snapshot = data;
  const saved = first ? initializeWorkspace() : null;
  normalizeSelection();
  el('error').hidden = true; renderFilters(); render();
  if (first && saved?.scroll && saved.ticket === selectedTicket && saved.feature === selectedFeature) restoreScroll(saved.scroll);
  if (focusKey) document.querySelector(`[${focusKey[0]}="${CSS.escape(focusKey[1])}"]`)?.focus({ preventScroll: true });
  writeRoute();
}

function normalizeSelection() {
  const ticket = snapshot.tickets.find((item) => item.id === selectedTicket);
  if (ticket && !selectedFeature) selectedFeature = ticket.feature;
  if (!snapshot.features.some((item) => item.name === selectedFeature)) selectedFeature = snapshot.features[0]?.name ?? null;
  if (!ticket || ticket.feature !== selectedFeature) {
    if (selectedTicket) mobileView = 'detail';
    selectedTicket = null;
  }
  if (!filterStates.includes(selectedState)) selectedState = '';
}

function connectLive() {
  eventSource = new EventSource('/api/events');
  eventSource.onopen = () => { el('live-status').textContent = 'Live'; el('live-status').dataset.connection = 'live'; loadQueue().then(() => { if (workspaceKey) render(); }); };
  eventSource.onerror = () => { el('live-status').textContent = 'Reconnecting…'; el('live-status').dataset.connection = 'offline'; };
  eventSource.addEventListener('snapshot', (event) => {
    try { applySnapshot(JSON.parse(event.data)); } catch (error) { el('error').textContent = `Could not display updates. ${error.message}`; el('error').hidden = false; }
  });
  eventSource.addEventListener('read-error', (event) => {
    el('error').textContent = `Could not read updates. ${JSON.parse(event.data).error}`; el('error').hidden = false;
  });
}

async function refresh() {
  if (loading) return;
  loading = true; el('refresh').disabled = true; el('refresh').textContent = 'Refreshing…';
  try {
    const [response] = await Promise.all([fetch('/api/snapshot'), loadQueue()]);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Could not read local tickets.');
    applySnapshot(data);
  } catch (error) { el('error').textContent = `Could not refresh tickets. ${error.message}`; el('error').hidden = false; }
  finally { loading = false; el('refresh').disabled = false; el('refresh').textContent = 'Refresh'; }
}

el('features').addEventListener('click', (event) => {
  const button = event.target.closest('[data-feature]');
  if (!button) return;
  recordCurrentScroll(); selectedFeature = button.dataset.feature; selectedTicket = null; mobileView = 'detail'; render(); el('detail').scrollTop = 0; writeRoute('push');
});
el('ticket-list').addEventListener('click', (event) => {
  const button = event.target.closest('[data-ticket]');
  const row = event.target.closest('tr');
  const ticketButton = button ?? row?.querySelector('[data-ticket]');
  if (!ticketButton) return;
  navigateTicket(ticketButton.dataset.ticket);
});
el('detail').addEventListener('click', (event) => {
  const link = event.target.closest('[data-ticket]');
  if (!link) return;
  event.preventDefault(); navigateTicket(link.dataset.ticket);
});
el('detail').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-queue]');
  if (!button || button.disabled) return;
  const ticket = button.dataset.queue;
  queueInfo.records[ticket] = { status: 'Sending' }; render();
  try {
    const response = await fetch('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Queue-Token': queueInfo.token }, body: JSON.stringify({ ticket }) });
    const result = await response.json();
    queueInfo.records[ticket] = result.record ?? { status: 'Error', error: result.error ?? 'Delivery failed. Check the linked session.' };
  } catch (error) {
    queueInfo.records[ticket] = { status: 'Error', error: `Delivery could not be confirmed. ${error.message} Check the linked session; no automatic retry was sent.` };
  }
  render();
});
el('state-options').addEventListener('click', (event) => {
  const button = event.target.closest('[data-state]');
  if (!button) return;
  recordCurrentScroll(); selectedState = button.dataset.state; el('status-filter').open = false;
  render(); writeRoute('push'); el('status-summary').focus();
});
const dropdowns = [...document.querySelectorAll('.filter-dropdown')];
for (const dropdown of dropdowns) dropdown.addEventListener('toggle', () => {
  const options = dropdown.querySelector('.filter-options');
  window.gsap?.killTweensOf(options);
  if (dropdown.open && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.gsap?.fromTo(options, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.14, ease: 'power2.out', clearProps: 'opacity,transform' });
  } else window.gsap?.set(options, { clearProps: 'opacity,transform' });
});
document.addEventListener('click', (event) => {
  for (const dropdown of dropdowns) if (!dropdown.contains(event.target)) dropdown.open = false;
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const dropdown of dropdowns) if (dropdown.open) { dropdown.open = false; dropdown.querySelector('summary').focus(); }
});
el('label-options').addEventListener('change', (event) => {
  const label = event.target.dataset.label;
  if (label === undefined) return;
  recordCurrentScroll(); if (event.target.checked) selectedLabels.add(label); else selectedLabels.delete(label);
  render(); writeRoute('push');
});
el('clear-filters').addEventListener('click', () => {
  recordCurrentScroll(); selectedLabels.clear(); selectedState = ''; renderFilters(); render(); writeRoute('push');
});
el('refresh').addEventListener('click', refresh);
el('toggle-sidebar').addEventListener('click', () => { sidebarCollapsed = !sidebarCollapsed; applyLayout(); persistWorkspace(); });
for (const pane of [el('detail'), el('ticket-list'), el('features')]) pane.addEventListener('scroll', () => {
  clearTimeout(storageTimer); storageTimer = setTimeout(() => { persistWorkspace(); recordCurrentScroll(); }, 150);
}, { passive: true });
window.addEventListener('popstate', (event) => { readRoute(); normalizeSelection(); renderFilters(); render(); restoreScroll(event.state?.scroll); persistWorkspace(); });
document.querySelector('.mobile-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-mobile-view]');
  if (!button) return;
  recordCurrentScroll(); mobileView = button.dataset.mobileView; applyMobileView(); writeRoute('push');
});
for (const [id, kind] of [['sidebar-splitter', 'sidebar'], ['detail-splitter', 'split']]) {
  const splitter = el(id);
  splitter.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    splitter.setPointerCapture(event.pointerId); splitter.dataset.dragging = 'true';
    workspace.classList.add('resizing'); event.preventDefault();
  });
  splitter.addEventListener('pointermove', (event) => {
    if (!splitter.hasPointerCapture(event.pointerId)) return;
    const offset = event.clientX - workspace.getBoundingClientRect().left;
    if (kind === 'sidebar') layout.sidebar = clamp(offset, 160, Number(splitter.getAttribute('aria-valuemax')));
    else {
      const sidebar = document.querySelector('.sidebar').getBoundingClientRect().width;
      const available = workspace.clientWidth - sidebar - (sidebarCollapsed ? 6 : 12);
      layout.split = clamp((offset - sidebar - (sidebarCollapsed ? 0 : 6)) / available * 100, Number(splitter.getAttribute('aria-valuemin')), Number(splitter.getAttribute('aria-valuemax')));
    }
    applyLayout();
  });
  const finish = () => { delete splitter.dataset.dragging; workspace.classList.remove('resizing'); persistWorkspace(); };
  splitter.addEventListener('lostpointercapture', finish);
  splitter.addEventListener('keydown', (event) => {
    const min = Number(splitter.getAttribute('aria-valuemin')); const max = Number(splitter.getAttribute('aria-valuemax'));
    const step = kind === 'sidebar' ? 16 : 3;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const current = Number(splitter.getAttribute('aria-valuenow'));
    layout[kind] = event.key === 'Home' ? min : event.key === 'End' ? max : clamp(current + (event.key === 'ArrowLeft' ? -step : step), min, max);
    applyLayout(); persistWorkspace();
  });
}
window.addEventListener('resize', applyLayout);
window.addEventListener('pagehide', () => { persistWorkspace(); eventSource?.close(); });
window.addEventListener('pageshow', () => { if (eventSource?.readyState === EventSource.CLOSED) connectLive(); });
loadSkillVersion();
refresh().finally(connectLive);
