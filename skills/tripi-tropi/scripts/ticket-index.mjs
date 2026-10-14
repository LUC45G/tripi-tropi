import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { encode } from '@toon-format/toon';
import { loadTickets, validateFeature } from './tickets.mjs';
import { deriveTicketStates, DISPLAY_STATES } from './ticket-states.mjs';

/** Read-only discovery projection, not a cached snapshot or execution approval. */
export async function ticketIndex(repo, { feature, label, state } = {}) {
  if (state && !DISPLAY_STATES.includes(state)) throw new Error(`Unknown state: ${state}. Use: ${DISPLAY_STATES.join(', ')}.`);
  validateFeature(feature);
  const loaded = await loadTickets(repo, { strict: true });
  const diagnostics = [...loaded.diagnostics, ...loaded.tickets.flatMap((ticket) =>
    ticket.diagnostics.map((item) => ({ ticket: ticket.id, ...item })))];
  const rows = deriveTicketStates(loaded.tickets)
    .filter((ticket) => (!feature || ticket.feature === feature) && (!label || ticket.labels.includes(label)) && (!state || ticket.displayState === state))
    .map((ticket) => ({
      id: ticket.id, title: ticket.title, status: ticket.status, execution: ticket.execution,
      state: ticket.displayState, labels: JSON.stringify(ticket.labels),
      blockers: JSON.stringify(ticket.blockers), commits: JSON.stringify(ticket.commits),
      checked: ticket.progress.checked, total: ticket.progress.total,
    }));
  return { tickets: rows, diagnostics };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: {
      repo: { type: 'string', default: process.cwd() }, feature: { type: 'string' },
      label: { type: 'string' }, state: { type: 'string' }, json: { type: 'boolean' },
    } });
    const result = await ticketIndex(values.repo, values);
    console.log(values.json ? JSON.stringify(result) : encode(result));
    process.exitCode = result.diagnostics.some((item) => item.severity === 'error') ? 1 : 0;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
