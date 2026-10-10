import http from 'node:http';
import path from 'node:path';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { loadTickets } from './tickets.mjs';
import { deriveTicketStates } from './ticket-states.mjs';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const staticFiles = new Map([
  ['/', ['assets/index.html', 'text/html']],
  ['/app.js', ['assets/app.js', 'text/javascript']],
  ['/style.css', ['assets/style.css', 'text/css']],
  ['/vendor/marked.js', ['node_modules/marked/lib/marked.umd.js', 'text/javascript']],
  ['/vendor/purify.js', ['node_modules/dompurify/dist/purify.min.js', 'text/javascript']],
]);

export async function createViewer({ repo, port = 0, controlToken = '' }) {
  const root = await realpath(path.resolve(repo));
  // Fail before launch succeeds if bundled assets or installed dependencies are missing.
  await Promise.all([...staticFiles.values()].map(([filename]) => readFile(path.join(skillRoot, filename))));
  const server = http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    const json = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)); };
    const address = server.address();
    const expectedHost = `127.0.0.1:${address.port}`;
    if (request.headers.host !== expectedHost || (request.headers.origin && request.headers.origin !== `http://${expectedHost}`)) return json(403, { error: 'Only same-origin loopback requests are accepted.' });
    let pathname;
    try { pathname = new URL(request.url, `http://${expectedHost}`).pathname; }
    catch { return json(400, { error: 'Invalid URL.' }); }
    if (pathname === '/control/stop' && request.method === 'POST') {
      const supplied = Buffer.from(String(request.headers['x-viewer-token'] ?? ''));
      const expected = Buffer.from(controlToken);
      if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(403, { error: 'Invalid server control token.' });
      json(200, { stopped: true });
      setImmediate(() => { server.close(); server.closeAllConnections(); });
      return;
    }
    if (request.method !== 'GET') return json(405, { error: 'This viewer is read-only.' });
    try {
      if (pathname === '/api/health') return json(200, { app: 'tripi-tropi', version: 1, repo: root, pid: process.pid });
      if (pathname === '/api/snapshot') {
        const data = await loadTickets(root);
        return json(200, { ...data, repo: root, repoName: path.basename(root), tickets: deriveTicketStates(data.tickets) });
      }
      const resource = staticFiles.get(pathname);
      if (!resource) return json(404, { error: 'Resource not found.' });
      const content = await readFile(path.join(skillRoot, resource[0]));
      response.writeHead(200, { 'Content-Type': `${resource[1]}; charset=utf-8` });
      response.end(content);
    } catch (error) { json(500, { error: error.message }); }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  return { server, repo: root, url: `http://127.0.0.1:${server.address().port}` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const viewer = await createViewer({ repo: process.env.TRIPI_TROPI_REPO, port: Number(process.env.TRIPI_TROPI_PORT ?? 0), controlToken: process.env.TRIPI_TROPI_TOKEN });
    if (process.send) process.send({ ready: true, url: viewer.url, repo: viewer.repo });
    console.log(`tripi-tropi listening at ${viewer.url}`);
    process.on('SIGTERM', () => { viewer.server.close(); viewer.server.closeAllConnections(); });
    process.on('SIGINT', () => { viewer.server.close(); viewer.server.closeAllConnections(); });
  } catch (error) { console.error(error.message); if (process.send) process.send({ error: error.message }); process.exitCode = 1; }
}
