# tripi-tropi

[![Skill version](https://img.shields.io/github/package-json/v/LUC45G/tripi-tropi?filename=skills%2Ftripi-tropi%2Fpackage.json)](https://github.com/LUC45G/tripi-tropi/blob/main/skills/tripi-tropi/package.json)

A local, read-only ticket viewer for `.scratch/<feature>/issues/*.md` created with the [`to-tickets`](https://www.skills.sh/mattpocock/skills/to-tickets) skill. Install or otherwise make `to-tickets` available in the repository if you want to create and maintain tickets; the viewer itself only reads existing Markdown files. It runs independently while your agent works. Node.js 24+ with npm and registry access are required; Codex CLI with `queue` support is optional for sending implementation requests. Only Codex queueing is currently enabled; ready tickets also offer a validated implementation message that you can copy and paste manually into Claude, OpenCode, or another agent. See [agent queue compatibility](skills/tripi-tropi/references/agent-queue-compatibility.md) for why Claude and OpenCode queueing are unavailable.

## Install

If you need the ticket-authoring workflow first, install [`to-tickets`](https://www.skills.sh/mattpocock/skills/to-tickets) with:

```sh
npx skills add https://github.com/mattpocock/skills --skill to-tickets
```

Install the [npm package](https://www.npmjs.com/package/@messieszurdo/tripi-tropi) with:

```sh
npx @messieszurdo/tripi-tropi
```

Use `pnpm dlx @messieszurdo/tripi-tropi` or `npm exec --package=@messieszurdo/tripi-tropi -- tripi-tropi` when those are your preferred package runners. Add `--update` to replace an existing tripi-tropi installation, or `--skills-dir "<your skills directory>"` to choose a supported parent directory. For a reproducible installation, append `@<version>` to the package name.

For local development or a pinned source checkout, the fallback installer remains available:

```sh
node scripts/install-skill.mjs
```

This installs the complete skill and locked runtime dependencies into `~/.agents/skills/tripi-tropi`. No build or developer dependencies are required. For another destination, pass the **parent skills directory**:

```sh
node scripts/install-skill.mjs --skills-dir "<your skills directory>"
```

To obtain the checkout first, clone the repository using the HTTPS or SSH URL available to you, then `cd tripi-tropi`. Use `git checkout <commit-or-tag>` before installation to select a reproducible source version. The dependency versions and integrity hashes come from the bundled lockfile; the developer's `node_modules` is never copied.

The installer leaves existing installations untouched unless `--update` is supplied. It builds and verifies a staged package before activation. Failed dependency installation preserves the previous version. It never edits Codex configuration or other skills. An existing unmanaged directory or symlink must be preserved or moved manually; choose another destination instead of overwriting it.

## Discover and run

Invoke `$tripi-tropi` in Codex and ask it to open tickets in your current repository. The viewer also works when `tripi-tropi` is installed but not explicitly invoked: launch its script directly, or invoke another agent workflow that starts it. `to-tickets` is only needed for the ticket authoring workflow; it is not required to display existing tickets. Codex discovers user skills in `~/.agents/skills` automatically; if it does not appear, restart Codex. A custom directory must be a supported discovery location (for example `<repo>/.agents/skills`) or launched directly. See the [official Codex skill documentation](https://learn.chatgpt.com/docs/build-skills).

Direct launch from any working directory (replace the example skill path with your installation path):

```sh
node "/path/to/skills/tripi-tropi/scripts/launch.mjs" --repo "/path/to/my repo"
```

The launcher opens the browser and returns immediately. Add `--no-open` to print the URL only, or `--thread "session UUID or exact name"` to set the initial Codex queue destination. Without a linked session, browsing still works. In the viewer, click the Codex destination to choose an existing session from the local Codex index or unlink it. The `Exit` button stops only this viewer process and leaves the browser tab open. Local network/process/browser permissions remain governed by the host environment.

An exact session name must identify one entry in the local Codex index; the viewer stores its UUID as the destination. Existing send records under that name are retained for duplicate protection. Implementation queue and copy actions require a structurally valid ticket with `Execution: pending`, agent approval, and completed valid dependencies. Legacy Markdown remains browsable; fix validation errors before requesting implementation. Feature-filtered discovery and validation resolve dependencies across the entire repository before filtering results.

**Clarify ticket** opens a separate clarification request, including for `needs-info`, `needs-triage` and tickets with unfinished dependencies. Add an optional note, choose **Preview message**, then **Copy clarification message** for any agent or **Queue clarification** for the linked Codex session. Questions and approval happen in the agent CLI; this request never authorizes implementation. The viewer never edits tickets. Previewed context, note and destination are revalidated before copying or sending. Existing clarification and implementation attempts prevent overlapping requests in that destination. After the conversation ends, **Allow new clarification** requires manual confirmation; it allows another request without sending one or cancelling the agent. Delivery errors remain protected until reviewed manually. Completed tickets retain their scope; additional work must be proposed as a new ticket. See the [clarification API and limits](docs/clarification-api.md).

Use **List / Graph** to switch the central panel between the ticket table and a dependency graph of the selected feature. Arrows follow the work flow from blocker to dependent. External dependencies appear as arrowheads only; select a ticket to inspect their details. Node borders use the first explicit label color and fills use the ticket state. Filters dim nonmatching nodes while keeping dependency context visible. Hover or focus a node for its name, then click or press Enter/Space to open the original Markdown detail. Drag nodes to position them, drag the background to pan, or scroll over the canvas to zoom. Focused nodes also move with arrow keys. **Fit graph**, **Rearrange**, **Isolate dependencies** control exploration; positions, camera and view mode are stored locally per repository and feature. Live updates retain existing positions and recalculate dependency membership.

After isolating the target and its prerequisites, choose **Review dependencies** to inspect its implementation order and completed tickets, then copy the instruction or queue it to the visible Codex destination. Pending external dependencies require explicit confirmation; a manual resumption also requires confirming in the agent CLI that the earlier flow is paused. Changed plans require a fresh review and confirmations. Questions are answered in the agent CLI, and closing the viewer does not cancel delivered work. Sending/Queued/Error describe delivery, separately from ticket execution; there are no automatic retries. The [component planning API](docs/component-queue-api.md) documents validation and duplicate protection shared with individual sends. Delivery is tested with a simulated agent; actual sequential implementation and pauses depend on the receiving agent following the instruction.

**Isolate dependencies** highlights the selected ticket and all its local prerequisites, following incoming arrows back to every root. It excludes descendants and sibling branches: with `01 → 02` and `01 → 03`, selecting `02` includes only `01` and `02`. The indicator identifies the target and lists the included tickets; choosing another ticket recalculates the set. Other nodes stay visible but dimmed. **Isolate dependencies** is a toggle: turning it on clears label and status filters so prerequisites are fully visible; turning it off removes the isolation emphasis and leaves filters cleared. The implementation plan includes only the target and its local prerequisites, with completed tickets kept as context. External dependencies remain boundaries and never add external work. The movement area has four times the layout width and height, with extra room on every side and the same initial camera scale.

To check whether a viewer is already active for a repository, run the launcher again with the same repository and `--no-open`:

```sh
node "/path/to/skills/tripi-tropi/scripts/launch.mjs" --repo "/path/to/my repo" --no-open
```

It reports `reused: true` and the existing local URL when the viewer is active. If there is no active instance, it starts one and reports `reused: false`.

Stop a viewer using the same repository:

```sh
node "/path/to/skills/tripi-tropi/scripts/launch.mjs" --repo "/path/to/my repo" --stop
```

## Update or reinstall

Stop viewers using the installed package, then update from npm:

```sh
npx @messieszurdo/tripi-tropi@latest --update
```

To reinstall a specific release, replace `latest` with its version. For an installation from checkout, select the desired checkout version and run:

```sh
node scripts/install-skill.mjs --update
```

Repeat your original `--skills-dir` if customized. This explicitly replaces the managed package and reinstalls dependencies with `npm ci`. Local package edits are replaced; user settings and other skills remain untouched. If Node/npm is missing, install Node.js 24+ and reopen the terminal. For npm failures, restore registry/network access and retry. If a stale install lock is reported after a terminated installer, remove only the exact lock directory shown after verifying no installer is running.
