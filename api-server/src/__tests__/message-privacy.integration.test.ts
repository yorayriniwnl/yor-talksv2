import assert from 'node:assert/strict';
import { after, before, test, type TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import { pool } from '@workspace/db';
import { AccountService } from '../services/account-service.js';
import { MessageService } from '../services/message-service.js';
import { ConversationRepository, MessageRepository, isMessageAvailable } from '../repositories/message-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import type { RedisRepository } from '../repositories/redis-repository.js';
import { createTestUser } from './test-helpers.js';

const { Client } = createRequire(import.meta.resolve('@workspace/db'))('pg') as typeof import('pg');
const users = new UserRepository(), conversations = new ConversationRepository(), messages = new MessageRepository();
const redis = { keys: async () => [], del: async () => undefined } as unknown as RedisRepository;
const password = 'Synthetic-message-privacy-password';
const userIds: string[] = [];
before(async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.ok(process.env.DATABASE_URL);
  const url = new URL(process.env.DATABASE_URL!);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Only an explicitly configured loopback test database is allowed');
  const identity = (await pool.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
  assert.equal(identity.database, decodeURIComponent(url.pathname.slice(1)));
  assert.equal(identity.port, Number(url.port || 5432));
});
after(async () => {
  await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [userIds]);
  await pool.query('DELETE FROM background_jobs WHERE dedup_key=ANY($1::text[])', [userIds.map(id => `account:${id}`)]);
  await pool.query('DELETE FROM media_cleanup_holds WHERE deletion_id=ANY($1::uuid[])', [userIds]);
  await pool.end();
});
async function person() {
  const user = await createTestUser(users, { passwordHash: await bcrypt.hash(password, 4) });
  userIds.push(user.id);
  return user;
}
async function insertMessage(conversationId: string, senderId: string, recipientId: string, content: string) {
  const id = randomUUID();
  await pool.query('INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content) VALUES($1,$2,$3,$4,$5)',
    [id, conversationId, senderId, recipientId, content]);
  return id;
}
function service(repository = messages) {
  return new MessageService(conversations, repository, undefined, undefined, { hasFeature: async () => true } as never);
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}
async function waitFor(check: () => Promise<boolean>) {
  const until = Date.now() + 5000;
  while (!(await check())) {
    assert.ok(Date.now() < until, 'Timed out waiting for the controlled database race');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

test('UTC expiry checks reject missing-timezone expired timestamps independently of process timezone', () => {
  assert.equal(isMessageAvailable({ expiresAt: '2026-01-01 00:00:00', deletedAt: null }, Date.parse('2026-01-01T00:00:01Z')), false);
  assert.equal(isMessageAvailable({ expiresAt: '2026-01-01 00:00:00', deletedAt: null }, Date.parse('2025-12-31T23:59:59Z')), true);
});

for (const deletionRole of ['creator', 'legacy recipient'] as const) {
  test(`account deletion preserves surviving group contributions when the ${deletionRole} leaves`, async () => {
    const creator = await person(), first = await person(), second = await person();
    const group = await conversations.createGroupChat(creator.id, [first.id, second.id], 'Shared synthetic history');
    const deleted = deletionRole === 'creator' ? creator : first;
    const survivor = deletionRole === 'creator' ? first : creator;
    const own = await insertMessage(group.id, deleted.id, second.id, 'Erase this authored body');
    const peer = await insertMessage(group.id, survivor.id, deleted.id, 'Keep this surviving contribution');
    await pool.query('UPDATE messages SET reply_to_id=$1,reactions=$2::jsonb WHERE id=$3',
      [own, JSON.stringify({ heart: [deleted.id, survivor.id], onlyDeleted: [deleted.id] }), peer]);
    assert.equal(await new AccountService(users, redis).deleteAccount(deleted.id, password), true);
    const retained = await conversations.findById(group.id);
    assert.ok(retained);
    assert.ok(!(await conversations.getMembers(group.id)).includes(deleted.id));
    assert.ok(!retained.participantIds?.includes(deleted.id));
    const rows = (await pool.query('SELECT * FROM messages WHERE id=ANY($1::uuid[])', [[own, peer]])).rows;
    const authored = rows.find(row => row.id === own), contributed = rows.find(row => row.id === peer);
    assert.equal(authored.content, ''); assert.equal(authored.sender_id, null); assert.ok(authored.deleted_at);
    assert.equal(authored.media_id, null); assert.equal(authored.media_url, null);
    assert.equal(contributed.content, 'Keep this surviving contribution');
    assert.equal(contributed.recipient_id, null); assert.equal(contributed.reply_to_id, own);
    assert.deepEqual(contributed.reactions, { heart: [survivor.id] });
    assert.doesNotMatch(JSON.stringify(retained), new RegExp(deleted.id));
    assert.deepEqual((await service().listConversation(group.id, survivor.id)).map(row => row.id), [peer]);
  });
}

test('a surviving direct participant keeps their contribution and the last participant removes the empty thread', async () => {
  const owner = await person(), survivor = await person();
  const direct = await conversations.findOrCreateDirect(owner.id, survivor.id);
  const peer = await insertMessage(direct.id, survivor.id, owner.id, 'Surviving direct contribution');
  await new AccountService(users, redis).deleteAccount(owner.id, password);
  assert.ok(await conversations.findById(direct.id));
  assert.equal((await messages.findById(peer))?.content, 'Surviving direct contribution');
  await new AccountService(users, redis).deleteAccount(survivor.id, password);
  assert.equal(await conversations.findById(direct.id), undefined);
});

test('account export excludes expired/deleted messages and revalidates while other export queries wait', async () => {
  const owner = await person(), peer = await person();
  const conversation = await conversations.findOrCreateDirect(owner.id, peer.id);
  const expired = await insertMessage(conversation.id, peer.id, owner.id, 'Never export expired body');
  const deleted = await insertMessage(conversation.id, owner.id, peer.id, 'Never export deleted body');
  const racing = await insertMessage(conversation.id, peer.id, owner.id, 'Do not export a stale snapshot');
  const retained = await insertMessage(conversation.id, owner.id, peer.id, 'Live exported contribution');
  await pool.query("UPDATE messages SET expires_at=timezone('UTC',clock_timestamp())-interval '1 second' WHERE id=$1", [expired]);
  await pool.query("UPDATE messages SET deleted_at=timezone('UTC',clock_timestamp()) WHERE id=$1", [deleted]);
  const blocker = new Client({ connectionString: process.env.DATABASE_URL }); await blocker.connect();
  try {
    await blocker.query('BEGIN'); await blocker.query('LOCK TABLE posts IN ACCESS EXCLUSIVE MODE');
    const exporting = new AccountService(users, redis).exportAccount(owner.id);
    await waitFor(async () => {
      const blocked = await pool.query("SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%from \"posts\"%'");
      return blocked.rowCount! > 0 && pool.waitingCount === 0 && pool.idleCount >= pool.totalCount - 1;
    });
    await pool.query("UPDATE messages SET deleted_at=timezone('UTC',clock_timestamp()) WHERE id=$1", [racing]);
    await blocker.query('COMMIT');
    const exported = await exporting;
    const content = exported?.content as { sentMessages: Array<{ id: string }>; receivedMessages: Array<{ id: string }> };
    assert.deepEqual([...content.sentMessages, ...content.receivedMessages].map(row => row.id), [retained]);
    assert.doesNotMatch(JSON.stringify(exported), /Never export|stale snapshot/);
  } finally { await blocker.query('ROLLBACK'); await blocker.end(); }
});

test('preview serialization cannot reopen a message read after the preliminary receipt check', async () => {
  const sender = await person(), recipient = await person();
  const conversation = await conversations.findOrCreateDirect(sender.id, recipient.id);
  const id = await insertMessage(conversation.id, sender.id, recipient.id, 'Unread preview race');
  const entered = gate(), resume = gate();
  class PausedRepository extends MessageRepository {
    override async recordPreview(messageId: string, userId: string, previewedAt: string) {
      entered.release(); await resume.promise;
      return super.recordPreview(messageId, userId, previewedAt);
    }
  }
  const preview = service(new PausedRepository()).previewMessage(id, recipient.id);
  await entered.promise;
  try { assert.ok(await service().markSeen(id, recipient.id)); } finally { resume.release(); }
  assert.equal(await preview, undefined);
  assert.equal((await pool.query('SELECT 1 FROM message_preview_events WHERE message_id=$1', [id])).rowCount, 0);
});

test('preview waiting for a competing deletion never records or returns the old body', async () => {
  const sender = await person(), recipient = await person();
  const conversation = await conversations.findOrCreateDirect(sender.id, recipient.id);
  const id = await insertMessage(conversation.id, sender.id, recipient.id, 'Preview deletion race');
  const entered = gate();
  class ObservedRepository extends MessageRepository {
    override async recordPreview(messageId: string, userId: string, previewedAt: string) {
      entered.release(); return super.recordPreview(messageId, userId, previewedAt);
    }
  }
  const blocker = new Client({ connectionString: process.env.DATABASE_URL }); await blocker.connect();
  try {
    await blocker.query('BEGIN');
    await blocker.query("UPDATE messages SET deleted_at=timezone('UTC',clock_timestamp()) WHERE id=$1", [id]);
    const preview = service(new ObservedRepository()).previewMessage(id, recipient.id);
    await entered.promise;
    await waitFor(async () => (await pool.query("SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%from \"messages\"%for update%'")).rowCount! > 0);
    await blocker.query('COMMIT');
    assert.equal(await preview, undefined);
    assert.equal((await pool.query('SELECT 1 FROM message_preview_events WHERE message_id=$1', [id])).rowCount, 0);
  } finally { await blocker.query('ROLLBACK'); await blocker.end(); }
});

test('concurrent same/different reaction additions preserve every distinct actor without duplicates', async () => {
  const sender = await person(), first = await person(), second = await person();
  const group = await conversations.createGroupChat(sender.id, [first.id, second.id], 'Concurrent reactions');
  const id = await insertMessage(group.id, sender.id, first.id, 'Concurrent reaction target');
  await Promise.all(Array.from({ length: 24 }, (_, i) => service().addReaction(id, i % 2 ? first.id : second.id, i % 3 ? 'heart' : 'like')));
  const current = await messages.findById(id);
  assert.deepEqual(new Set(current?.reactions?.heart), new Set([first.id, second.id]));
  assert.deepEqual(new Set(current?.reactions?.like), new Set([first.id, second.id]));
  assert.equal(current?.reactions?.heart?.length, 2); assert.equal(current?.reactions?.like?.length, 2);
});

test('legacy cascade loss is reproduced then an additive repeatable migration preserves peer history', async (t: TestContext) => {
  const client = new Client({ connectionString: process.env.DATABASE_URL }); await client.connect();
  const schema = `message_history_${randomUUID().replaceAll('-', '')}`;
  t.after(async () => { try { await client.query(`DROP SCHEMA "${schema}" CASCADE`); } finally { await client.end(); } });
  await client.query(`CREATE SCHEMA "${schema}"`); await client.query(`SET search_path TO "${schema}",public`);
  await client.query('CREATE TABLE users(id uuid PRIMARY KEY)');
  await client.query(`CREATE TABLE conversations(id uuid PRIMARY KEY,participant_a uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_b uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,participant_ids jsonb,is_group boolean)`);
  await client.query(`CREATE TABLE messages(id uuid PRIMARY KEY,conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text,media_id uuid,media_url text,media_type text,media_duration integer,media_legacy boolean,text_style_id text,
    reactions jsonb DEFAULT '{}',pinned boolean,edited_at timestamp,seen_at timestamp,expires_at timestamp,deleted_at timestamp,
    reply_to_id uuid REFERENCES messages(id),forwarded_from_id uuid REFERENCES messages(id))`);
  await client.query('CREATE TABLE conversation_members(conversation_id uuid,user_id uuid)');
  const owner = randomUUID(), survivor = randomUUID(), conversation = randomUUID(), message = randomUUID();
  await client.query('INSERT INTO users VALUES($1),($2)', [owner, survivor]);
  await client.query('INSERT INTO conversations VALUES($1,$2,$2,$3::jsonb,true)', [conversation, owner, JSON.stringify([owner, survivor])]);
  await client.query('INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content) VALUES($1,$2,$3,$4,$5)',
    [message, conversation, survivor, owner, 'Retain peer history']);
  await client.query('BEGIN'); await client.query('SAVEPOINT legacy_cascade');
  await client.query('DELETE FROM users WHERE id=$1', [owner]);
  assert.equal((await client.query('SELECT 1 FROM messages WHERE id=$1', [message])).rowCount, 0, 'Reproduces historical peer-history loss');
  await client.query('ROLLBACK TO SAVEPOINT legacy_cascade'); await client.query('COMMIT');
  const migrationUrl = new URL('../../../lib/db/scripts/migrate-messaging.mjs', import.meta.url).href;
  const { migrateMessaging } = await import(migrationUrl) as { migrateMessaging(client: import('pg').Client): Promise<void> };
  await migrateMessaging(client); await migrateMessaging(client);
  await client.query('DELETE FROM users WHERE id=$1', [owner]);
  const peer = (await client.query('SELECT * FROM messages WHERE id=$1', [message])).rows[0];
  assert.equal(peer.content, 'Retain peer history'); assert.equal(peer.sender_id, survivor); assert.equal(peer.recipient_id, null);
  assert.equal((await client.query('SELECT 1 FROM conversations WHERE id=$1', [conversation])).rowCount, 1);
  assert.equal((await client.query('SELECT 1 FROM release_schema_versions WHERE version=$1', ['20261007-shared-message-history-1'])).rowCount, 1);
});
