import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { verifyPrivateChat } from '../ops/private-chat-smoke.mjs';

const rejection = JSON.stringify({ success: false, message: 'Authentication required', data: null });
async function endpoint(t, reply = (_request, response) => response.end(rejection)) {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ path: request.url, method: request.method, authorization: request.headers.authorization, cookie: request.headers.cookie });
    response.statusCode = 401;
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Cache-Control', 'no-store');
    reply(request, response);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { baseUrl: `http://127.0.0.1:${server.address().port}`, requests };
}

test('private-chat smoke checks both API mounts using only unauthenticated reads', async t => {
  const { baseUrl, requests } = await endpoint(t);
  assert.deepEqual(await verifyPrivateChat({ baseUrl }), { protectedRoutes: 4, noStore: true });
  assert.deepEqual(requests.map(request => request.path), [
    '/api/private-messages/identity', '/api/private-messages/threads',
    '/api/v1/private-messages/identity', '/api/v1/private-messages/threads',
  ]);
  for (const request of requests) {
    assert.equal(request.method, 'GET');
    assert.equal(request.authorization, undefined);
    assert.equal(request.cookie, undefined);
  }
});

test('private-chat smoke rejects stale routes, HTML fallbacks and login redirects', async t => {
  for (const status of [200, 302, 404, 500]) {
    const { baseUrl } = await endpoint(t, (request, response) => {
      if (!request.url.startsWith('/api/v1/')) return response.end(rejection);
      response.writeHead(status, { 'Content-Type': 'text/html', Location: '/login' });
      response.end('<div id="root"></div>');
    });
    await assert.rejects(verifyPrivateChat({ baseUrl }));
  }
});

test('private-chat smoke rejects cacheable or malformed authentication responses', async t => {
  const badResponses = [
    response => { response.writeHead(401, { 'Cache-Control': 'public, max-age=3600' }); response.end(rejection); },
    response => response.end('not JSON'),
    response => response.end(JSON.stringify({ success: true, message: 'Authentication required', data: null })),
    response => response.end(JSON.stringify({ success: false, message: 'Authentication required', data: { ciphertext: 'unexpected data' } })),
    response => response.end(' '.repeat(8193)),
  ];
  for (const reply of badResponses) {
    const { baseUrl } = await endpoint(t, (_request, response) => reply(response));
    await assert.rejects(verifyPrivateChat({ baseUrl }));
  }
});

test('private-chat smoke bounds stalled endpoints and rejects credential-bearing URLs', async t => {
  const { baseUrl } = await endpoint(t, () => {});
  await assert.rejects(verifyPrivateChat({ baseUrl, timeoutMs: 50 }), { name: 'TimeoutError' });
  await assert.rejects(verifyPrivateChat({ baseUrl: 'https://user:secret@example.test' }), /without credentials/);
});
