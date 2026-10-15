# Ticket clarification

`Clarify ticket` follows the [approved design](../.scratch/mejoras-futuras/acciones-tickets.md). It interviews the user in the agent CLI; it does not implement or split tickets. The viewer never edits Markdown. Only approved agent changes may write files, following repository rules.

## UI

Open the action from ticket details, add an optional note and preview the message. Editing the note invalidates the preview. Copy works without a linked agent and writes no receipts; queueing uses the existing Codex destination and delivery adapter. Markdown cannot invoke these controls. Escape, Cancel or a click starting and ending outside dismiss the dialog; closing does not cancel delivery.

The instruction adapts to triage, falls back to a self-contained interview when grill-me is unavailable, distinguishes clarity from dependency readiness and requires approval before file writes. In-progress and completed ticket scopes remain protected. Discarded/wontfix tickets do not offer this action.

## HTTP

All routes below are same-origin POST requests with `Content-Type: application/json` and `X-Queue-Token` from `GET /api/queue`. The existing exact-origin/token checks, UTF-8 decoder and 4096-byte request limit apply. Unknown fields and wrong types are rejected; the optional `note` is at most 2000 characters, additionally subject to the byte limit.

| Route | Fields | Result |
| --- | --- | --- |
| `/api/clarification-review` | `ticket`, optional `note` | Message, opaque `reviewToken`, current clarification receipt and implementation conflict. No writes. |
| `/api/clarification-message` | `ticket`, optional `note`, `reviewToken` | Revalidated message. No receipts or ticket writes. |
| `/api/clarification-queue` | `ticket`, optional `note`, `reviewToken` | One delivery to the linked Codex session, reserved before invoking the adapter. |
| `/api/clarification-release` | `ticket`, optional `note`, `reviewToken`, `confirmEnded: true` | Acknowledges that the review ended; permits a new request without delivering or cancelling anything. |

The HMAC preview binds repository, destination, triage mapping, full ticket and reachable dependency contents, note and relevant receipts. A changed or expired preview requires reviewing again. Tickets need not be ready to implement; malformed/missing dependencies can themselves need clarification and never authorize execution. A missing ticket returns 404; stale context, duplicate requests, missing destination or manual confirmation return 409. Failed delivery returns 502 and remains reserved, without automatic retry.

## Receipts and limitations

The existing external per-repository/session ledger uses separate `@clarify:<ticket-id>` keys. Sending, Queued and Error describe delivery only. The service prevents duplicate clarifications and overlap with individual/batch implementation in the same destination. It blocks session changes during delivery. Restarted Sending receipts become Error.

Manual release requires confirmation that the prior review ended and refuses an active Sending receipt. It persists Released before permitting another send and retains the released receipt as history when another attempt starts. It never removes implementation reservations. An uncertain delivery still needs checking in the agent CLI before acknowledgment. Copying or using another destination cannot be protected as if the viewer had delivered that work.

The viewer cannot detect conversation completion. The user can confirm incorrectly and allow overlapping work; the UI explains that release does not cancel the agent. Automated tests simulate delivery and the clipboard; they do not prove that a real agent asks questions or waits for approval correctly.
