import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import path from 'node:path';

const defaultHome = () => process.env.CODEX_HOME || path.join(homedir(), '.codex');

async function readSessions(codexHome) {
  const input = createReadStream(path.join(codexHome, 'session_index.jsonl'), { encoding: 'utf8' });
  const lines = createInterface({ input, crlfDelay: Infinity });
  const sessions = new Map();
  try {
    for await (const line of lines) {
      try {
        const record = JSON.parse(line);
        if (typeof record.id !== 'string' || !record.id.trim() || /[\x00-\x1f]/.test(record.id)) continue;
        const id = record.id.trim();
        const previous = sessions.get(id);
        sessions.set(id, { id, name: typeof record.thread_name === 'string' && record.thread_name.trim() ? record.thread_name.trim() : previous?.name ?? null });
      } catch { /* A partial index line is optional metadata, not a viewer failure. */ }
    }
  } catch { return [...sessions.values()]; }
  finally { lines.close(); input.destroy(); }
  return [...sessions.values()].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') || a.id.localeCompare(b.id));
}

/** Optional display metadata only. The linked destination is never inferred or changed. */
export async function readThreadName(thread, codexHome = defaultHome()) {
  if (!thread) return null;
  return (await readSessions(codexHome)).find((session) => session.id === thread)?.name ?? null;
}

/** Read only display-safe identifiers and names from Codex's local session index. */
export async function listCodexSessions(codexHome = defaultHome()) {
  return readSessions(codexHome);
}
