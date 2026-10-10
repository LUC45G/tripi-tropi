import { readdir, readFile, realpath, lstat } from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_TRIAGE = ['needs-triage', 'needs-info', 'ready-for-agent', 'ready-for-human', 'wontfix'];
const EXECUTIONS = new Set(['pending', 'open', 'in-progress', 'claimed', 'blocked', 'completed', 'resolved', 'done', 'discarded']);
const FIELDS = ['Status', 'Execution', 'Labels', 'Blocked by', 'Commits'];
const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const absent = (value) => /^(?:none|ninguno|ninguna)(?:\b|$)/i.test(value.trim());
export const within = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

/** Reads metadata outside code fences, never interprets file content as code. */
export function parseTicket(content, { feature, filename, strict = false, triage = DEFAULT_TRIAGE } = {}) {
  const diagnostics = [];
  const report = (code, message, severity = 'error') => diagnostics.push({ code, message, severity });
  const metadata = {};
  const headings = [];
  let title = '';
  let fence = null;
  let inHeader = true;
  let dependencySection = false;
  const sectionDependencies = [];
  let total = 0;
  let checked = 0;
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/);
  for (const line of lines) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    if (!title && /^#\s+/.test(line)) title = line.replace(/^#\s+/, '').trim();
    const heading = line.match(/^#{2,6}\s+(.+?)\s*#*$/);
    if (heading) {
      inHeader = false;
      const name = normalize(heading[1]);
      headings.push(name);
      dependencySection = name === 'blocked by';
      continue;
    }
    const fieldLine = line.replace(/\*\*/g, '').match(/^(Status|Execution|Labels|Blocked by|Commits):\s*(.*?)\s*$/i);
    if (inHeader && fieldLine) {
      const key = FIELDS.find((name) => name.toLowerCase() === fieldLine[1].toLowerCase());
      if (Object.hasOwn(metadata, key)) report('duplicate-field', `Duplicate ${key} field.`);
      else metadata[key] = fieldLine[2];
    }
    if (dependencySection && line.trim()) sectionDependencies.push(line.replace(/^\s*[-*]\s*/, '').trim());
    const checkbox = line.match(/^\s*[-*]\s+\[([ xX])\]/);
    if (checkbox) { total++; if (checkbox[1].toLowerCase() === 'x') checked++; }
  }
  const fileNumber = filename?.match(/^(\d+)-.+\.md$/i)?.[1];
  const number = fileNumber ? Number(fileNumber) : null;
  if (!number || !Number.isSafeInteger(number)) report('invalid-number', 'Filename must start with a positive ticket number followed by a slug.');
  if (!title) report('missing-title', 'Ticket needs a first-level heading.');
  const headingNumber = title.match(/^(\d+)\s*:\s*/)?.[1];
  if (headingNumber && Number(headingNumber) !== number) report('number-mismatch', 'Heading number differs from filename.');
  title = title.replace(/^\d+\s*:\s*/, '');
  for (const field of FIELDS) {
    if (!Object.hasOwn(metadata, field)) report('missing-field', `Missing ${field}.`, strict ? 'error' : 'warning');
    else if (!metadata[field]) report('empty-field', `${field} cannot be empty; use none where applicable.`);
  }
  const status = metadata.Status?.toLowerCase() ?? '';
  const execution = metadata.Execution?.toLowerCase() ?? '';
  if (status && !triage.includes(status) && !(!strict && EXECUTIONS.has(status))) {
    report('unknown-status', `Unknown triage status: ${status}.`, strict ? 'error' : 'warning');
  }
  if (execution && !EXECUTIONS.has(execution)) report('invalid-execution', `Unknown execution state: ${execution}.`);
  const labels = metadata.Labels && !absent(metadata.Labels) ? metadata.Labels.split(',').map((label) => label.trim()).filter(Boolean) : [];
  if (metadata.Labels && !absent(metadata.Labels) && metadata.Labels.split(',').some((label) => !label.trim())) report('invalid-labels', 'Labels contains an empty entry.');
  if (triage.includes(status)) labels.push(status);
  const commits = metadata.Commits && !absent(metadata.Commits) ? metadata.Commits.split(',').map((hash) => hash.trim()) : [];
  for (const hash of commits) if (!/^[a-f\d]{7,12}$/i.test(hash)) report('invalid-commit', `Invalid abbreviated commit hash: ${hash}.`);
  const terminal = execution || status;
  if (strict && ['completed', 'resolved', 'done'].includes(terminal) && !commits.length) report('missing-implementation-commit', 'Completed tickets require an implementation commit.');
  let dependencyText = metadata['Blocked by'];
  if (dependencyText === undefined && sectionDependencies.length) dependencyText = sectionDependencies.join('; ');
  const blockers = [];
  if (dependencyText && !absent(dependencyText)) {
    // Commas inside a title are prose; only split before another numeric reference.
    for (const part of dependencyText.split(/;|,(?=\s*(?:#|ticket\s+)?\d+(?:$|[\s:—–-]))/i)) {
      const match = part.trim().match(/^(?:#|ticket\s+)?(\d+)(?=$|[\s:—–-])/i);
      if (match && Number(match[1]) > 0) blockers.push(Number(match[1]));
      else report('invalid-dependency', `Cannot resolve dependency: ${part.trim()}.`);
    }
  }
  const requiredSections = [
    ['estado inicial', 'initial state'], ['que construir', 'what to build'],
    ['atomicidad', 'atomicity'], ['criterios de aceptacion', 'acceptance criteria'],
    ['trabajo realizado', 'work performed'], ['estado posterior', 'final state'],
  ];
  for (const names of requiredSections) {
    if (!names.some((name) => headings.includes(name))) report('missing-section', `Missing section: ${names.join(' / ')}.`, strict ? 'error' : 'warning');
  }
  if (!total) report('missing-acceptance', 'No acceptance checkboxes found.', strict ? 'error' : 'warning');
  return { id: `${feature}/${filename}`, feature, filename, number, title, status, execution,
    labels: [...new Set(labels)], commits: [...new Set(commits)], blockers: [...new Set(blockers)],
    progress: { checked, total }, content, metadata, diagnostics };
}

export function validateGraph(tickets) {
  const groups = new Map();
  for (const ticket of tickets) {
    const key = `${ticket.feature}:${ticket.number}`;
    const group = groups.get(key) ?? [];
    group.push(ticket); groups.set(key, group);
  }
  const error = (ticket, code, message) => ticket.diagnostics.push({ severity: 'error', code, message });
  for (const group of groups.values()) if (group.length > 1) for (const ticket of group) error(ticket, 'duplicate-number', `Duplicate number ${ticket.number} in feature ${ticket.feature}.`);
  const adjacency = new Map();
  for (const ticket of tickets) {
    const edges = [];
    for (const number of ticket.blockers) {
      const candidates = groups.get(`${ticket.feature}:${number}`) ?? [];
      if (number === ticket.number) error(ticket, 'self-dependency', 'Ticket cannot depend on itself.');
      else if (!candidates.length) error(ticket, 'missing-dependency', `Dependency ${number} does not exist in this feature.`);
      else if (candidates.length > 1) error(ticket, 'ambiguous-dependency', `Dependency ${number} is ambiguous.`);
      else edges.push(candidates[0]);
    }
    adjacency.set(ticket, edges);
  }
  const visited = new Set();
  const active = new Set();
  const stack = [];
  const cyclic = new Set();
  function visit(ticket) {
    if (active.has(ticket)) { for (const item of stack.slice(stack.indexOf(ticket))) cyclic.add(item); return; }
    if (visited.has(ticket)) return;
    active.add(ticket); stack.push(ticket);
    for (const child of adjacency.get(ticket)) visit(child);
    stack.pop(); active.delete(ticket); visited.add(ticket);
  }
  for (const ticket of tickets) visit(ticket);
  for (const ticket of cyclic) error(ticket, 'dependency-cycle', 'Ticket belongs to a dependency cycle.');
  return tickets;
}

async function safeRead(root, filename) {
  const resolved = await realpath(filename);
  if (!within(root, resolved)) throw new Error('Path resolves outside .scratch.');
  return readFile(resolved, 'utf8');
}

export async function loadTickets(repo, { strict = false, feature } = {}) {
  if (feature && (feature === '.' || feature === '..' || /[/\\]/.test(feature))) throw new Error('Feature must be one directory name.');
  const scratch = path.join(path.resolve(repo), '.scratch');
  const diagnostics = [];
  const tickets = [];
  const features = [];
  const triage = [...DEFAULT_TRIAGE];
  try {
    const config = await readFile(path.join(repo, 'docs/agents/triage-labels.md'), 'utf8');
    for (const line of config.split(/\r?\n/)) {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.replace(/`/g, '').trim());
      if (DEFAULT_TRIAGE.includes(cells[0]) && cells[1]) triage.push(cells[1].toLowerCase());
    }
  } catch (error) { if (error.code !== 'ENOENT') diagnostics.push({ severity: 'warning', code: 'triage-config', message: error.message }); }
  let root;
  try {
    if ((await lstat(scratch)).isSymbolicLink()) throw new Error('.scratch cannot be a symbolic link.');
    root = await realpath(scratch);
  } catch (error) {
    if (error.code === 'ENOENT') return { tickets, features, diagnostics };
    throw error;
  }
  for (const directory of await readdir(root, { withFileTypes: true })) {
    if (!directory.isDirectory() || (feature && directory.name !== feature)) continue;
    const name = directory.name;
    const entry = { name, description: null, descriptionFile: null };
    features.push(entry);
    for (const description of ['spec.md', 'map.md']) {
      try { entry.description = await safeRead(root, path.join(root, name, description)); entry.descriptionFile = description; break; }
      catch (error) { if (error.code !== 'ENOENT') diagnostics.push({ severity: 'error', code: 'feature-read', message: `${name}/${description}: ${error.message}` }); }
    }
    const issues = path.join(root, name, 'issues');
    let files;
    try {
      if ((await lstat(issues)).isSymbolicLink()) throw new Error('Issues directory cannot be a symbolic link.');
      files = await readdir(issues, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT') diagnostics.push({ severity: 'error', code: 'issues-read', message: `${name}: ${error.message}` });
      continue;
    }
    for (const file of files) {
      if (!file.name.endsWith('.md') || (!file.isFile() && !file.isSymbolicLink())) continue;
      try { tickets.push(parseTicket(await safeRead(root, path.join(issues, file.name)), { feature: name, filename: file.name, strict, triage })); }
      catch (error) { diagnostics.push({ severity: 'error', code: 'ticket-read', message: `${name}/${file.name}: ${error.message}` }); }
    }
  }
  tickets.sort((a, b) => a.feature.localeCompare(b.feature) || a.number - b.number || a.filename.localeCompare(b.filename));
  features.sort((a, b) => a.name.localeCompare(b.name));
  validateGraph(tickets);
  return { tickets, features, diagnostics };
}
