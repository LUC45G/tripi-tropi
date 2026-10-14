import { parseArgs } from 'node:util';
import { loadTickets, validateFeature } from './tickets.mjs';

try {
  const { values } = parseArgs({ options: {
    repo: { type: 'string', default: process.cwd() },
    feature: { type: 'string' }, strict: { type: 'boolean' }, json: { type: 'boolean' },
  } });
  validateFeature(values.feature);
  const result = await loadTickets(values.repo, { strict: values.strict });
  const count = result.tickets.filter((ticket) => !values.feature || ticket.feature === values.feature).length;
  const diagnostics = [...result.diagnostics, ...result.tickets.flatMap((ticket) => ticket.diagnostics.map((item) => ({ ...item, ticket: ticket.id })))];
  const errors = diagnostics.filter((item) => item.severity === 'error').length;
  const warnings = diagnostics.length - errors;
  if (values.json) console.log(JSON.stringify({ tickets: count, errors, warnings, diagnostics }, null, 2));
  else {
    for (const item of diagnostics) console.log(`${item.severity.toUpperCase()} ${item.ticket ?? ''} [${item.code}] ${item.message}`);
    console.log(`${count} tickets: ${errors} errors, ${warnings} warnings.`);
  }
  process.exitCode = errors ? 1 : 0;
} catch (error) { console.error(error.message); process.exitCode = 1; }
