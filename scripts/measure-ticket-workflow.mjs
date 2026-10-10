import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { encode, decode } from '../skills/tripi-tropi/node_modules/@toon-format/toon/dist/index.mjs';
import { parseTicket, validateGraph } from '../skills/tripi-tropi/scripts/tickets.mjs';
import { deriveTicketStates } from '../skills/tripi-tropi/scripts/ticket-states.mjs';
import { ticketIndex } from '../skills/tripi-tropi/scripts/ticket-index.mjs';

// Content-size comparison, not model billing. Identical baseline tickets in both paths.
const { values } = parseArgs({ options: { baseline: { type: 'string' } } });
if (!values.baseline) throw new Error('Provide --baseline <commit>. Run from the repository root.');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true });
const normalize = (text) => text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const before = (file) => normalize(git('show', `${values.baseline}:${file}`));
const after = async (file) => normalize(await readFile(file, 'utf8'));
const bytes = (text) => Buffer.byteLength(text, 'utf8');
const documents = ['AGENTS.md', 'docs/agents/issue-tracker.md', 'docs/agents/ticket-writing.md',
  'docs/agents/triage-labels.md', 'skills/tripi-tropi/references/ticket-writing.md'];
const oldRules = documents.map(before).join('\n');
const newRules = (await Promise.all(documents.map(after))).join('\n');
const format = await after('skills/tripi-tropi/references/ticket-format.md');
const files = git('ls-tree', '-r', '--name-only', values.baseline, '--', '.scratch/tripi-tropi/issues').trim().split('\n');
const originals = files.map((file) => parseTicket(before(file), { feature: 'tripi-tropi', filename: file.split('/').at(-1), strict: true }));
validateGraph(originals);
const rows = deriveTicketStates(originals).map((ticket) => ({
  id: ticket.id, title: ticket.title, status: ticket.status, execution: ticket.execution,
  state: ticket.displayState, labels: JSON.stringify(ticket.labels), blockers: JSON.stringify(ticket.blockers),
  commits: JSON.stringify(ticket.commits), checked: ticket.progress.checked, total: ticket.progress.total,
}));
const metadata = { tickets: rows, diagnostics: [] };
const json = JSON.stringify(metadata);
const toon = encode(metadata);
if (JSON.stringify(decode(toon)) !== json) throw new Error('TOON roundtrip differs.');
const selected = originals.filter((ticket) => [12, 1, 6].includes(ticket.number)).map((ticket) => normalize(ticket.content)).join('\n');
const current = await ticketIndex(process.cwd(), { feature: 'tripi-tropi' });
if (current.diagnostics.length) throw new Error('Current tickets have diagnostics.');
for (const row of rows.filter((item) => !item.id.includes('/12-'))) {
  const actual = current.tickets.find((item) => item.id === row.id);
  if (JSON.stringify(actual) !== JSON.stringify(row)) throw new Error(`Existing ticket semantics changed: ${row.id}`);
}
const comparison = (oldText, newText) => ({ beforeBytes: bytes(oldText), afterBytes: bytes(newText),
  reductionPercent: Number(((1 - bytes(newText) / bytes(oldText)) * 100).toFixed(2)) });
console.log(JSON.stringify({ baseline: git('rev-parse', values.baseline).trim(), unit: 'UTF-8 bytes, LF, no BOM; not billed tokens',
  creationReading: comparison(oldRules, `${newRules}\n${format}`),
  implementationReading: comparison(`${oldRules}\n${selected}`, `${newRules}\n${selected}`),
  canonicalGuide: comparison(before(documents.at(-1)), await after(documents.at(-1))),
  metadataSerialization: comparison(json, toon),
  checks: { toonRoundtrip: true, unchangedExistingTicketSemantics: rows.length - 1 },
}, null, 2));
