/* All file content is data. Only sanitized Markdown is inserted as HTML. */
const el = (id) => document.getElementById(id);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
let snapshot = { features: [], tickets: [], diagnostics: [] };
let selectedFeature = null;
let selectedTicket = null;
let loading = false;
const stateClass = (state) => ({ Completed: 'completed', 'In progress': 'in-progress', Blocked: 'blocked', Discarded: 'discarded', Pending: 'pending' }[state] ?? 'unknown');
const stateChip = (state) => `<span class="state ${stateClass(state)}">${escapeHTML(state)}</span>`;
const commitChips = (ticket) => ticket.commits.length ? ticket.commits.map((hash) => `<code class="commit" title="Implementation commit">${escapeHTML(hash)}</code>`).join(' ') : '<span class="muted">No commits recorded</span>';

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
    if (!href || (!/^https?:\/\//i.test(href) && !/^mailto:/i.test(href))) {
      // Ticket-relative navigation is delivered with the dependency-navigation ticket.
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
  el('repo-name').textContent = snapshot.repoName ?? 'Local tickets';
  el('repo-name').title = snapshot.repo ?? '';
  el('feature-count').textContent = snapshot.features.length;
  el('features').innerHTML = snapshot.features.length ? snapshot.features.map((feature) => {
    const count = snapshot.tickets.filter((ticket) => ticket.feature === feature.name).length;
    return `<button class="feature ${feature.name === selectedFeature ? 'selected' : ''}" data-feature="${escapeHTML(feature.name)}" ${feature.name === selectedFeature ? 'aria-current="true"' : ''}><span>${escapeHTML(feature.name)}</span><span class="feature-count">${count}</span></button>`;
  }).join('') : '<p class="empty sidebar-empty">No features yet.<br>Create local tickets with to-tickets.</p>';
  const tickets = snapshot.tickets.filter((ticket) => ticket.feature === selectedFeature);
  el('list-title').textContent = selectedFeature ?? 'Tickets';
  el('list-subtitle').textContent = selectedFeature ? `${tickets.length} local ${tickets.length === 1 ? 'ticket' : 'tickets'}` : 'Choose a feature to browse its work.';
  el('ticket-count').textContent = tickets.length;
  el('ticket-list').innerHTML = tickets.length ? `<table><thead><tr><th scope="col">Number</th><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Detail</th></tr></thead><tbody>${tickets.map((ticket) => `<tr class="${ticket.id === selectedTicket ? 'selected' : ''}"><td class="ticket-number">${String(ticket.number ?? '?').padStart(2, '0')}</td><td><button class="ticket-link" data-ticket="${escapeHTML(ticket.id)}">${escapeHTML(ticket.title || ticket.filename)}</button>${ticket.commits.length ? `<div class="row-commits">${commitChips(ticket)}</div>` : ''}</td><td>${stateChip(ticket.displayState)}</td><td><span class="ticket-summary" title="${escapeHTML(summary(ticket))}">${escapeHTML(summary(ticket))}</span></td></tr>`).join('')}</tbody></table>` : `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">◇</span><h3>${selectedFeature ? 'No tickets in this feature' : 'No local tickets yet'}</h3><p>${selectedFeature ? 'Tickets will appear here when they are created.' : 'Create a feature and its tickets with to-tickets, then select Refresh.'}</p></div>`;
  const ticket = snapshot.tickets.find((item) => item.id === selectedTicket);
  const feature = snapshot.features.find((item) => item.name === selectedFeature);
  if (ticket) {
    el('detail-kind').textContent = `Ticket ${String(ticket.number ?? '?').padStart(2, '0')}`;
    el('detail-path').textContent = `${ticket.feature}/issues/${ticket.filename}`;
    el('detail').innerHTML = `<div class="ticket-meta">${stateChip(ticket.displayState)}<span class="raw-status">${escapeHTML(ticket.status || 'No triage status')}</span></div><div class="commit-record"><span>Implementation commits</span><div>${commitChips(ticket)}</div></div>${diagnostics(ticket.diagnostics)}<article class="markdown">${markdown(ticket.content)}</article>`;
  } else if (feature) {
    el('detail-kind').textContent = 'Feature overview';
    el('detail-path').textContent = feature.descriptionFile ? `${feature.name}/${feature.descriptionFile}` : feature.name;
    const counts = new Map();
    for (const item of tickets) counts.set(item.displayState, (counts.get(item.displayState) ?? 0) + 1);
    el('detail').innerHTML = `<div class="feature-overview"><h2>${escapeHTML(feature.name)}</h2><p class="muted">${tickets.length} tickets in this feature</p><dl class="state-summary">${[...counts].map(([state, count]) => `<div><dt>${stateChip(state)}</dt><dd>${count}</dd></div>`).join('')}</dl></div>${diagnostics(snapshot.diagnostics)}${feature.description !== null ? `<article class="markdown feature-description">${markdown(feature.description)}</article>` : '<div class="no-description"><h3>No description available</h3><p>This feature has no spec.md or map.md. Its ticket summary is shown above.</p></div>'}`;
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
    el('error').hidden = true; render();
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
  selectedTicket = ticketButton.dataset.ticket; render();
});
el('refresh').addEventListener('click', refresh);
refresh();
