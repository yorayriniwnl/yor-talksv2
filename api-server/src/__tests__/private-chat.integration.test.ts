import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { createMessage, encrypt, generateKey } from 'openpgp';
import { ContactAuthorizationService } from '../services/contact-authorization-service.js';
import { PrivateChatService } from '../services/private-chat-service.js';
import { PrivateChatError } from '../services/private-chat-validation.js';
import { UserRepository } from '../repositories/user-repository.js';
import { createVerifiedAdultTestUser } from './test-helpers.js';
import { assertPrivateChatSchema } from '../services/private-chat-readiness.js';

after(() => pool.end());
const isStatus = (status: number) => (error: unknown) => error instanceof PrivateChatError && error.status === status;

test('the deployed schema is ready through the application database connection', async () => {
  await assertPrivateChatSchema();
});

async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const users = new UserRepository();
  const ids: string[] = [];
  t.after(async () => { await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [ids]); });
  const add = async () => {
    const user = await createVerifiedAdultTestUser(users); ids.push(user.id);
    const keys = await generateKey({ type: 'curve25519', userIDs: [{ name: `yor:${user.id}` }], format: 'object', config: { v6Keys: true } });
    return { user, ...keys };
  };
  const a = await add(), b = await add();
  const contacts = new ContactAuthorizationService();
  const contact = await contacts.requestContact(a.user.id, b.user.id);
  await contacts.acceptContact(contact.id, b.user.id);
  const service = new PrivateChatService(contacts, users);
  for (const member of [a, b]) await service.enrollIdentity(member.user.id, member.publicKey.armor(), member.publicKey.getFingerprint());
  const { thread } = await service.createThread(a.user.id, b.user.id);
  const cipher = (text: string) => createMessage({ text }).then(message => encrypt({
    message, encryptionKeys: [a.publicKey, b.publicKey], signingKeys: a.privateKey, format: 'armored',
  }));
  return { a, b, add, contacts, contact, service, thread, cipher, users };
}

test('relay stores opaque messages, deduplicates exact retries and refuses ID reuse with different content or sender', async t => {
  const f = await fixture(t);
  const id = randomUUID(), sentinel = `private-content-${randomUUID()}`, ciphertext = await f.cipher(sentinel);
  const first = await f.service.sendMessage(f.a.user.id, f.thread.id, id, ciphertext);
  assert.deepEqual(await f.service.sendMessage(f.a.user.id, f.thread.id, id, ciphertext), first);
  await assert.rejects(f.service.sendMessage(f.b.user.id, f.thread.id, id, ciphertext), isStatus(409));
  await assert.rejects(f.service.sendMessage(f.a.user.id, f.thread.id, id, await f.cipher('a different envelope')), isStatus(409));
  const stored = await pool.query('SELECT * FROM private_chat_envelopes WHERE id=$1', [id]);
  assert.equal(stored.rowCount, 1);
  assert.equal(JSON.stringify(stored.rows).includes(sentinel), false);
  assert.equal(stored.rows[0].ciphertext, ciphertext);
  assert.deepEqual((await f.service.listMessages(f.b.user.id, f.thread.id)).items.map(message => message.id), [id]);
});

test('identity is immutable and direct pair creation deduplicates opposite requests', async t => {
  const f = await fixture(t);
  const existing = await f.service.getIdentity(f.a.user.id);
  assert.equal((await f.service.enrollIdentity(f.a.user.id, f.a.publicKey.armor(), f.a.publicKey.getFingerprint())).fingerprint, existing!.fingerprint);
  const replacement = await generateKey({ type: 'curve25519', userIDs: [{ name: `yor:${f.a.user.id}` }], format: 'object', config: { v6Keys: true } });
  await assert.rejects(f.service.enrollIdentity(f.a.user.id, replacement.publicKey.armor(), replacement.publicKey.getFingerprint()), isStatus(409));
  const threads = await Promise.all([f.service.createThread(f.a.user.id, f.b.user.id), f.service.createThread(f.b.user.id, f.a.user.id)]);
  assert.deepEqual(threads.map(value => value.thread.id), [f.thread.id, f.thread.id]);
  assert.deepEqual(threads[0].members.map(member => member.userId).sort(), [f.a.user.id, f.b.user.id].sort());
});

test('a valid envelope addressed to an outsider cannot be relayed in a participant thread', async t => {
  const f = await fixture(t), outsider = await f.add();
  const ciphertext = await encrypt({
    message: await createMessage({ text: 'wrong recipients' }),
    encryptionKeys: [f.a.publicKey, outsider.publicKey], signingKeys: f.a.privateKey, format: 'armored',
  });
  const id = randomUUID();
  await assert.rejects(f.service.sendMessage(f.a.user.id, f.thread.id, id, ciphertext), isStatus(400));
  assert.equal((await pool.query('SELECT 1 FROM private_chat_envelopes WHERE id=$1', [id])).rowCount, 0);
});

test('strangers cannot read and contact withdrawal blocks history, identity lookup and subsequent sends', async t => {
  const f = await fixture(t), stranger = await f.add();
  await f.service.sendMessage(f.a.user.id, f.thread.id, randomUUID(), await f.cipher('before withdrawal'));
  await assert.rejects(f.service.getThread(stranger.user.id, f.thread.id), isStatus(404));
  await assert.rejects(f.service.listMessages(stranger.user.id, f.thread.id), isStatus(404));
  await f.contacts.withdrawContact(f.contact.id, f.b.user.id);
  assert.deepEqual(await f.service.listThreads(f.a.user.id), { items: [] });
  await assert.rejects(f.service.getThread(f.a.user.id, f.thread.id), isStatus(403));
  await assert.rejects(f.service.listMessages(f.a.user.id, f.thread.id), isStatus(403));
  await assert.rejects(f.service.sendMessage(f.a.user.id, f.thread.id, randomUUID(), await f.cipher('after withdrawal')), isStatus(403));
});

