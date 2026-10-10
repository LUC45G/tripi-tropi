"""Closure-patch generation benchmark. No semantic ticket-writing CLI or production changes.

Run from repository root: python .scratch/verbosity-lab/run.py --level 1 --fixture-commit <hash>
Canonical tickets and commits are maintained by the controlling agent, never by this runner.
Raw CLI logs stay under ignored .cache/verbosity-lab; portable metrics/samples stay in the feature.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('--level', type=int, choices=(1, 2, 3), required=True)
parser.add_argument('--fixture-commit', required=True)
args = parser.parse_args()
repo = Path.cwd()
lab = repo / '.scratch/verbosity-lab'
logs = repo / '.cache/verbosity-lab'
logs.mkdir(parents=True, exist_ok=True)
if not re.fullmatch(r'[a-f0-9]{7,12}', args.fixture_commit):
    raise SystemExit('Use a real abbreviated fixture implementation hash.')
subprocess.run(['git', 'cat-file', '-e', args.fixture_commit + '^{commit}'], check=True, capture_output=True)
guide = (repo / 'skills/tripi-tropi/references/ticket-writing.md').read_text(encoding='utf-8-sig')
source = (lab / 'fixture/sum.mjs').read_text(encoding='utf-8')
tests = (lab / 'fixture/sum.test.mjs').read_text(encoding='utf-8')
verification = subprocess.run(['node', '--test', '.scratch/verbosity-lab/fixture/sum.test.mjs'], capture_output=True, text=True, encoding='utf-8')
if verification.returncode or not re.search(r'\bpass\s+3\b', verification.stdout):
    raise SystemExit('Fixture preflight failed.')
codex = shutil.which('codex')
if not codex:
    raise SystemExit('Codex CLI not found.')
env = os.environ.copy()
env.pop('CODEX_THREAD_ID', None)

def write(file, text):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(text, encoding='utf-8', newline='')

for repetition in range(1, 4):
    label = f'v{args.level}-r{repetition}'
    directory = lab / 'results' / label
    if directory.exists():
        raise SystemExit(f'Refusing to overwrite {label}; retain failed runs too.')
    directory.mkdir(parents=True)
    relative = f'.scratch/verbosity-lab/results/{label}/ticket.md'
    target = repo / relative
    initial = f'''# 01: Verify integer-sum fixture
Status: ready-for-agent
Execution: in-progress
Labels: experiment
Blocked by: none
Commits: {args.fixture_commit}

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
'''
    write(target, initial)
    evidence = 'Verification: node --test .scratch/verbosity-lab/fixture/sum.test.mjs passed all 3 tests. No observed failures or remaining work.'
    if repetition == 2:
        failure = subprocess.run(['node', '--test', '.scratch/verbosity-lab/fixture/missing.test.mjs'], capture_output=True, text=True, encoding='utf-8')
        if failure.returncode == 0:
            raise SystemExit('Expected missing-path control did not fail.')
        evidence += ' Observed verification failure: an initial command targeted missing.test.mjs and exited nonzero; corrected the test path, and the existing successful verification is the corrected command. Preserve this failure and solution.'
    if repetition == 3:
        evidence += ' Known limitation: overflow and unsafe-integer precision were not tested. Preserve this limitation; do not claim complete numeric coverage.'
    prompt = f'''Controlled documentation-editing experiment, not implementation or claiming of a repository ticket.
The controller owns this already implemented fixture and verified it. You only propose its closure patch from the complete current snapshot below. Do not use any tools, edit files, create commits, read credentials or implement other work. Return ONLY one raw unified diff (no fences/prose), with headers --- a/{relative} and +++ b/{relative}. The controller will check/apply the authored patch, independently verify it and maintain the canonical lab ticket and commits.
Preserve Initial state and all metadata except Execution: completed. Check the three verified acceptance boxes. Replace Pending. in Work performed and Final state with factual records in English. Preserve the real fixture commit supplied in Commits; it was checked with git cat-file. No additional checkboxes. Use the same mandatory workflow below, with the controller handling Git/validation.
Verbosity affects documentation only, not correctness or reasoning. All levels retain the command, passing count, observed failures/solutions and known limitations. Never invent failures or claim checks that were not performed.
Level 1: minimal verification line plus any required failure/limitation; Final state is one minimal factual result, no narrative recap.
Level 2: short topic: result; verification entries and a short factual closure.
Level 3: explain relevant changes/decisions, verification coverage and scope, observed issues/solutions, remaining limitations and next step, without filler.
Only the selected level varies in the matched task. Selected Verbosity: {args.level}

Mandatory workflow:
{guide}

Prepared source:
{source}
Tests:
{tests}
Actual evidence:
{evidence}
Current full fixture ticket:
{initial}
'''
    write(directory / 'input.md', prompt)
    argv = [codex, 'exec', '--ignore-user-config', '--model', 'gpt-6.1-sol', '-c', 'model_reasoning_effort="medium"', '--sandbox', 'read-only', '--json', '--cd', str(repo), '-']
    started = time.monotonic()
    with (logs / (label + '.jsonl')).open('w', encoding='utf-8') as out, (logs / (label + '.stderr.log')).open('w', encoding='utf-8') as err:
        process = subprocess.Popen(argv, stdin=subprocess.PIPE, stdout=out, stderr=err, env=env, text=True, encoding='utf-8')
        try:
            process.communicate(prompt, timeout=180)
        except subprocess.TimeoutExpired:
            process.terminate()
            process.communicate(timeout=20)
    events = []
    for line in (logs / (label + '.jsonl')).read_text(encoding='utf-8').splitlines():
        try:
            events.append(json.loads(line))
        except ValueError:
            pass
    usages = [event['usage'] for event in events if event.get('type') == 'turn.completed']
    messages = [event['item'].get('text', '') for event in events if event.get('type') == 'item.completed' and event.get('item', {}).get('type') == 'agent_message']
    calls = [event for event in events if event.get('type') == 'item.completed' and event.get('item', {}).get('type') in ('command_execution', 'mcp_tool_call', 'file_change')]
    patch = messages[-1].strip() + '\n' if messages else ''
    write(directory / 'output.patch', patch)
    result = {'case': label, 'level': args.level, 'repetition': repetition, 'model': 'gpt-6.1-sol', 'reasoning': 'medium', 'exit': process.returncode,
              'seconds': round(time.monotonic() - started, 2), 'usage': usages[-1] if usages else None,
              'toolCalls': len(calls), 'retries': 0, 'inputSha256': hashlib.sha256(prompt.encode()).hexdigest(), 'quality': {},
              'rawLog': f'.cache/verbosity-lab/{label}.jsonl'}
    error = None
    try:
        assert process.returncode == 0 and len(usages) == 1, 'Missing successful usage counter'
        assert not calls, 'Unexpected tool use'
        assert patch.startswith(f'--- a/{relative}\n+++ b/{relative}\n'), 'Unexpected diff headers'
        assert patch.count('\n--- ') == 0 and patch.count('\n+++ ') == 1, 'Multiple file patch'
        assert all(not line.startswith(('diff ', 'rename ', 'copy ', 'Binary ', '***')) for line in patch.splitlines()), 'Unsupported patch operation'
        patch_file = directory / 'output.patch'
        subprocess.run(['git', 'apply', '--recount', '--check', str(patch_file)], cwd=repo, check=True, capture_output=True)
        subprocess.run(['git', 'apply', '--recount', str(patch_file)], cwd=repo, check=True, capture_output=True)
        closed = target.read_text(encoding='utf-8')
        expected_prefix = initial.split('## Work performed')[0].replace('Execution: in-progress', 'Execution: completed').replace('- [ ]', '- [x]')
        assert closed.startswith(expected_prefix), 'Scope or metadata changed unexpectedly'
        work, final = closed.split('## Work performed\n', 1)[1].split('## Final state\n', 1)
        assert work.strip() and final.strip() and 'Pending.' not in work + final, 'Missing records'
        assert 'sum.test.mjs' in work and re.search(r'\b3\b|three', work, re.I), 'Missing command/count'
        assert not re.search(r'^\s*- \[[ xX]\]', work + final, re.M), 'Extra checkboxes'
        if repetition == 2:
            assert re.search(r'missing|incorrect|wrong|nonexistent|not found', work + final, re.I), 'Failure omitted'
            assert re.search(r'correct|fix|path', work + final, re.I), 'Failure solution omitted'
        if repetition == 3:
            assert re.search(r'overflow|unsafe|precision', work + final, re.I), 'Limitation omitted'
        result['quality'] = {'scopeAndMetadataPreserved': True, 'verifiedCheckboxes': 3, 'commandAndCountPresent': True, 'requiredIssuesRetained': True,
                             'recordBytes': len((work.strip() + '\n' + final.strip()).encode('utf-8')), 'finalBytes': len(final.strip().encode('utf-8'))}
        result['valid'] = True
    except Exception as problem:
        error = str(problem)
        result['valid'] = False
        result['failure'] = error
    write(directory / 'metrics.json', json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False), flush=True)
    if error:
        raise SystemExit(f'Run retained but invalid: {label}: {error}. Do not silently retry or claim success.')
