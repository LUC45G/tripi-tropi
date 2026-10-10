---
name: tripi-tropi
description: Open a local read-only web viewer for to-tickets Markdown tickets under .scratch, grouped by feature, with formatted descriptions and implementation commit hashes. Use when the user wants to browse or follow local tickets without stopping their current agent work.
---

# tripi-tropi

Open the bundled application; do not recreate the viewer in the user's repository.

1. Resolve the user's repository (current workspace by default) and this skill's absolute directory. Read repository instructions; before authoring tickets, read [the mandatory ticket guide](references/ticket-writing.md). Opening the viewer does not adopt or edit repository conventions.
2. If dependencies are absent, run `npm ci --prefix <skill-directory>` using the bundled lockfile. Request the environment's normal permissions if package installation, local binding, background processes, or opening the browser requires them.
3. Run `node <skill-directory>/scripts/launch.mjs --repo <repo>`. This starts a detached local server, or reuses the existing instance, then opens its URL in the default browser. Use `--port <number>` for a chosen port and `--no-open` when no browser handoff is wanted.
4. Return the URL and continue the user's current task. Do not wait on the server process, poll indefinitely, or end unrelated work because the viewer is running. The viewer continues independently while the agent works.

Stop only when requested: `node <skill-directory>/scripts/launch.mjs --repo <repo> --stop`. Registry and logs live in the system temporary directory, outside the observed repo. A launcher error reports the exact log path.

The interface is dark and in English. Names and Markdown retain their original language. Files are strictly read-only: no status editing, checkbox toggling, migration, Git commands, or ticket writes are performed by the viewer. Markdown is rendered with sanitized HTML and local resources.

Current capability: feature list, ticket table, formatted ticket/feature detail, calculated states including readiness and dependency blockers, label/status filters, colored labels and dependency navigation, acceptance progress, commit hashes, empty/error states, and manual Refresh. Opening a blocker preserves filters even when its ticket is filtered out. Live updates and resizable panels, Codex queue integration, and easier installation are separate pending tickets; do not claim they are available yet.