test('blocked and follower-restricted participants cannot receive history or a new envelope', async t => {
  const f = await fixture(t);
  await f.users.patchPrivacy(f.b.user.id, { allowDmFromStrangers: false });
  await assert.rejects(f.service.listMessages(f.a.user.id, f.thread.id), isStatus(403));
  await assert.rejects(f.service.sendMessage(f.a.user.id, f.thread.id, randomUUID(), await f.cipher('follower restriction')), isStatus(403));
  await f.users.followUser(f.a.user.id, f.b.user.id);
  assert.equal((await f.service.getThread(f.a.user.id, f.thread.id)).thread.id, f.thread.id);
  await f.contacts.blockPair(f.b.user.id, f.a.user.id);
  await assert.rejects(f.service.listMessages(f.a.user.id, f.thread.id), isStatus(403));
  await assert.rejects(f.service.sendMessage(f.a.user.id, f.thread.id, randomUUID(), await f.cipher('blocked')), isStatus(403));
});

test('append-only pages retain every concurrent envelope and bind the cursor to the thread', async t => {
  const f = await fixture(t);
  const ciphertext = await f.cipher('concurrent encrypted messages');
  const ids = Array.from({ length: 4 }, () => randomUUID());
  await Promise.all(ids.map(id => f.service.sendMessage(f.a.user.id, f.thread.id, id, ciphertext)));
  const page1 = await f.service.listMessages(f.b.user.id, f.thread.id, undefined, 2);
  assert.equal(page1.items.length, 2); assert.equal(page1.hasMore, true);
  const page2 = await f.service.listMessages(f.b.user.id, f.thread.id, page1.nextCursor!, 2);
  assert.equal(page2.items.length, 2); assert.equal(page2.hasMore, false);
  assert.deepEqual([...page1.items, ...page2.items].map(message => message.id).sort(), ids.sort());
  const empty = await f.service.listMessages(f.b.user.id, f.thread.id, page2.nextCursor!, 2);
  assert.deepEqual(empty, { items: [], nextCursor: page2.nextCursor, hasMore: false });
  await assert.rejects(f.service.listMessages(f.b.user.id, randomUUID(), page1.nextCursor!), isStatus(400));
  const next = await f.service.sendMessage(f.b.user.id, f.thread.id, randomUUID(), ciphertext);
  assert.deepEqual((await f.service.listMessages(f.a.user.id, f.thread.id, page2.nextCursor!)).items.map(message => message.id), [next.id]);
});

test('large encrypted pages obey the payload budget and retain a continuation cursor', async t => {
  const f = await fixture(t);
  const ciphertext = await f.cipher('x'.repeat(1_100_000));
  assert.ok(Buffer.byteLength(ciphertext) > 1_400_000);
  for (let index = 0; index < 3; index++) {
    await f.service.sendMessage(f.a.user.id, f.thread.id, randomUUID(), ciphertext);
  }
  const first = await f.service.listMessages(f.b.user.id, f.thread.id, undefined, 10);
  assert.equal(first.items.length, 2);
  assert.equal(first.hasMore, true);
  assert.ok(first.items.reduce((sum, item) => sum + Buffer.byteLength(item.ciphertext), 0) <= 4 * 1024 * 1024);
  const second = await f.service.listMessages(f.b.user.id, f.thread.id, first.nextCursor!, 10);
  assert.equal(second.items.length, 1);
  assert.equal(second.hasMore, false);
  assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 3);
});

test('database constraints reject membership forgery, key/message mutation and cascade an erased account', async t => {
  const f = await fixture(t), stranger = await f.add();
  const ciphertext = await f.cipher('opaque constrained body');
  const envelope = await f.service.sendMessage(f.a.user.id, f.thread.id, randomUUID(), ciphertext);
  const integrityViolation = (error: any) => error?.code === '23514';
  await assert.rejects(pool.query('INSERT INTO private_chat_envelopes(id,thread_id,sender_id,ciphertext) VALUES($1,$2,$3,$4)',
    [randomUUID(), f.thread.id, stranger.user.id, ciphertext]), integrityViolation);
  await assert.rejects(pool.query('UPDATE private_chat_envelopes SET ciphertext=$2 WHERE id=$1', [envelope.id, ciphertext]), integrityViolation);
  await assert.rejects(pool.query('UPDATE private_chat_identities SET fingerprint=fingerprint WHERE user_id=$1', [f.a.user.id]), integrityViolation);
  await assert.rejects(pool.query('UPDATE private_chat_threads SET user_a_id=user_b_id WHERE id=$1', [f.thread.id]), integrityViolation);
  await pool.query('DELETE FROM users WHERE id=$1', [f.a.user.id]);
  assert.equal((await pool.query('SELECT 1 FROM private_chat_identities WHERE user_id=$1', [f.a.user.id])).rowCount, 0);
  assert.equal((await pool.query('SELECT 1 FROM private_chat_threads WHERE id=$1', [f.thread.id])).rowCount, 0);
  assert.equal((await pool.query('SELECT 1 FROM private_chat_envelopes WHERE id=$1', [envelope.id])).rowCount, 0);
});
