import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { RedisRepository } from '../repositories/redis-repository.js';
import { cleanAccountSessions } from '../workers/lifecycle-worker.js';
import type { BackgroundJob } from '../repositories/background-job-repository.js';

const redis = new RedisRepository();
const keys: string[] = [];
const job = (userId: string, emailHash?: string): BackgroundJob => ({
  id: randomUUID(), kind: 'account_cleanup', payload: { userId, ...(emailHash ? { emailHash } : {}) }, attempts: 1, lease_token: randomUUID(),
});
async function store(key: string, value: string) {
  keys.push(key);
  await redis.setStrict(key, value, 300);
}
after(async () => {
  for (const key of keys) await redis.delStrict(key);
  await redis.disconnect();
  await pool.end();
});

test('account cleanup erases scoped authentication state and remains safe to retry', async () => {
  const userId = randomUUID(), otherId = randomUUID();
  const emailHash = createHash('sha256').update(`${userId}@example.test`).digest('hex');
  const approval = randomUUID(), approvalIndex = `login-approvals:user:${userId}`;
  const scoped = [`session:${userId}:device`, `totp-setup:${userId}`, `login-approval:${approval}`, `email-login-otp:${emailHash}`];
  for (const key of scoped) await store(key, key.startsWith('email-login-otp:') ? JSON.stringify({ userId, codeHash: 'synthetic' }) : 'synthetic');
  keys.push(approvalIndex);
  await redis.addToSetStrict(approvalIndex, approval);
  const untouched = [`session:${otherId}:device`, `totp-setup:${otherId}`, `totp-used:${userId}:opaque`];
  for (const key of untouched) await store(key, 'other-account');
  await cleanAccountSessions(job(userId, emailHash), redis);
  await cleanAccountSessions(job(userId, emailHash), redis);
  for (const key of [...scoped, approvalIndex]) assert.equal(await redis.getStrict(key), null, key);
  for (const key of untouched) assert.equal(await redis.getStrict(key), 'other-account');
});

test('a delayed cleanup preserves OTP state issued to a new account with the same address', async () => {
  const emailHash = createHash('sha256').update(randomUUID()).digest('hex');
  const key = `email-login-otp:${emailHash}`, replacement = JSON.stringify({ userId: randomUUID(), reservationId: randomUUID() });
  await store(key, replacement);
  await cleanAccountSessions(job(randomUUID(), emailHash), redis);
  assert.equal(await redis.getStrict(key), replacement);
  await store(key, 'malformed legacy state');
  await cleanAccountSessions(job(randomUUID(), emailHash), redis);
  assert.equal(await redis.getStrict(key), 'malformed legacy state');
});

test('legacy deletion jobs remain compatible without an email locator', async () => {
  const userId = randomUUID(), key = `totp-setup:${userId}`;
  await store(key, 'synthetic-encrypted-secret');
  await cleanAccountSessions(job(userId), redis);
  assert.equal(await redis.getStrict(key), null);
});

test('cleanup rejects invalid locators and surfaces Redis outages for durable retry', async () => {
  const dependency = { scanStrict: async () => { throw new Error('synthetic Redis outage'); } } as unknown as RedisRepository;
  await assert.rejects(cleanAccountSessions(job('*'), dependency), /invalid_job/);
  await assert.rejects(cleanAccountSessions(job(randomUUID(), '*'), dependency), /invalid_job/);
  await assert.rejects(cleanAccountSessions(job(randomUUID()), dependency), /synthetic Redis outage/);
});
