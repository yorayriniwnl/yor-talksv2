import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import { trustedProxySetting } from '../lib/trusted-proxy.js';

async function identify(setting: string, forwarded: string) {
  const app = express();
  app.set('trust proxy', trustedProxySetting(setting));
  app.get('/', (req, res) => res.json({ ip: req.ip }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    return (await (await fetch(`http://127.0.0.1:${address.port}`, { headers: { 'X-Forwarded-For': forwarded } })).json() as { ip: string }).ip;
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

test('explicit trusted ingress networks preserve two distinct clients across two hops and ignore spoofed prefix', async () => {
  const policy = '127.0.0.1/32,10.10.0.0/16';
  assert.equal(await identify(policy, '192.0.2.201,198.51.100.1,10.10.0.2'), '198.51.100.1');
  assert.equal(await identify(policy, '192.0.2.201,198.51.100.2,10.10.0.2'), '198.51.100.2');
  assert.equal(await identify(policy, '198.51.100.1,203.0.113.7'), '203.0.113.7', 'untrusted intermediate stops the chain');
  assert.equal(await identify('10.10.0.0/16', '198.51.100.1,10.10.0.2'), '127.0.0.1', 'untrusted socket cannot supply client identity');
});

test('empty proxy policy preserves single-hop behavior and unsafe policies fail closed', async () => {
  assert.equal(await identify('', '198.51.100.1,10.10.0.2'), '10.10.0.2');
  for (const value of ['true', '*', 'loopback', '0.0.0.0/0', '::/0', '127.0.0.1/33', '::1/129', '127.0.0.1/', '127.0.0.1,,10.0.0.1']) {
    assert.throws(() => trustedProxySetting(value));
  }
  assert.deepEqual(trustedProxySetting('::1/128,127.0.0.1/32'), ['::1/128', '127.0.0.1/32']);
});
