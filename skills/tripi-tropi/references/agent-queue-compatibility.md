# Agent queue compatibility

Investigation date: 2026-10-13. Queue support requires a documented way to deliver a prompt to an existing session as its next turn without steering or interrupting active work. A successful HTTP/CLI acceptance response alone is not proof that the agent will run the prompt.

| Agent | Version and source checked | Finding | Viewer support |
| --- | --- | --- | --- |
| Codex | Existing `codex queue` adapter and its CLI help | The queue command targets an explicit existing thread and is the supported adapter already used by the viewer. | Enabled when a session is explicitly linked. |
| Claude Code | No Claude CLI was installed on PATH. [Official CLI reference](https://code.claude.com/docs/en/cli-usage) and [session documentation](https://code.claude.com/docs/en/sessions) | `claude --resume <session> "prompt"` can send a next-turn prompt to a running background session, but the documented path attaches in the same terminal. The docs say redirected/piped input or output prevents delivery. A viewer subprocess uses piped stdio; supporting this would require an interactive terminal wrapper, which this ticket excludes. | Disabled. |
| OpenCode | Local CLI 1.18.35; `opencode run --help`; [official TUI docs](https://dev.opencode.ai/v2/docs/cli/tui/) and [server API docs](https://dev.opencode.ai/docs/server/) | The TUI queues with a keyboard action. The HTTP `prompt_async` API returns immediately, but [open issue #46842](https://github.com/anomalyco/opencode/issues/46842) reports that on OpenCode v1.18.x a prompt sent while busy may be persisted without its turn running. The API does not give the viewer a reliable queued-delivery guarantee. | Disabled. |

No Claude or OpenCode messages were sent, and no live delivery was tested. Revisit support when an official non-interactive API guarantees next-turn delivery for busy sessions and its installed version can be checked without sending a prompt.
