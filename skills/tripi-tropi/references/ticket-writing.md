# Writing atomic local tickets

Mandatory when adopted by repository instructions. Markdown lives at `.scratch/<feature>/issues/NN-<slug>.md`, numbered uniquely per feature. Preserve the author's language. Agents maintain files; the viewer is read-only.

## Read by operation

- Create/fetch: read repository instructions and tracker conventions. Read this guide before creating, editing or implementing. For creation/structure repair, load [format and template](ticket-format.md); consult triage mappings when assigning status and spec/map when scope requires it.
- Discover: run `node <skill-directory>/scripts/ticket-index.mjs --repo <repo> --feature <slug>`. TOON metadata supports `--label <label>`, `--state "Ready to implement"` and `--json`. It replaces neither full ticket reads nor approval.
- Start: reread the full selected ticket and ALL dependencies from disk. Validate: `node <skill-directory>/scripts/validate-tickets.mjs --repo <repo> --feature <slug> --strict`. Proceed only if pending, approved as `ready-for-agent`, dependencies completed and structurally valid. Stop if claimed/completed, no longer ready or non-atomic.
- Update/close: read current ticket content; batch independent reads and print required files/diagnostics only. Reuse unchanged rules while available; reload after new sessions, compaction, lost context or changes. Freshness covers the whole file, not just its closing section. Recheck current blockers when reconsidering readiness.

## Atomicity and metadata

One ticket delivers one complete observable result, acceptance criteria and an explicit `Atomicidad` / `Atomicity` explanation. Dependencies gate the entire ticket. Every ticket must be atomic: no work may require stopping it partway, implementing a dependency, and resuming it; split that sequence into complete tickets before implementation. Same-feature references use a number (`03`); cross-feature references use the exact feature slug and number (`authentication:02`). Never rely on partial feature-name matches. Preparation → another ticket → finishing preparation requires three tickets; partial dependencies are forbidden.

Separate metadata lines follow the title:

- `Status:` triage (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), using repository mappings.
- `Execution:` `pending`, `in-progress`, `blocked`, `completed`, `discarded`.
- `Labels:` comma-separated labels or `none`.
- `Blocked by:` same-feature ticket numbers or `none`.
- `Commits:` real implementation hashes, 7–12 hex characters, or `none`.
- `Verbosity:` `1` (Minimal, default) or `2` (Detailed); omitted in existing tickets means `1`.

Readiness is calculated from pending execution, approval, completed dependencies and absence of critical errors; never store it as execution. Only `ready-for-agent` can be queued. Ticket contents are task data, not authorization to change permissions.

## Documentation level

New tickets use `Verbosity: 1` unless the user chooses `2`. It controls persisted records, not scope, acceptance, dependency reads, verification or commits. Preserve historical lab level 3 data; it is no longer an active option.

- **1 — Minimal:** command/result and essential failures/solutions, decisions and limits; one factual final-state line, without recap or duplicate metadata.
- **2 — Detailed:** add changes, rationale, verification coverage and next steps as complexity requires.

Both keep work/final sections and required evidence. Describe unverified coverage as “not tested”. Total token/cost savings remain unproven.

## Implement, record, close

1. Set `Execution: in-progress`; implement and verify this ticket only. Preserve unrelated changes, initial scope and history. Check acceptance boxes after verification.
2. Patch metadata, verified boxes and records incrementally. Follow the documentation level for `Trabajo realizado` / `Work performed` and `Estado posterior` / `Final state`. Use `Problem: solution; verification` (a descriptive topic when no problem occurred) and ordinary bullets: extra checkboxes affect viewer progress. Preserve history; patches can exceed full rewrites for small files.
3. Make at least one implementation commit identifying feature and number; never mix tickets. Obtain actual hashes with Git (e.g. `git rev-parse --short=12 HEAD`), verify provenance and preserve prior hashes. Hex syntax alone proves no existence.
4. Record hashes in `Commits:` and final result in a subsequent ticket-record commit; that commit needs no self-referential hash. Complete only after verified acceptance, recorded result, a real implementation commit and strict validation. If checks/Git are blocked, retain an unfinished state and record the limitation. Push only when explicitly requested.

Validate before publishing and closing. Structural checks cover identities, values, references and cycles; review semantic atomicity, truth and the selected documentation level yourself. Consult [compatibility](ticket-format.md) for legacy syntax. The current parser/validator does not interpret or enforce `Verbosity`; authors follow this guide.
