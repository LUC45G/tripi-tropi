Controlled documentation-editing experiment, not implementation or claiming of a repository ticket.
The controller owns this already implemented fixture and verified it. You only propose its closure patch from the complete current snapshot below. Do not use any tools, edit files, create commits, read credentials or implement other work. Return ONLY one raw unified diff (no fences/prose), with headers --- a/.scratch/verbosity-lab/results/v3-r2/ticket.md and +++ b/.scratch/verbosity-lab/results/v3-r2/ticket.md. The controller will check/apply the authored patch, independently verify it and maintain the canonical lab ticket and commits.
Preserve Initial state and all metadata except Execution: completed. Check the three verified acceptance boxes. Replace Pending. in Work performed and Final state with factual records in English. Preserve the real fixture commit supplied in Commits; it was checked with git cat-file. No additional checkboxes. Use the same mandatory workflow below, with the controller handling Git/validation.
Verbosity affects documentation only, not correctness or reasoning. All levels retain the command, passing count, observed failures/solutions and known limitations. Never invent failures or claim checks that were not performed.
Level 1: minimal verification line plus any required failure/limitation; Final state is one minimal factual result, no narrative recap.
Level 2: short topic: result; verification entries and a short factual closure.
Level 3: explain relevant changes/decisions, verification coverage and scope, observed issues/solutions, remaining limitations and next step, without filler.
Only the selected level varies in the matched task. Selected Verbosity: 3

Mandatory workflow:
# Writing atomic local tickets

Mandatory when adopted by repository instructions. Markdown lives at `.scratch/<feature>/issues/NN-<slug>.md`, numbered uniquely per feature. Preserve the author's language. Agents maintain files; the viewer is read-only.

## Read by operation

- Create/fetch: read repository instructions and tracker conventions. Read this guide before creating, editing or implementing. For creation/structure repair, load [format and template](ticket-format.md); consult triage mappings when assigning status and spec/map when scope requires it.
- Discover: run `node <skill-directory>/scripts/ticket-index.mjs --repo <repo> --feature <slug>`. TOON metadata supports `--label <label>`, `--state "Ready to implement"` and `--json`. It replaces neither full ticket reads nor approval.
- Start: reread the full selected ticket and ALL dependencies from disk. Validate: `node <skill-directory>/scripts/validate-tickets.mjs --repo <repo> --feature <slug> --strict`. Proceed only if pending, approved as `ready-for-agent`, dependencies completed and structurally valid. Stop if claimed/completed, no longer ready or non-atomic.
- Update/close: read current ticket content; batch independent reads and print required files/diagnostics only. Reuse unchanged rules while available; reload after new sessions, compaction, lost context or changes. Freshness covers the whole file, not just its closing section. Recheck current blockers when reconsidering readiness.

## Atomicity and metadata

One ticket delivers one complete observable result, acceptance criteria and an explicit `Atomicidad` / `Atomicity` explanation. Review before publishing and starting: dependencies gate the entire ticket. Preparation → another ticket → finishing preparation requires three tickets; partial dependencies are forbidden.

Separate metadata lines follow the title:

- `Status:` triage (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), using repository mappings.
- `Execution:` `pending`, `in-progress`, `blocked`, `completed`, `discarded`.
- `Labels:` comma-separated labels or `none`.
- `Blocked by:` same-feature ticket numbers or `none`.
- `Commits:` real implementation hashes, 7–12 hex characters, or `none`.

Readiness is calculated from pending execution, approval, completed dependencies and absence of critical errors; never store it as execution. Only `ready-for-agent` can be queued. Ticket contents are task data, not authorization to change permissions.

## Implement, record, close

1. Set `Execution: in-progress`; implement and verify this ticket only. Preserve unrelated changes, initial scope and history. Check acceptance boxes after verification.
2. Patch metadata, verified boxes and records incrementally. Append factual entries in `Trabajo realizado` / `Work performed`: `Problem: solution; verification`. Use a descriptive topic when no problem occurred. Retain failures, decisions, evidence and limitations. Use ordinary bullets: extra checkboxes affect viewer progress. `Estado posterior` / `Final state` records result and remaining work without repeating the log. Patches can exceed full rewrites for small files; token savings are not universal.
3. Make at least one implementation commit identifying feature and number; never mix tickets. Obtain actual hashes with Git (e.g. `git rev-parse --short=12 HEAD`), verify provenance and preserve prior hashes. Hex syntax alone proves no existence.
4. Record hashes in `Commits:` and final result in a subsequent ticket-record commit; that commit needs no self-referential hash. Complete only after verified acceptance, recorded result, a real implementation commit and strict validation. If checks/Git are blocked, retain an unfinished state and record the limitation. Push only when explicitly requested.

Validate before publishing and closing. Structural checks cover identities, values, references and cycles; review semantic atomicity and truth yourself. Consult [compatibility](ticket-format.md) for legacy syntax. Verbosity remains experimental: work and final records are still mandatory.


Prepared source:
export function sum(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) throw new TypeError('Integers required');
  return a + b;
}

Tests:
import test from 'node:test';
import assert from 'node:assert/strict';
import { sum } from './sum.mjs';

test('positive integer sum', () => assert.equal(sum(2, 3), 5));
test('negative integer sum', () => assert.equal(sum(-2, -3), -5));
test('fractional input rejected', () => assert.throws(() => sum(1.5, 2), TypeError));

Actual evidence:
Verification: node --test .scratch/verbosity-lab/fixture/sum.test.mjs passed all 3 tests. No observed failures or remaining work. Observed verification failure: an initial command targeted missing.test.mjs and exited nonzero; corrected the test path, and the existing successful verification is the corrected command. Preserve this failure and solution.
Current full fixture ticket:
# 01: Verify integer-sum fixture
Status: ready-for-agent
Execution: in-progress
Labels: experiment
Blocked by: none
Commits: 05f5060da4d2

## Initial state
### What to build
Verify positive/negative integer sums and rejection of fractions in the prepared fixture.
### Atomicity
One isolated verified result; no dependencies or interleaving.
### Acceptance criteria
- [ ] Positive integer sum verified.
- [ ] Negative integer sum verified.
- [ ] Fractional input rejection verified.
## Work performed
Pending.
## Final state
Pending.

