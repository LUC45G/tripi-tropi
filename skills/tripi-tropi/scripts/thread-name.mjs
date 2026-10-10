import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import path from 'node:path';

/** Optional display metadata only. The linked destination is never inferred or changed. */
export async function readThreadName(thread, codexHome = process.env.CODEX_HOME || path.join(homedir(), '.codex')) {
  if (!thread) return null;
  const input = createReadStream(path.join(codexHome, 'session_index.jsonl'), { encoding: 'utf8' });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let name = null;
  try {
    for await (const line of lines) {
      try {
        const record = JSON.parse(line);
        if (record.id === thread && typeof record.thread_name === 'string' && record.thread_name.trim()) name = record.thread_name;
      } catch { /* A partial index line is optional metadata, not a viewer failure. */ }
    }
  } catch { return null; }
  finally { lines.close(); input.destroy(); }
  return name;
}
