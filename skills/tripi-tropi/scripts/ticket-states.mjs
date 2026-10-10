export const DISPLAY_STATES = ['Pending', 'Ready to implement', 'In progress', 'Blocked', 'Completed', 'Discarded', 'Unknown'];

function executionState(ticket) {
  const value = ticket.execution || ticket.status;
  if (['completed', 'resolved', 'done'].includes(value)) return 'Completed';
  if (['discarded', 'wontfix'].includes(value) || (!ticket.execution && ticket.triageRole === 'wontfix')) return 'Discarded';
  if (['in-progress', 'claimed'].includes(value)) return 'In progress';
  if (value === 'blocked') return 'Blocked';
  if (ticket.execution) return ['pending', 'open'].includes(value) ? 'Pending' : 'Unknown';
  if (!value || ['pending', 'open'].includes(value) || ticket.triageRole) return 'Pending';
  return 'Unknown';
}

/** Derives presentation from a validated snapshot without changing ticket records. */
export function deriveTicketStates(tickets) {
  const groups = new Map();
  const bases = new Map();
  for (const ticket of tickets) {
    const key = `${ticket.feature}:${ticket.number}`;
    groups.set(key, [...(groups.get(key) ?? []), ticket]);
    bases.set(ticket.id, executionState(ticket));
  }
  const states = new Map();
  for (const ticket of tickets) {
    const base = bases.get(ticket.id);
    const dependencyErrors = ticket.diagnostics.some((item) => item.severity === 'error' && ['missing-dependency', 'ambiguous-dependency', 'self-dependency', 'dependency-cycle', 'invalid-dependency'].includes(item.code));
    const incomplete = ticket.blockers.some((number) => {
      const targets = groups.get(`${ticket.feature}:${number}`) ?? [];
      return targets.length !== 1 || bases.get(targets[0].id) !== 'Completed';
    });
    const errors = ticket.diagnostics.some((item) => item.severity === 'error');
    let state = base;
    if (!['Completed', 'Discarded'].includes(base)) {
      if (dependencyErrors || incomplete || base === 'Blocked') state = 'Blocked';
      else if (base === 'Pending' && !errors && ['ready-for-agent', 'ready-for-human'].includes(ticket.triageRole)) state = 'Ready to implement';
    }
    states.set(ticket.id, state);
  }
  return tickets.map((ticket) => ({
    ...ticket,
    displayState: states.get(ticket.id),
    dependencies: ticket.blockers.map((number) => {
      const targets = groups.get(`${ticket.feature}:${number}`) ?? [];
      const self = number === ticket.number;
      const target = !self && targets.length === 1 ? targets[0] : null;
      return {
        number, id: target?.id ?? null, title: target?.title ?? null,
        state: target ? states.get(target.id) : 'Invalid reference',
        satisfied: target ? bases.get(target.id) === 'Completed' : false,
        problem: self ? 'Self dependency' : targets.length === 0 ? 'Ticket not found' : targets.length > 1 ? 'Ambiguous ticket number' : null,
      };
    }),
  }));
}
