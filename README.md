# tripi-tropi

A local, read-only ticket viewer for `.scratch/<feature>/issues/*.md`. It runs independently while your agent works. Node.js 24+ with npm and registry access are required; Codex CLI with `queue` support is optional for sending implementation requests.

## Install

From this checkout, run:

```sh
node scripts/install-skill.mjs
```

This installs the complete skill and locked runtime dependencies into `~/.agents/skills/tripi-tropi`. No build or developer dependencies are required. For another destination, pass the **parent skills directory**:

```sh
node scripts/install-skill.mjs --skills-dir "C:/Users/lucas/custom skills"
```

To obtain the checkout first: `git clone git@github.com:LUC45G/tripi-tropi.git`, then `cd tripi-tropi`. Use `git checkout <commit-or-tag>` before installation to select a reproducible source version. The dependency versions and integrity hashes come from the bundled lockfile; the developer's `node_modules` is never copied.

The installer leaves existing installations untouched unless `--update` is supplied. It builds and verifies a staged package before activation. Failed dependency installation preserves the previous version. It never edits Codex configuration or other skills. An existing unmanaged directory or symlink must be preserved or moved manually; choose another destination instead of overwriting it.

## Discover and run

Invoke `$tripi-tropi` in Codex and ask it to open tickets in your current repository. Codex discovers user skills in `~/.agents/skills` automatically; if it does not appear, restart Codex. A custom directory must be a supported discovery location (for example `<repo>/.agents/skills`) or launched directly. See the [official Codex skill documentation](https://learn.chatgpt.com/docs/build-skills).

Direct launch from any working directory (replace the example skill path with your installation path):

```sh
node "/path/to/skills/tripi-tropi/scripts/launch.mjs" --repo "/path/to/my repo"
```

The launcher opens the browser and returns immediately. Add `--no-open` to print the URL only, or `--thread "session UUID or exact name"` to enable Codex queueing. Without a linked session, browsing still works. Local network/process/browser permissions remain governed by the host environment.

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
