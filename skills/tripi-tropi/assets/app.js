/* All file content is data. Only sanitized Markdown is inserted as HTML. */
const el = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
let snapshot = { features: [], tickets: [], diagnostics: [] };
let selectedFeature = null;
let selectedTicket = null;
let loading = false;
let selectedState = '';
const selectedLabels = new Set();
const stateClass = (state) => ({ Completed: 'completed', 'Ready to implement': 'ready', 'In progress': 'in-progress', Blocked: 'blocked', Discarded: 'discarded', Pending: 'pending' }[state] ?? 'unknown');
const stateChip = (state) => `<span class="state ${stateClass(state)}">${escapeHTML(state)}</span>`;
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
}

function updateFilterControls() {
  el('state-filter').value = selectedState;
  el('label-summary').textContent = selectedLabels.size ? `Labels · ${selectedLabels.size} selected` : 'Labels · All';
  el('clear-filters').disabled = !selectedState && !selectedLabels.size;
}

function dependencyList(ticket) {
  if (!ticket.dependencies?.length) return '<p class="muted dependency-empty">No ticket dependencies declared.</p>';
  return `<ul class="dependencies">${ticket.dependencies.map((dependency) => {
    const name = `${String(dependency.number).padStart(2, '0')}${dependency.title ? ` · ${dependency.title}` : ''}`;
    const content = `<span class="dependency-name">${escapeHTML(name)}</span><span class="dependency-status">${stateChip(dependency.state)}<span>${dependency.problem ? escapeHTML(dependency.problem) : dependency.satisfied ? 'Resolved' : 'Blocks this ticket'}</span></span>`;
    return `<li>${dependency.id ? `<button class="dependency-link ${dependency.satisfied ? 'dependency-resolved' : 'dependency-pending'}" data-ticket="${escapeHTML(dependency.id)}">${content}</button>` : `<div class="dependency-link dependency-invalid">${content}</div>`}</li>`;
  }).join('')}</ul>`;
}

