import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from 'node:http';
import { once } from 'node:events';
import { fetchWithTimeout } from "../lib/fetch-with-timeout.js";

test("fetchWithTimeout aborts slow external requests instead of hanging the process", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return new Response("ok");
  }) as typeof fetch;

  try {
    await assert.rejects(
      () => fetchWithTimeout("https://example.com", { method: "GET" }, 10),
      /timed out after 10ms/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('provider deadline includes stalled bodies and completed JSON remains readable', async () => {
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/stall') { res.write('{"pending":'); return; }
    if (req.url === '/oversized') { res.end('x'.repeat(2 * 1024 * 1024 + 1)); return; }
    res.end('{"ok":true}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetchWithTimeout(base, undefined, 2000);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(await response.json(), { ok: true });
    await assert.rejects(fetchWithTimeout(`${base}/stall`, undefined, 50), /timed out after 50ms/);
    await assert.rejects(fetchWithTimeout(`${base}/oversized`, undefined, 2000), /exceeds 2 MiB/);
    const signal = AbortSignal.abort(new Error('Caller cancelled'));
    await assert.rejects(fetchWithTimeout(base, { signal }, 2000), /Caller cancelled/);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
