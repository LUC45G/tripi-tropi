import http from 'node:http';
import path from 'node:path';
import { readFile, realpath, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { createSnapshotStream } from './snapshot-stream.mjs';
import { createQueue } from './queue.mjs';
import { readFileSync } from 'node:fs';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const skillVersion = JSON.parse(readFileSync(path.join(skillRoot, 'package.json'), 'utf8')).version;
const staticFiles = new Map([
  ['/', ['assets/index.html', 'text/html']],
  ['/app.js', ['assets/app.js', 'text/javascript']],
  ['/graph.mjs', ['assets/graph.mjs', 'text/javascript']],
  ['/style.css', ['assets/style.css', 'text/css']],
  ['/icon.svg', ['assets/icon.svg', 'image/svg+xml']],
  ['/vendor/marked.js', ['node_modules/marked/lib/marked.umd.js', 'text/javascript']],
  ['/vendor/purify.js', ['node_modules/dompurify/dist/purify.min.js', 'text/javascript']],
  ['/vendor/gsap.js', ['node_modules/gsap/dist/gsap.min.js', 'text/javascript']],
]);

export async function createViewer({ repo, port = 0, controlToken = '', thread = '', registryFile = '', queueOptions = {} }) {
  const root = await realpath(path.resolve(repo));
  // Fail before launch succeeds if bundled assets or installed dependencies are missing.
  await Promise.all([...staticFiles.values()].map(([filename]) => readFile(path.join(skillRoot, filename))));
  const queue = await createQueue({ ...queueOptions, repo: root, thread });
  const stream = await createSnapshotStream(root);
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
    if (request.method === 'POST' && ['/api/queue', '/api/implementation-message', '/api/session', '/api/component-plan', '/api/component-message', '/api/component-queue', '/api/clarification-review', '/api/clarification-message', '/api/clarification-queue', '/api/clarification-release'].includes(pathname)) {
      const supplied = Buffer.from(String(request.headers['x-queue-token'] ?? ''));
      const expected = Buffer.from(queue.info().token);
      if (request.headers.origin !== `http://${expectedHost}` || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(403, { error: 'A same-origin queue session token is required.' });
      if (!request.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Expected a JSON request.' });
      try {
        request.setEncoding('utf8');
        let body = '';
        for await (const chunk of request) {
          body += chunk;
          if (Buffer.byteLength(body, 'utf8') > 4096) return json(413, { error: 'Request is too large.' });
        }
        const payload = JSON.parse(body);
        if (pathname === '/api/session') {
          if (!payload || Object.keys(payload).length !== 1 || !Object.hasOwn(payload, 'session') || (payload.session !== null && typeof payload.session !== 'string')) return json(400, { error: 'Only a session identifier or null may be selected.' });
          if (payload.session !== null && !(await queue.listSessions()).some((session) => session.id === payload.session)) return json(409, { error: 'That session is no longer available in the local index. Refresh sessions.' });
          const result = await queue.setThread(payload.session);
          if (result.code !== 200) return json(result.code, { error: result.error });
          await queue.refreshThreadName();
          return json(200, queue.info());
        }
        if (pathname.startsWith('/api/clarification-')) {
          const review = pathname === '/api/clarification-review';
          const release = pathname === '/api/clarification-release';
          const fields = review ? ['ticket', 'note'] : release ? ['ticket', 'note', 'reviewToken', 'confirmEnded'] : ['ticket', 'note', 'reviewToken'];
          if (!payload || Array.isArray(payload) || typeof payload.ticket !== 'string' || Object.keys(payload).some((key) => !fields.includes(key)) || (Object.hasOwn(payload, 'note') && typeof payload.note !== 'string') || (!review && (typeof payload.reviewToken !== 'string' || !/^[a-f\d]{64}$/.test(payload.reviewToken))) || (Object.hasOwn(payload, 'confirmEnded') && typeof payload.confirmEnded !== 'boolean')) return json(400, { error: 'Expected a ticket identifier, optional note and documented preview/confirmation fields.' });
          const result = review ? await queue.reviewClarification(payload.ticket, payload.note) : pathname === '/api/clarification-message' ? await queue.copyClarification(payload.ticket, payload) : release ? await queue.releaseClarification(payload.ticket, payload) : await queue.enqueueClarification(payload.ticket, payload);
          return json(result.code, result);
        }
        if (pathname.startsWith('/api/component-')) {
          const review = pathname === '/api/component-plan';
          const fields = review ? ['ticket'] : ['ticket', 'reviewToken', 'confirmExternal', 'confirmPaused'];
          if (!payload || Array.isArray(payload) || typeof payload.ticket !== 'string' || Object.keys(payload).some((key) => !fields.includes(key)) || (!review && (typeof payload.reviewToken !== 'string' || !/^[a-f\d]{64}$/.test(payload.reviewToken))) || ['confirmExternal', 'confirmPaused'].some((key) => Object.hasOwn(payload, key) && typeof payload[key] !== 'boolean')) return json(400, { error: 'Expected a ticket identifier and only the documented review/confirmation fields.' });
          const result = review ? await queue.reviewComponent(payload.ticket) : pathname === '/api/component-message' ? await queue.copyComponent(payload.ticket, payload) : await queue.enqueueComponent(payload.ticket, payload);
          return json(result.code, result);
        }
        if (!payload || Object.keys(payload).length !== 1 || typeof payload.ticket !== 'string') return json(400, { error: 'Only a ticket identifier is accepted.' });
        const result = pathname === '/api/queue' ? await queue.enqueue(payload.ticket) : await queue.copyMessage(payload.ticket);
        return json(result.code, result);
      } catch (error) { return json(400, { error: `Could not process request: ${error.message}` }); }
    }
    if (pathname === '/control/stop' && request.method === 'POST') {
      const supplied = Buffer.from(String(request.headers['x-viewer-token'] ?? ''));
      const expected = Buffer.from(controlToken);
      if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(403, { error: 'Invalid server control token.' });
      json(200, { stopped: true });
      setImmediate(async () => {
        try {
          if (registryFile) {
            const registration = JSON.parse(await readFile(registryFile, 'utf8'));
            if (registration.pid === process.pid && registration.repo === root && registration.token === controlToken) await unlink(registryFile);
          }
        } catch (error) { if (error.code !== 'ENOENT') console.error(`Could not clear viewer registration: ${error.message}`); }
        server.close(); server.closeAllConnections();
      });
      return;
    }
    if (request.method !== 'GET') return json(405, { error: 'This viewer is read-only.' });
    try {
      if (pathname === '/api/health') return json(200, { app: 'tripi-tropi', protocolVersion: 1, skillVersion, repo: root, pid: process.pid, thread: queue.info().thread });
      if (pathname === '/api/snapshot') return json(200, stream.snapshot());
      if (pathname === '/api/queue') { await queue.refreshThreadName(); return json(200, queue.info()); }
      if (pathname === '/api/sessions') return json(200, { sessions: await queue.listSessions() });
      if (pathname === '/api/events') return stream.subscribe(response);
      const resource = staticFiles.get(pathname);
      if (!resource) return json(404, { error: 'Resource not found.' });
      let content = await readFile(path.join(skillRoot, resource[0]));
      if (pathname === '/') content = Buffer.from(content.toString().replace('>version</span>', `>v${skillVersion}</span>`).replace('data-control-token="__VIEWER_TOKEN__"', `data-control-token="${controlToken}"`));
      response.writeHead(200, { 'Content-Type': `${resource[1]}; charset=utf-8` });
      response.end(content);
    } catch (error) { json(500, { error: error.message }); }
  });
  server.once('close', () => { stream.close().catch((error) => console.error(error.message)); });
  try { await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  }); } catch (error) { await stream.close(); throw error; }
  return { server, repo: root, url: `http://127.0.0.1:${server.address().port}` };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const viewer = await createViewer({ repo: process.env.TRIPI_TROPI_REPO, port: Number(process.env.TRIPI_TROPI_PORT ?? 0), controlToken: process.env.TRIPI_TROPI_TOKEN, thread: process.env.TRIPI_TROPI_THREAD ?? '', registryFile: process.env.TRIPI_TROPI_REGISTRY ?? '' });
    if (process.send) process.send({ ready: true, url: viewer.url, repo: viewer.repo });
    console.log(`tripi-tropi listening at ${viewer.url}`);
    process.on('SIGTERM', () => { viewer.server.close(); viewer.server.closeAllConnections(); });
    process.on('SIGINT', () => { viewer.server.close(); viewer.server.closeAllConnections(); });
  } catch (error) { console.error(error.message); if (process.send) process.send({ error: error.message }); process.exitCode = 1; }
}
