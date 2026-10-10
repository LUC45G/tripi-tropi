# tripi-tropi

[![Skill version](https://img.shields.io/github/package-json/v/LUC45G/tripi-tropi?filename=skills%2Ftripi-tropi%2Fpackage.json)](https://github.com/LUC45G/tripi-tropi/blob/main/skills/tripi-tropi/package.json)

A local, read-only ticket viewer for `.scratch/<feature>/issues/*.md` created with the [`to-tickets`](https://www.skills.sh/mattpocock/skills/to-tickets) skill. Install or otherwise make `to-tickets` available in the repository if you want to create and maintain tickets; the viewer itself only reads existing Markdown files. It runs independently while your agent works. Node.js 24+ with npm and registry access are required; Codex CLI with `queue` support is optional for sending implementation requests.

## Install

If you need the ticket-authoring workflow first, install [`to-tickets`](https://www.skills.sh/mattpocock/skills/to-tickets) with:

```sh
npx skills add https://github.com/mattpocock/skills --skill to-tickets
```

Once published on npm, install the package with:

```sh
npx @messieszurdo/tripi-tropi
```

Use `pnpm dlx @messieszurdo/tripi-tropi` or `npm exec --package=@messieszurdo/tripi-tropi -- tripi-tropi` when those are your preferred package runners. Add `--update` to replace an existing tripi-tropi installation, or `--skills-dir "<your skills directory>"` to choose a supported parent directory. Until the first npm publication, use the checkout installer below; it also remains useful for pinned source checkouts and local development.

From this checkout, run:

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

The launcher opens the browser and returns immediately. Add `--no-open` to print the URL only, or `--thread "session UUID or exact name"` to enable Codex queueing. Without a linked session, browsing still works. Local network/process/browser permissions remain governed by the host environment.

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

Stop viewers using the installed package, select the desired checkout version, then run:

```sh
node scripts/install-skill.mjs --update
```

Repeat your original `--skills-dir` if customized. This explicitly replaces the managed package and reinstalls dependencies with `npm ci`. Local package edits are replaced; user settings and other skills remain untouched. If Node/npm is missing, install Node.js 24+ and reopen the terminal. For npm failures, restore registry/network access and retry. If a stale install lock is reported after a terminated installer, remove only the exact lock directory shown after verifying no installer is running.
