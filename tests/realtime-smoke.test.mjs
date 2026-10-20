import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import test from 'node:test';
import { verifyRealtime } from '../ops/realtime-smoke.mjs';

const apiRequire = createRequire(new URL('../api-server/package.json', import.meta.url));
const { Server } = apiRequire('socket.io');
const browserOrigin = 'https://ci.example';

async function transport(t, { rejectOrigin = true, rejectAuthentication = true } = {}) {
  const http = createServer();
  const io = new Server(http, {
    allowRequest: (request, callback) => callback(null, !rejectOrigin || request.headers.origin === browserOrigin),
    cors: { origin: browserOrigin },
  });
  if (rejectAuthentication) io.use((_socket, next) => next(new Error('Authentication error')));
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => io.close(resolve)));
  return `http://127.0.0.1:${http.address().port}`;
}

test('realtime smoke exercises actual Engine.IO polling and rejected Socket.IO authentication', async t => {
  const baseUrl = await transport(t);
  assert.deepEqual(await verifyRealtime({ baseUrl, browserOrigin }), {
    polling: true, originRejection: true, unauthenticatedRejection: true,
  });
});

test('realtime smoke fails when an endpoint accepts an untrusted browser origin', async t => {
  const baseUrl = await transport(t, { rejectOrigin: false });
  await assert.rejects(verifyRealtime({ baseUrl, browserOrigin }), /reject an untrusted browser origin/);
});

test('realtime smoke fails when the namespace allows an unauthenticated connection', async t => {
  const baseUrl = await transport(t, { rejectAuthentication: false });
  await assert.rejects(verifyRealtime({ baseUrl, browserOrigin }), /reject an unauthenticated connection/);
});

test('realtime smoke rejects an HTML fallback even when it rejects hostile origins', async t => {
  const http = createServer((req, res) => {
    if (req.headers.origin !== browserOrigin) { res.writeHead(403).end(); return; }
    res.writeHead(200, { 'Access-Control-Allow-Origin': browserOrigin, 'Content-Type': 'text/html' }).end('<div id="root"></div>');
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => http.close(resolve)));
  await assert.rejects(verifyRealtime({ baseUrl: `http://127.0.0.1:${http.address().port}`, browserOrigin }), /Engine.IO open packet/);
});
