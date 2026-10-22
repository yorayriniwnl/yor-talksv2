import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { build } from 'esbuild';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { createMessage, decrypt, encrypt, generateKey, readMessage } from 'openpgp';
import { env } from '../config/env.js';
import { closeAuthenticationDependencies } from '../middlewares/auth.js';
import { createPrivateMessagesRouter } from '../routes/private-messages.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { ContactAuthorizationService } from '../services/contact-authorization-service.js';
import { AIService } from '../services/ai-service.js';
import { createTestUser, createVerifiedAdultTestUser } from './test-helpers.js';

const { verifyPrivateChat } = await import(new URL('../../../ops/private-chat-smoke.mjs', import.meta.url).href);
const app = express();
app.use(express.json({ limit: '2300kb' }));
app.use('/api', createPrivateMessagesRouter());
app.use('/api/v1', createPrivateMessagesRouter());
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address(); assert.ok(address && typeof address !== 'string');
const base = `http://127.0.0.1:${address.port}`;
const redis = new RedisRepository();
const userIds: string[] = [], sessionKeys: string[] = [];
after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (userIds.length) await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [userIds]);
  for (const key of sessionKeys) await redis.del(key);
  await redis.disconnect(); await closeAuthenticationDependencies(); await pool.end();
});

async function actor(activated = true) {
  const user = await (activated ? createVerifiedAdultTestUser : createTestUser)(new UserRepository()); userIds.push(user.id);
  const deviceId = randomUUID(), key = `session:${user.id}:${deviceId}`; sessionKeys.push(key);
  await redis.setStrict(key, 'active', 300);
  const token = jwt.sign({ sub: user.id, deviceId, authVersion: user.authVersion ?? 0 }, env.JWT_SECRET, { expiresIn: '5m' });
  const keys = await generateKey({ type: 'curve25519', userIDs: [{ name: `yor:${user.id}` }], format: 'object', config: { v6Keys: true } });
  return { user, ...keys, sessionKey: key, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
}

test('HTTP identity endpoints require current messaging authority and never accept secret or arbitrary fields', async () => {
  assert.deepEqual(await verifyPrivateChat({ baseUrl: base }), { protectedRoutes: 4, noStore: true });
  const restricted = await actor(false);
  assert.equal((await fetch(`${base}/api/private-messages/identity`, { headers: restricted.headers })).status, 403);
  const owner = await actor();
  const sentinel = `never-echo-private-material-${randomUUID()}`;
  for (const input of [
    { publicKey: owner.privateKey.armor(), fingerprint: owner.publicKey.getFingerprint() },
    { publicKey: owner.publicKey.armor(), fingerprint: owner.publicKey.getFingerprint(), privateKey: sentinel },
    { publicKey: owner.publicKey.armor(), fingerprint: owner.publicKey.getFingerprint(), [sentinel]: true },
  ]) {
    const response = await fetch(`${base}/api/private-messages/identity`, { method: 'PUT', headers: owner.headers, body: JSON.stringify(input) });
    assert.equal(response.status, 400);
    assert.equal((await response.text()).includes(sentinel), false);
  }
  const response = await fetch(`${base}/api/v1/private-messages/identity`, {
    method: 'PUT', headers: owner.headers, body: JSON.stringify({ publicKey: owner.publicKey.armor(), fingerprint: owner.publicKey.getFingerprint() }),
  });
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  await redis.del(owner.sessionKey);
  assert.equal((await fetch(`${base}/api/private-messages/identity`, { headers: owner.headers })).status, 401);
});

test('real HTTP relay accepts encrypted bodies only, makes no AI request, and recipients verify decrypted content', async t => {
  const a = await actor(), b = await actor(), stranger = await actor();
  const contacts = new ContactAuthorizationService(), contact = await contacts.requestContact(a.user.id, b.user.id);
  await contacts.acceptContact(contact.id, b.user.id);
  for (const member of [a, b]) {
    const response = await fetch(`${base}/api/private-messages/identity`, {
      method: 'PUT', headers: member.headers, body: JSON.stringify({ publicKey: member.publicKey.armor(), fingerprint: member.publicKey.getFingerprint() }),
    });
    assert.equal(response.status, 200);
  }
  const threadResponse = await fetch(`${base}/api/private-messages/threads`, { method: 'POST', headers: a.headers, body: JSON.stringify({ recipientId: b.user.id }) });
  assert.equal(threadResponse.status, 201);
  const { data: { thread } } = await threadResponse.json() as { data: { thread: { id: string } } };
  const url = `${base}/api/private-messages/threads/${thread.id}/messages`, sentinel = `private-text-${randomUUID()}`;
  const plain = await fetch(url, { method: 'POST', headers: a.headers, body: JSON.stringify({ id: randomUUID(), content: sentinel }) });
  assert.equal(plain.status, 400); assert.equal((await plain.text()).includes(sentinel), false);
  assert.equal((await fetch(url, { headers: stranger.headers })).status, 404);

  const moderate = t.mock.method(AIService.prototype, 'moderate', async () => { throw new Error('Encrypted chat must not invoke AI'); });
  const originalFetch = globalThis.fetch;
  const externalRequests: string[] = [];
  t.mock.method(globalThis, 'fetch', ((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== base) { externalRequests.push(url.origin); throw new Error('External processing is forbidden'); }
    return originalFetch(input, init);
  }) as typeof fetch);
  const ciphertext = await encrypt({
    message: await createMessage({ text: sentinel }), encryptionKeys: [a.publicKey, b.publicKey], signingKeys: a.privateKey, format: 'armored',
  });
  const id = randomUUID();
  const sent = await fetch(url, { method: 'POST', headers: a.headers, body: JSON.stringify({ id, ciphertext }) });
  assert.equal(sent.status, 201); assert.equal((await sent.text()).includes(sentinel), false);
  const received = await fetch(url, { headers: b.headers });
  const page = await received.json() as { data: { items: Array<{ id: string; ciphertext: string }> } };
  assert.deepEqual(page.data.items.map(message => message.id), [id]);
  const opened = await decrypt({ message: await readMessage({ armoredMessage: page.data.items[0].ciphertext }),
    decryptionKeys: b.privateKey, verificationKeys: a.publicKey, expectSigned: true, format: 'utf8' });
  assert.equal(opened.data, sentinel); await opened.signatures[0].verified;
  assert.equal(moderate.mock.callCount(), 0); assert.deepEqual(externalRequests, []);
});

