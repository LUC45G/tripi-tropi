## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. Read `docs/agents/issue-tracker.md` when creating or fetching tickets.

### Ticket writing and implementation

Before creating, editing, or implementing a ticket, read `docs/agents/ticket-writing.md` and follow its mandatory format and atomicity review. Validate new and updated tickets before publishing or completing them.

Implement and verify one ticket at a time, after all its dependencies are completed. Make at least one commit per ticket, with its number in the message; keep different tickets out of the same commit. Record real abbreviated implementation commit hashes in `Commits:` using a subsequent ticket-record commit. Preserve unrelated changes and push only when requested.

### Triage labels

Use the default five triage roles. Read `docs/agents/triage-labels.md` when assigning triage status.

### Domain docs

Use a single-context layout: root `GLOSSARY.md` and `docs/adr/`. Read `docs/agents/domain.md` before exploring the codebase.
