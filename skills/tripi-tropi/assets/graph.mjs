/** Projects a feature's full snapshot; visual filters never remove graph context. */
export function projectGraph(tickets, feature) {
  const local = tickets.filter((ticket) => ticket.feature === feature)
    .sort((a, b) => a.number - b.number || a.id.localeCompare(b.id));
  const nodes = local.map((ticket) => ({
    ticket,
    primaryLabel: /^(?:none|ninguno|ninguna)(?:\b|$)/i.test(ticket.metadata.Labels ?? '') ? null : ticket.metadata.Labels?.split(',').map((label) => label.trim()).find(Boolean) ?? null,
    problems: ticket.diagnostics.filter((item) => item.severity === 'error').map((item) => item.message),
    external: ticket.dependencies.some((dependency) => dependency.feature !== feature),
  }));
  const byId = new Map(nodes.map((node) => [node.ticket.id, node]));
  const edges = [];
  const outgoing = new Map(nodes.map((node) => [node.ticket.id, []]));
  const remaining = new Map(nodes.map((node) => [node.ticket.id, 0]));
  for (const node of nodes) {
    for (const dependency of node.ticket.dependencies) {
      if (dependency.feature !== feature || !byId.has(dependency.id)) continue;
      edges.push({ from: dependency.id, to: node.ticket.id, satisfied: dependency.satisfied });
      outgoing.get(dependency.id).push(node.ticket.id);
      remaining.set(node.ticket.id, remaining.get(node.ticket.id) + 1);
    }
  }
  const levels = new Map(nodes.map((node) => [node.ticket.id, 0]));
  const frontier = nodes.filter((node) => remaining.get(node.ticket.id) === 0).map((node) => node.ticket.id);
  for (let index = 0; index < frontier.length; index++) {
    const id = frontier[index];
    for (const child of outgoing.get(id)) {
      levels.set(child, Math.max(levels.get(child), levels.get(id) + 1));
      remaining.set(child, remaining.get(child) - 1);
      if (remaining.get(child) === 0) frontier.push(child);
    }
  }
  // Cycles remain visible in a separate column instead of preventing rendering.
  const cycleLevel = Math.max(0, ...levels.values()) + 1;
  const columns = new Map();
  for (const node of nodes) {
    const level = remaining.get(node.ticket.id) ? cycleLevel : levels.get(node.ticket.id);
    if (!columns.has(level)) columns.set(level, []);
    columns.get(level).push(node);
  }
  const rows = Math.max(1, ...[...columns.values()].map((column) => column.length));
  const width = Math.max(1, columns.size) * 150;
  const height = rows * 110 + 34;
  [...columns.entries()].sort(([a], [b]) => a - b).forEach(([, column], x) => {
    column.forEach((node, y) => { node.x = 75 + x * 150; node.y = 72 + (y + (rows - column.length) / 2) * 110; });
  });
  return { nodes, edges, width, height };
}
