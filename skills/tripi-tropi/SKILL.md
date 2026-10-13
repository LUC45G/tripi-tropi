---
name: tripi-tropi
description: Open a local read-only web viewer for to-tickets Markdown tickets under .scratch, grouped by feature, with formatted descriptions and implementation commit hashes. Use when the user wants to browse or follow local tickets without stopping their current agent work.
---

# tripi-tropi

Open the bundled application; do not recreate the viewer in the user's repository.

1. Resolve the user's repository (current workspace by default) and this skill's absolute directory. Read repository instructions; when creating, editing or implementing tickets, follow [the mandatory ticket workflow](references/ticket-writing.md). For discovery it provides a read-only TOON index. Opening the viewer does not adopt or edit repository conventions.
2. If dependencies are absent, run `npm ci --prefix <skill-directory>` using the bundled lockfile. Request the environment's normal permissions if package installation, local binding, background processes, or opening the browser requires them.
3. Run `node <skill-directory>/scripts/launch.mjs --repo <repo>`. This starts a detached local server, or reuses the existing instance, then opens its URL in the default browser. Use `--port <number>` for a chosen port and `--no-open` when no browser handoff is wanted.
   To set an initial agent destination, pass `--thread <session UUID or exact name>`; otherwise the launcher inherits `CODEX_THREAD_ID`. The viewer can still be browsed without a linked session. Click the Codex destination in the header to select an existing session from Codex's local index or unlink it; this changes only the viewer's queue destination. Reusing an instance requires the same current destination.
4. Return the URL and continue the user's current task. Do not wait on the server process, poll indefinitely, or end unrelated work because the viewer is running. The viewer continues independently while the agent works.

Stop only when requested: use `Exit` in the viewer, or run `node <skill-directory>/scripts/launch.mjs --repo <repo> --stop`. `Exit` stops only this viewer process and leaves the browser tab open. Registry and logs live in the system temporary directory, outside the observed repo. A launcher error reports the exact log path.

The interface is dark and in English. Names and Markdown retain their original language. Files are strictly read-only: no status editing, checkbox toggling, migration, Git commands, or ticket writes are performed by the viewer. Markdown is rendered with sanitized HTML and local resources.

Current capability: feature list, ticket table, formatted ticket/feature detail, calculated states including readiness and dependency blockers, label/status filters, colored labels and dependency navigation, acceptance progress, commit hashes, and live updates with automatic reconnection. Opening a blocker preserves filters even when its ticket is filtered out. Two accessible dividers resize the desktop panels; the feature sidebar can collapse. Selection, filters, scroll and panel sizes persist per repository in the browser; URLs support ticket navigation and browser history. Narrow screens alternate between Tickets and Detail. Application keyboard shortcuts remain future work.

`Queue implementation` is available only for tickets ready for the agent. A click revalidates the ticket and dependencies on disk, then invokes `codex queue` for the explicitly linked existing session, without changing permissions or interrupting its active turn. Claude and OpenCode queueing are not enabled: their currently documented interfaces do not provide a reliable non-interactive next-turn queue for a busy session. See [agent queue compatibility](references/agent-queue-compatibility.md). The agent receives instructions to reread repository rules, enforce atomicity, verify readiness, and record real implementation commits. The viewer itself never edits ticket files. `Sending`, `Queued`, and delivery errors are separate from ticket execution. Attempt records persist outside the observed repository to prevent duplicate sends across refresh/restart. No automatic retries occur, including after uncertain delivery; check the linked session and resolve any retry manually. Codex CLI with `queue` support must be on PATH.
