import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const defaultHome = () => process.env.CODEX_HOME || path.join(homedir(), '.codex');

async function readSessions(codexHome, includeDetails = true) {
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
        sessions.set(id, {
          id,
          name: typeof record.thread_name === 'string' && record.thread_name.trim() ? record.thread_name.trim() : previous?.name ?? null,
          updatedAt: typeof record.updated_at === 'string' ? record.updated_at : previous?.updatedAt ?? null,
          cwd: previous?.cwd ?? null,
          threadSource: previous?.threadSource ?? 'unknown',
          parentThreadId: previous?.parentThreadId ?? null,
        });
      } catch { /* A partial index line is optional metadata, not a viewer failure. */ }
    }
  } catch { /* A missing or unreadable local index keeps the viewer usable. */ }
  finally { lines.close(); input.destroy(); }
  const values = [...sessions.values()];
  if (includeDetails && values.length) await addSessionDetails(codexHome, sessions);
  return values.sort((a, b) => (Date.parse(b.updatedAt ?? '') || 0) - (Date.parse(a.updatedAt ?? '') || 0) || a.id.localeCompare(b.id));
}

async function addSessionDetails(codexHome, sessions) {
  const root = path.join(codexHome, 'sessions');
  const inspected = new Set();
  const readMetadata = async (filename) => {
    const input = createReadStream(filename, { encoding: 'utf8' });
    const lines = createInterface({ input, crlfDelay: Infinity });
    try {
      for await (const line of lines) {
        try {
          const record = JSON.parse(line);
          if (record.type !== 'session_meta' || typeof record.payload?.id !== 'string') return null;
          return record.payload;
        } catch { return null; }
      }
    } catch { return null; }
    finally { lines.close(); input.destroy(); }
    return null;
  };
  const visit = async (directory) => {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (entry.isDirectory()) { await visit(path.join(directory, entry.name)); continue; }
      if (!entry.isFile() || !entry.name.startsWith('rollout-') || !entry.name.endsWith('.jsonl')) continue;
      const session = [...sessions.values()].find((item) => !inspected.has(item.id) && entry.name.includes(item.id));
      if (!session) continue;
      inspected.add(session.id);
      const metadata = await readMetadata(path.join(directory, entry.name));
      if (metadata?.id !== session.id) { inspected.delete(session.id); continue; }
      session.cwd = typeof metadata.cwd === 'string' ? metadata.cwd : null;
      session.threadSource = typeof metadata.thread_source === 'string' ? metadata.thread_source : 'unknown';
      session.parentThreadId = typeof metadata.parent_thread_id === 'string' ? metadata.parent_thread_id : null;
    }
  };
  await visit(root);
}

/** Optional display metadata only. The linked destination is never inferred or changed. */
export async function readThreadName(thread, codexHome = defaultHome()) {
  if (!thread) return null;
  return (await readSessions(codexHome, false)).find((session) => session.id === thread)?.name ?? null;
}

/** Read only display-safe identifiers and names from Codex's local session index. */
export async function listCodexSessions(codexHome = defaultHome()) {
  return readSessions(codexHome);
}

/** Names are only accepted when the local index identifies one exact destination. */
export async function resolveCodexThread(value, resolveSessions = listCodexSessions) {
  const destination = value.trim();
  if (!destination) return '';
  if (/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(destination)) return destination.toLowerCase();
  const sessions = await resolveSessions();
  if (sessions.some((session) => session.id === destination)) return destination;
  const matches = sessions.filter((session) => session.name === destination);
  if (matches.length !== 1) throw new Error('Session name must match exactly one entry in the local Codex index. Use its UUID instead.');
  return matches[0].id;
}