test('the browser crypto implementation delivers a maximum-size file through HTTP and PostgreSQL', async t => {
  // Bundle the actual browser entry point, including its OpenPGP browser build.
  // This catches format/size mismatches that isolated UI and API fixtures miss.
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL('../../../social/src/lib/private-chat-crypto.ts', import.meta.url))],
    bundle: true, write: false, platform: 'browser', format: 'esm', target: 'es2022',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const crypto = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
  const a = await actor(), b = await actor();
  const passphrase = 'isolated-violet-lantern-recovery-92';
  const backups = await Promise.all([a, b].map(member => crypto.generateIdentity(member.user.id, passphrase)));
  const identities = await Promise.all(backups.map(backup => crypto.unlockIdentity(backup.userId, backup, passphrase)));
  t.after(() => identities.forEach(identity => crypto.lockIdentity(identity)));
  for (const [index, member] of [a, b].entries()) {
    const response = await fetch(`${base}/api/private-messages/identity`, {
      method: 'PUT', headers: member.headers,
      body: JSON.stringify({ publicKey: backups[index].publicKey, fingerprint: backups[index].fingerprint }),
    });
    assert.equal(response.status, 200);
  }
  const contacts = new ContactAuthorizationService();
  const connection = await contacts.requestContact(a.user.id, b.user.id);
  await contacts.acceptContact(connection.id, b.user.id);
  const created = await fetch(`${base}/api/private-messages/threads`, {
    method: 'POST', headers: a.headers, body: JSON.stringify({ recipientId: b.user.id }),
  });
  assert.equal(created.status, 201);
  const { data: { thread, members } } = await created.json() as {
    data: { thread: { id: string; participantIds: string[] }; members: Array<{ userId: string; publicKey: string; fingerprint: string }> };
  };
  const context = { id: randomUUID(), threadId: thread.id, senderId: a.user.id, recipientIds: [...thread.participantIds].sort() };
  const payload = {
    text: `browser-private-sentinel-${randomUUID()}`,
    attachment: { name: 'private-maximum-file.bin', type: 'application/octet-stream',
      dataBase64: randomBytes(crypto.MAX_PRIVATE_ATTACHMENT_BYTES).toString('base64') },
  };
  const ciphertext = await crypto.sealMessage(identities[0], context, members, payload);
  const body = JSON.stringify({ id: context.id, ciphertext });
  for (const secret of [payload.text, payload.attachment.name, payload.attachment.dataBase64, passphrase, 'PRIVATE KEY BLOCK']) {
    assert.equal(body.includes(secret), false);
  }
  const url = `${base}/api/private-messages/threads/${thread.id}/messages`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(url, { method: 'POST', headers: a.headers, body });
    assert.equal(response.status, 201);
  }
  const response = await fetch(url, { headers: b.headers });
  assert.equal(response.status, 200);
  const { data: page } = await response.json() as {
    data: { items: Array<{ id: string; threadId: string; senderId: string; ciphertext: string }> };
  };
  assert.equal(page.items.length, 1);
  const stored = await pool.query('SELECT ciphertext FROM private_chat_envelopes WHERE id=$1', [context.id]);
  assert.equal(stored.rows[0].ciphertext, ciphertext);
  const received = page.items[0];
  const actualContext = { id: received.id, threadId: received.threadId, senderId: received.senderId, recipientIds: context.recipientIds };
  const sender = members.find(member => member.userId === a.user.id);
  for (const identity of identities) {
    assert.deepEqual(await crypto.openMessage(identity, actualContext, sender, received.ciphertext), payload);
  }
});
