# Domain Docs

## Before exploring

This repo uses a single-context layout:

- Read `GLOSSARY.md` at the repo root.
- Read relevant decisions in `docs/adr/`.

If these files do not exist, proceed silently. The
`domain-modeling` skill creates them when terms or decisions
are resolved.

## File structure

- `GLOSSARY.md`: shared domain vocabulary.
- `docs/adr/NNNN-<decision>.md`: architectural decisions.

## Use the glossary's vocabulary

Use defined terms when naming domain concepts in issues,
proposals, hypotheses, and tests.

If a concept is missing, reconsider whether it belongs to the
project's vocabulary; record real gaps for `domain-modeling`.

## Flag ADR conflicts

Explicitly identify any existing ADR your proposal contradicts,
and explain why the decision should be reopened.
