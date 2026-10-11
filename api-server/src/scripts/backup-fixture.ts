import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { pool } from '@workspace/db';
import { AuthService } from '../services/auth-service.js';
import { SecurityService } from '../services/security-service.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { ConversationRepository, MessageRepository } from '../repositories/message-repository.js';
import { MessageService } from '../services/message-service.js';
import { assertIsolatedPostgres } from '../../../ops/test-infrastructure-guard.mjs';

const sender = 'aaaaaaaa-1111-4111-8111-111111111111', recipient = 'bbbbbbbb-2222-4222-8222-222222222222';
const message = 'cccccccc-3333-4333-8333-333333333333';
const redis = new RedisRepository();
const security = new SecurityService(redis);
try {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.ok(process.env.DATABASE_URL && process.env.REDIS_URL);
  const databasePattern = /^yor_backup_acceptance_(?:source|target|failed)_[a-f0-9]{12}$/;
  assertIsolatedPostgres(process.env, undefined, databasePattern);
  const identity = (await pool.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
  assertIsolatedPostgres(process.env, identity, databasePattern);
  const users = new UserRepository(), conversations = new ConversationRepository(), messages = new MessageRepository();
  if (process.argv[2] === 'seed') {
    const passwordHash = await bcrypt.hash('SyntheticRestore123!', 10);
    for (const [id, email] of [[sender, 'restore-sender@example.test'], [recipient, 'restore-recipient@example.test']]) {
      await pool.query(`INSERT INTO users(id,username,email,password_hash,full_name,email_verified,auth_version)
        VALUES($1,$2,$3,$4,'Synthetic backup fixture',true,7)`, [id, id, email, passwordHash]);
    }
    const conversation = await conversations.findOrCreateDirect(sender, recipient);
    await messages.create({ id: message, conversationId: conversation.id, senderId: sender, recipientId: recipient, content: 'Restored synthetic message', createdAt: new Date().toISOString(), seenAt: null });
  } else if (process.argv[2] === 'verify') {
    const service = new AuthService(users, redis, security);
    const result = await service.login({ identifier: 'restore-sender@example.test', password: 'SyntheticRestore123!' });
    assert.equal(result.user.id, sender); assert.equal(result.user.authVersion, 7);
    const conversation = await conversations.findOrCreateDirect(sender, recipient);
    const history = await new MessageService(conversations, messages, users).listConversation(conversation.id, recipient);
    assert.equal(history.length, 1); assert.equal(history[0].id, message); assert.equal(history[0].content, 'Restored synthetic message');
    await service.logoutAllDevices(sender);
    const changed = await users.findById(sender); assert.equal(changed?.authVersion, 8);
    assert.ok((await pool.query('SELECT count(*)::integer AS count FROM release_schema_versions')).rows[0].count > 0);
    assert.equal((await pool.query("SELECT count(*)::integer AS count FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated")).rows[0].count, 0);
    console.log('Restored application authentication, revocation, message visibility, relationships, migration ledger and constraints passed');
  } else throw new Error('backup-fixture.ts seed | verify');
} finally {
  await security.flush(); await redis.disconnect(); await pool.end();
}