function navigateTicket(id) {
  const ticket = snapshot.tickets.find((item) => item.id === id);
  if (!ticket) return;
  selectedFeature = ticket.feature; selectedTicket = ticket.id; render();
  document.querySelector('.detail-content').scrollTop = 0;
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

function render() {
  updateFilterControls();
  el('repo-name').textContent = snapshot.repoName ?? 'Local tickets';
  el('repo-name').title = snapshot.repo ?? '';
  el('feature-count').textContent = snapshot.features.length;
  el('features').innerHTML = snapshot.features.length ? snapshot.features.map((feature) => {
    const count = snapshot.tickets.filter((ticket) => ticket.feature === feature.name).length;
    return `<button class="feature ${feature.name === selectedFeature ? 'selected' : ''}" data-feature="${escapeHTML(feature.name)}" ${feature.name === selectedFeature ? 'aria-current="true"' : ''}><span>${escapeHTML(feature.name)}</span><span class="feature-count">${count}</span></button>`;
  }).join('') : '<p class="empty sidebar-empty">No features yet.<br>Create local tickets with to-tickets.</p>';
  const featureTickets = snapshot.tickets.filter((ticket) => ticket.feature === selectedFeature);
  const tickets = featureTickets.filter(matchesFilters);
  el('list-title').textContent = selectedFeature ?? 'Tickets';
  el('list-subtitle').textContent = selectedFeature ? `${tickets.length} of ${featureTickets.length} ${featureTickets.length === 1 ? 'ticket' : 'tickets'}` : 'Choose a feature to browse its work.';
  el('ticket-count').textContent = tickets.length;
  el('ticket-list').innerHTML = tickets.length ? `<table><thead><tr><th scope="col">Number</th><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead><tbody>${tickets.map((ticket) => `<tr class="${ticket.id === selectedTicket ? 'selected' : ''}"><td class="ticket-number">${String(ticket.number ?? '?').padStart(2, '0')}</td><td><button class="ticket-link" data-ticket="${escapeHTML(ticket.id)}">${escapeHTML(ticket.title || ticket.filename)}</button><div class="row-labels">${ticket.labels.map(labelChip).join('')}</div>${ticket.commits.length ? `<div class="row-commits">${commitChips(ticket)}</div>` : ''}</td><td>${stateChip(ticket.displayState)}</td><td><span class="ticket-summary" title="${escapeHTML(summary(ticket))}">${escapeHTML(summary(ticket))}</span></td></tr>`).join('')}</tbody></table>` : `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">◇</span><h3>${featureTickets.length ? 'No tickets match these filters' : selectedFeature ? 'No tickets in this feature' : 'No local tickets yet'}</h3><p>${featureTickets.length ? 'Change the selected labels or status, or clear the filters.' : selectedFeature ? 'Tickets will appear here when they are created.' : 'Create a feature and its tickets with to-tickets, then select Refresh.'}</p></div>`;
  const ticket = snapshot.tickets.find((item) => item.id === selectedTicket);
  const feature = snapshot.features.find((item) => item.name === selectedFeature);
  if (ticket) {
    el('detail-kind').textContent = `Ticket ${String(ticket.number ?? '?').padStart(2, '0')}`;
    el('detail-path').textContent = `${ticket.feature}/issues/${ticket.filename}`;
    const filtered = !matchesFilters(ticket) ? '<div class="filtered-selection" role="status">This ticket is outside the current filters. Filters are still active.</div>' : '';
    const progress = ticket.progress.total ? `<div class="acceptance-progress"><span>Acceptance criteria</span><progress value="${ticket.progress.checked}" max="${ticket.progress.total}" aria-label="Acceptance criteria progress"></progress><span>${ticket.progress.checked} / ${ticket.progress.total}</span></div>` : '<p class="muted acceptance-empty">No acceptance checklist recorded.</p>';
    el('detail').innerHTML = `${filtered}<div class="ticket-meta">${stateChip(ticket.displayState)}<span class="raw-status">${escapeHTML(ticket.metadata.Status || 'No triage status')}</span></div><div class="detail-labels">${ticket.labels.map(labelChip).join('')}</div>${progress}<div class="commit-record"><span>Implementation commits</span><div>${commitChips(ticket)}</div></div><section class="dependency-record"><h3>Dependencies</h3>${dependencyList(ticket)}</section>${diagnostics(ticket.diagnostics)}<article class="markdown">${markdown(ticket.content)}</article>`;
  } else if (feature) {
    el('detail-kind').textContent = 'Feature overview';
    el('detail-path').textContent = feature.descriptionFile ? `${feature.name}/${feature.descriptionFile}` : feature.name;
    const counts = new Map();
    for (const item of featureTickets) counts.set(item.displayState, (counts.get(item.displayState) ?? 0) + 1);
    el('detail').innerHTML = `<div class="feature-overview"><h2>${escapeHTML(feature.name)}</h2><p class="muted">${featureTickets.length} tickets in this feature · All states, independent of filters</p><dl class="state-summary">${[...counts].map(([state, count]) => `<div><dt>${stateChip(state)}</dt><dd>${count}</dd></div>`).join('')}</dl></div>${diagnostics(snapshot.diagnostics)}${feature.description !== null ? `<article class="markdown feature-description">${markdown(feature.description)}</article>` : '<div class="no-description"><h3>No description available</h3><p>This feature has no spec.md or map.md. Its ticket summary is shown above.</p></div>'}`;
  } else {
    el('detail-kind').textContent = 'Overview'; el('detail-path').textContent = '';
    el('detail').innerHTML = `${diagnostics(snapshot.diagnostics)}<div class="empty-state"><h3>Your local ticket desk</h3><p>Select a feature to see its summary, then select a ticket to read the full Markdown.</p><p class="muted">Files stay untouched. The viewer only reads.</p></div>`;
  }
}

async function refresh() {
  if (loading) return;
  loading = true; el('refresh').disabled = true; el('refresh').textContent = 'Refreshing…';
  try {
    const response = await fetch('/api/snapshot');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Could not read local tickets.');
    snapshot = data;
    if (!snapshot.features.some((item) => item.name === selectedFeature)) selectedFeature = snapshot.features[0]?.name ?? null;
    if (!snapshot.tickets.some((item) => item.id === selectedTicket && item.feature === selectedFeature)) selectedTicket = null;
    el('error').hidden = true; renderFilters(); render();
  } catch (error) { el('error').textContent = `Could not refresh tickets. ${error.message}`; el('error').hidden = false; }
  finally { loading = false; el('refresh').disabled = false; el('refresh').textContent = 'Refresh'; }
}

el('features').addEventListener('click', (event) => {
  const button = event.target.closest('[data-feature]');
  if (!button) return;
  selectedFeature = button.dataset.feature; selectedTicket = null; render();
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
el('state-filter').addEventListener('change', (event) => { selectedState = event.target.value; render(); });
el('label-options').addEventListener('change', (event) => {
  const label = event.target.dataset.label;
  if (label === undefined) return;
  if (event.target.checked) selectedLabels.add(label); else selectedLabels.delete(label);
  render();
});
el('clear-filters').addEventListener('click', () => {
  selectedLabels.clear(); selectedState = ''; renderFilters(); render();
});
el('refresh').addEventListener('click', refresh);
refresh();
