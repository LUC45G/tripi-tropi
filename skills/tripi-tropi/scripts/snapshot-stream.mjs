import chokidar from 'chokidar';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadTickets, within } from './tickets.mjs';
import { deriveTicketStates } from './ticket-states.mjs';

/** Watches only the ticket tree and triage config; publishes complete read-only snapshots. */
export async function createSnapshotStream(repo) {
  const clients = new Set();
  const scratch = path.join(repo, '.scratch');
  const config = path.join(repo, 'docs', 'agents', 'triage-labels.md');
  let current;
  let serialized = '';
  let revision = 0;
  let generation = 0;
  let timer;
  let running;
  let closed = false;
  let readError = null;
  let watcher;
  const instance = randomUUID();
  function send(response, event, value) {
    response.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
  }
  function broadcast(event, value) { for (const response of clients) send(response, event, value); }
  async function rebuild() {
    if (running) return running;
    running = (async () => {
      let start;
      do {
        start = generation;
        const data = await loadTickets(repo);
        // Re-register descendants after a read failure: a path can have changed
        // from a directory to a file and back while the old watches were active.
        if (readError && !closed) {
          await watcher.close(); watcher = startWatcher(); await watchReady(watcher);
        }
        if (start !== generation) continue;
        const value = { ...data, repo, repoName: path.basename(repo), tickets: deriveTicketStates(data.tickets) };
        const next = JSON.stringify(value);
        if (next !== serialized || readError) {
          serialized = next; current = { ...value, instance, revision: ++revision }; readError = null;
          if (!closed) broadcast('snapshot', current);
        }
      } while (start !== generation && !closed);
    })();
    try { await running; }
    catch (error) { readError = error.message; if (!closed) broadcast('read-error', { error: readError }); if (!current) throw error; }
    finally { running = null; }
  }
  function startWatcher() {
    const nextWatcher = chokidar.watch(repo, {
      ignoreInitial: true, followSymlinks: false, atomic: 100,
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 30 },
      ignored: (filename) => {
        const candidate = path.resolve(filename);
        return candidate !== repo && !within(scratch, candidate) && !within(candidate, config);
      },
    });
    nextWatcher.on('all', () => {
      generation++; clearTimeout(timer);
      timer = setTimeout(() => { rebuild().catch((error) => console.error(error.message)); }, 200);
      timer.unref();
    });
    nextWatcher.on('error', (error) => { readError = `File watcher: ${error.message}`; broadcast('read-error', { error: readError }); });
    return nextWatcher;
  }
  function watchReady(target) {
    return new Promise((resolve, reject) => { target.once('ready', resolve); target.once('error', reject); });
  }
  watcher = startWatcher();
  try {
    await watchReady(watcher);
    await rebuild();
  } catch (error) { await watcher.close(); clearTimeout(timer); throw error; }
  const heartbeat = setInterval(() => { for (const response of clients) response.write(': heartbeat\n\n'); }, 15000);
  heartbeat.unref();
  return {
    snapshot: () => current,
    subscribe(response) {
      response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
      response.write('retry: 1000\n\n');
      clients.add(response); send(response, 'snapshot', current);
      if (readError) send(response, 'read-error', { error: readError });
      response.on('close', () => clients.delete(response));
    },
    async close() {
      if (closed) return;
      closed = true; clearTimeout(timer); clearInterval(heartbeat);
      for (const response of clients) response.end(); clients.clear();
      await watcher.close();
      if (running) await running.catch(() => {});
    },
  };
}
