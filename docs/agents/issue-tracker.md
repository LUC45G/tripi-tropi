# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

Before creating or updating tickets, follow the mandatory [ticket writing guide](ticket-writing.md). New tickets separate triage (`Status:`), execution (`Execution:`), labels (`Labels:`), dependencies (`Blocked by:`), and abbreviated implementation commit hashes (`Commits:`). Existing tickets remain readable without migration.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- Specs: `.scratch/<feature-slug>/spec.md`
- Implementation issues: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`,
  one file per ticket, numbered from `01`.
- Triage state: a `Status:` line near the top of each issue file,
  using the role strings in `triage-labels.md`.
- Comments: append under a `## Comments` heading.

## Publishing and fetching tickets

When a skill says "publish to the issue tracker", create a file
under `.scratch/<feature-slug>/`, creating directories as needed.

When a skill says "fetch the relevant ticket", read the referenced
file. If given only a number, resolve it within the relevant feature.

## Wayfinding operations

Used by `/wayfinder`:

- Map: `.scratch/<effort>/map.md`, containing Notes,
  Decisions-so-far, and Fog.
- Child tickets: `.scratch/<effort>/issues/NN-<slug>.md`,
  numbered from `01`, with the question in the body.
- Type: a `Type:` line recording
  `research`, `prototype`, `grilling`, or `task`.
- Status: open tickets become `claimed`, then `resolved`.
  These workflow states are separate from the triage roles.
- Blocking: a `Blocked by: NN, NN` line near the top.
  A ticket is unblocked when every listed ticket is resolved.
- Frontier: find open, unblocked, unclaimed tickets;
  choose the lowest number first.
- Claim: save `Status: claimed` before beginning work.
- Resolve: append the answer under `## Answer`,
  save `Status: resolved`, then append a summary and link
  to the map's Decisions-so-far.
