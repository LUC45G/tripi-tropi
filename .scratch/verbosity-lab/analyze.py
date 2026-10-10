"""Analyze retained native usage counters; optional tokenizers measure text, not billing."""
import argparse
import json
from pathlib import Path
import re
import statistics
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('--tokenizer-path')
args = parser.parse_args()
if args.tokenizer_path:
    sys.path.insert(0, str(Path(args.tokenizer_path).resolve()))
    import tiktoken
    encodings = {name: tiktoken.get_encoding(name) for name in ('o200k_base', 'cl100k_base')}
else:
    encodings = {}
repo = Path.cwd()
lab = repo / '.scratch/verbosity-lab'
rows = []
for level in (1, 2, 3):
    for repetition in (1, 2, 3):
        directory = lab / f'results/v{level}-r{repetition}'
        row = json.loads((directory / 'metrics.json').read_text(encoding='utf-8'))
        if not row['valid']:
            raise SystemExit(f'Invalid retained trial: {row["case"]}')
        text = (directory / 'ticket.md').read_text(encoding='utf-8')
        work, final = text.split('## Work performed\n', 1)[1].split('## Final state\n', 1)
        content = work.strip() + '\n' + final.strip()
        row['textTokenEstimates'] = {name: len(encoding.encode(content)) for name, encoding in encodings.items()}
        usage = row['usage']
        row['uncachedInput'] = usage['input_tokens'] - usage['cached_input_tokens']
        row['processedTokens'] = usage['input_tokens'] + usage['output_tokens']
        row['outputWithoutReasoning'] = usage['output_tokens'] - usage.get('reasoning_output_tokens', 0)
        rows.append(row)

# Compare explicit prompts, not the hidden host context. Only level/path digits may vary.
for repetition in (1, 2, 3):
    prompts = []
    for level in (1, 2, 3):
        text = (lab / f'results/v{level}-r{repetition}/input.md').read_text(encoding='utf-8')
        text = re.sub(r'results/v[123]-r', 'results/vLEVEL-r', text)
        text = re.sub(r'Selected Verbosity: [123]', 'Selected Verbosity: LEVEL', text)
        prompts.append(text)
    if len(set(prompts)) != 1:
        raise SystemExit(f'Explicit prompts differ for repetition {repetition}')

validator = """import {readFileSync} from 'node:fs';
import {parseTicket} from './skills/tripi-tropi/scripts/tickets.mjs';
for(const level of [1,2,3]) for(const r of [1,2,3]) {
 const t=parseTicket(readFileSync(`.scratch/verbosity-lab/results/v${level}-r${r}/ticket.md`,'utf8'),{feature:'fixture',filename:'01-fixture.md',strict:true});
 if(t.diagnostics.length||t.execution!=='completed'||t.progress.checked!==3||t.progress.total!==3) throw Error(JSON.stringify(t.diagnostics));
}
"""
subprocess.run(['node', '--input-type=module', '-e', validator], check=True, cwd=repo)
subprocess.run(['git', 'cat-file', '-e', '05f5060da4d2^{commit}'], check=True, capture_output=True)
for name in ('sum.mjs', 'sum.test.mjs'):
    original = subprocess.check_output(['git', 'show', f'05f5060da4d2:.scratch/verbosity-lab/fixture/{name}']).decode('utf-8').replace('\r\n', '\n')
    if original != (lab / 'fixture' / name).read_text(encoding='utf-8'):
        raise SystemExit('Fixture source changed after preparation.')

groups = []
for level in (1, 2, 3):
    cases = [row for row in rows if row['level'] == level]
    groups.append({'level': level, 'trials': len(cases),
                   'input': sum(row['usage']['input_tokens'] for row in cases),
                   'cachedInputSubset': sum(row['usage']['cached_input_tokens'] for row in cases),
                   'uncachedInput': sum(row['uncachedInput'] for row in cases),
                   'outputIncludingReasoning': sum(row['usage']['output_tokens'] for row in cases),
                   'reasoningOutputSubset': sum(row['usage'].get('reasoning_output_tokens', 0) for row in cases),
                   'outputWithoutReasoning': sum(row['outputWithoutReasoning'] for row in cases),
                   'processedTokens': sum(row['processedTokens'] for row in cases),
                   'medianProcessedTokens': statistics.median(row['processedTokens'] for row in cases),
                   'meanRecordBytes': round(statistics.mean(row['quality']['recordBytes'] for row in cases), 2),
                   'meanRecordTokenEstimates': {name: round(statistics.mean(row['textTokenEstimates'][name] for row in cases), 2) for name in encodings},
                   'seconds': round(sum(row['seconds'] for row in cases), 2)})
comparisons = []
for other in groups[1:]:
    first = groups[0]
    change = lambda field: round((first[field] / other[field] - 1) * 100, 2)
    comparisons.append({'level1Vs': other['level'], 'outputPercentChange': change('outputIncludingReasoning'),
                        'outputWithoutReasoningPercentChange': change('outputWithoutReasoning'),
                        'processedTokensPercentChange': change('processedTokens')})
result = {'method': 'Closure patch generation only; native Codex counters; not billed cost or full implementation',
          'checks': {'strictValidFixtures': 9, 'explicitMatchedPrompts': True, 'preparedSourceUnchanged': True,
                     'manualReviewRequired': 'Quality flags check structure and required evidence; review actual claims separately.'},
          'groups': groups, 'comparisons': comparisons, 'trials': rows,
          'limitations': ['n=3 matched small cases, one generation per level/case; no statistical claim',
                          'fixed blocked order 1 then 2 then 3 to implement one canonical ticket at a time',
                          'first level1 trial cold cache; cannot attribute uncached-input differences to verbosity',
                          'explicit prompts matched but native input counts/host context vary',
                          'model outputs diffs without tool calls; no claim about creation, implementation, tool retries or future reads',
                          'controller preparation/validation/commits and this conversation excluded from native subject counters',
                          'output includes reasoning; cached input is a subset, not extra tokens',
                          'text tokenizers are reference estimates, not confirmed model tokenizer']}
output = lab / 'results/summary.json'
output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='')
print(json.dumps({'groups': groups, 'comparisons': comparisons, 'checks': result['checks']}, ensure_ascii=False, indent=2))
