import { execSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../api-server/package.json', import.meta.url));
const bcrypt = require('bcryptjs');

const pgData = 'C:/Users/yoray/AppData/Local/Temp/yor-privacy-verification-20261009/pgdata';
const logFile = 'C:/Users/yoray/AppData/Local/Temp/yor-privacy-verification-20261009/postgres.log';
const port = 55438;
const redisPort = 56379;
const dbUrl = `postgresql://postgres@127.0.0.1:${port}/yor_privacy_test`;
const redisUrl = `redis://127.0.0.1:${redisPort}`;

console.log('1. Starting PostgreSQL on port', port);
try {
  execSync(`"C:/Users/yoray/pgsql/bin/pg_ctl.exe" -D "${pgData}" -o "-p ${port}" -l "${logFile}" start`, { stdio: 'inherit' });
} catch (e) {
  console.log('pg_ctl start reported non-zero, checking if already ready...');
}
execSync(`"C:/Users/yoray/pgsql/bin/pg_isready.exe" -h 127.0.0.1 -p ${port}`, { stdio: 'inherit' });

console.log('2. Starting Redis on port', redisPort);
const redisProcess = spawn('C:/Users/yoray/redis/redis-server.exe', ['--port', String(redisPort)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 1000));
execSync(`"C:/Users/yoray/redis/redis-cli.exe" -p ${redisPort} ping`, { stdio: 'inherit' });

try {
  console.log('3. Running production migration against isolated synthetic cluster...');
  process.env.DATABASE_URL = dbUrl;
  process.env.REDIS_URL = redisUrl;
  process.env.NODE_ENV = 'test';
  process.env.CONTACT_SHIELD_SECRET = 'isolated-migration-test-secret-0123456789';

  execSync('pnpm --filter @workspace/db migrate:production', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: dbUrl, REDIS_URL: redisUrl, NODE_ENV: 'test', CONTACT_SHIELD_SECRET: 'isolated-migration-test-secret-0123456789' }
  });

  const { pool } = await import('../lib/db/src/index.ts');
  const { UserRepository } = await import('../api-server/src/repositories/user-repository.ts');
  const { ConversationRepository, MessageRepository } = await import('../api-server/src/repositories/message-repository.ts');
  const { MessageService } = await import('../api-server/src/services/message-service.ts');
  const { AccountService } = await import('../api-server/src/services/account-service.ts');

  const users = new UserRepository();
  const conversations = new ConversationRepository();
  const messages = new MessageRepository();
  const messageService = new MessageService(conversations, messages);
  const redisRepo = { keys: async () => [], del: async () => undefined };
  const accounts = new AccountService(users, redisRepo);

  const constraints = (await pool.query("SELECT conname AS name, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid IN ('conversations'::regclass,'messages'::regclass) AND contype='f' ORDER BY conname")).rows
    .filter(row => /participant_a|participant_b|recipient_id/.test(row.definition));
  
  console.log('Active constraints:');
  for (const c of constraints) {
    console.log(`  ${c.name}: ${c.definition}`);
  }
  assert.ok(constraints.length >= 3, 'Must have participant_a, participant_b, recipient_id constraints');
  assert.ok(constraints.every(r => r.definition.includes('ON DELETE SET NULL')), 'All participant/recipient constraints must use ON DELETE SET NULL');

  console.log('5. Running cascade test with 3 group members...');
  const password = 'synthetic-cascade-test-password';
  const hash = await bcrypt.hash(password, 4);
  async function makePerson(name) {
    const id = randomUUID();
    await pool.query('INSERT INTO users(id,username,email,password_hash,full_name) VALUES($1,$2,$3,$4,$5)',
      [id, `cascade_${name}_${id.slice(0, 6)}`, `cascade-${name}-${id.slice(0, 6)}@example.invalid`, hash, `Fixture ${name}`]);
    return id;
  }

  const [creator, memberB, memberC] = await Promise.all([makePerson('creator'), makePerson('memberB'), makePerson('memberC')]);
  const group = await conversations.createGroupChat(creator, [memberB, memberC], 'Synthetic cascade test group');
  
  const msgB = await messageService.sendMessageToConversation(memberB, group.id, 'Surviving contribution B');
  const msgC = await messageService.sendMessageToConversation(memberC, group.id, 'Surviving contribution C');

  const beforeDeleteMsgs = (await pool.query('SELECT count(*) AS count FROM messages WHERE conversation_id=$1', [group.id])).rows[0].count;
  assert.equal(Number(beforeDeleteMsgs), 2, 'Two messages in group before creator deletion');

  console.log('6. Deleting creator account...');
  const creatorDeleted = await accounts.deleteAccount(creator, password);
  assert.equal(creatorDeleted, true, 'Creator account deleted');

  const survivingUsers = Number((await pool.query('SELECT count(*) AS count FROM users WHERE id=ANY($1::uuid[])', [[memberB, memberC]])).rows[0].count);
  const remainingConversations = Number((await pool.query('SELECT count(*) AS count FROM conversations WHERE id=$1', [group.id])).rows[0].count);
  const remainingMessages = Number((await pool.query('SELECT count(*) AS count FROM messages WHERE conversation_id=$1', [group.id])).rows[0].count);

  console.log('After creator deletion:');
  console.log({ survivingUsers, remainingConversations, remainingMessages });

  assert.equal(survivingUsers, 2, 'Both surviving members must remain');
  assert.equal(remainingConversations, 1, 'Group conversation MUST survive creator deletion');
  assert.equal(remainingMessages, 2, 'Surviving members contributions MUST survive creator deletion');

  console.log('7. Deleting memberB account...');
  const memberBDeleted = await accounts.deleteAccount(memberB, password);
  assert.equal(memberBDeleted, true, 'Member B account deleted');

  const remainingConversations2 = Number((await pool.query('SELECT count(*) AS count FROM conversations WHERE id=$1', [group.id])).rows[0].count);
  const survivingCContribution = Number((await pool.query('SELECT count(*) AS count FROM messages WHERE id=$1', [msgC.id])).rows[0].count);

  console.log('After memberB deletion:');
  console.log({ remainingConversations2, survivingCContribution });

  assert.equal(remainingConversations2, 1, 'Group conversation MUST survive member B deletion');
  assert.equal(survivingCContribution, 1, 'Member C contribution MUST survive member B deletion');

  await pool.end();
  console.log('\n*** CASCADE SAFETY VERIFICATION PASSED SUCCESSFULLY! ***\n');
} finally {
  console.log('Stopping Redis...');
  try { execSync(`"C:/Users/yoray/redis/redis-cli.exe" -p ${redisPort} shutdown`); } catch {}
  redisProcess.kill();

  console.log('Stopping PostgreSQL...');
  try { execSync(`"C:/Users/yoray/pgsql/bin/pg_ctl.exe" -D "${pgData}" stop`); } catch {}
}
