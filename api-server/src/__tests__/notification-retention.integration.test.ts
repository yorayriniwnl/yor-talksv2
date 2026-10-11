import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { pool } from '@workspace/db';
import { QueueService } from '../services/queue-service.js';
import { startNotificationWorker } from '../workers/notification-worker.js';
import { UserRepository } from '../repositories/user-repository.js';
import { NotificationRepository } from '../repositories/notification-repository.js';
import { NotificationDeliveryService } from '../services/notification-delivery-service.js';
import { createTestUser } from './test-helpers.js';
import { maintainNotificationQueue } from '../lib/notification-queue-maintenance.js';
import { cleanAccountSessions } from '../workers/lifecycle-worker.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { AccountService } from '../services/account-service.js';
import bcrypt from 'bcryptjs';
import { operationalMetrics } from '../services/operational-metrics-service.js';
import { assertIsolatedPostgres } from '../../../ops/test-infrastructure-guard.mjs';

const queue = new QueueService();
let worker: Awaited<ReturnType<typeof startNotificationWorker>>;
const users: string[] = [];
const jobIds: string[] = [];
const originalDeliver = NotificationDeliveryService.prototype.deliver;
let deliveries = 0;
async function until(predicate: () => Promise<boolean>, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await predicate()) return; await new Promise(resolve => setTimeout(resolve, 20)); }
  throw new Error('durable notification delivery did not settle');
}
before(async () => {
  assert.equal(process.env.NODE_ENV, 'test');
  assert.ok(process.env.DATABASE_URL && process.env.REDIS_URL);
  assertIsolatedPostgres(process.env);
  const identity = (await pool.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
  assertIsolatedPostgres(process.env, identity);
  NotificationDeliveryService.prototype.deliver = async notification => { deliveries++; return notification; };
  worker = await startNotificationWorker();
});
after(async () => {
  await worker?.close(); NotificationDeliveryService.prototype.deliver = originalDeliver;
  for (const id of jobIds) { const job = await queue.getQueue()?.getJob(id); await job?.remove().catch(() => undefined); }
  await queue.close();
  await operationalMetrics.close();
  await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [users]); await pool.end();
});

test('notification transport keeps only its ID; durable delivered marker survives job pruning and stale sensitive payloads', async () => {
  const user = await createTestUser(new UserRepository()); users.push(user.id);
  const notification = await new NotificationRepository().create({ id: randomUUID(), recipientId: user.id, type: 'follow', title: 'private title', message: 'private body', relatedId: null, createdAt: new Date().toISOString(), readAt: null });
  jobIds.push(notification.id);
  const job = await queue.enqueue('notification:deliver', notification); assert.ok(job);
  assert.deepEqual(job.data, { id: notification.id });
  assert.deepEqual(job.opts.removeOnComplete, { age: 3600, count: 1000 });
  assert.deepEqual(job.opts.removeOnFail, { age: 604800, count: 1000 });
  await until(async () => Boolean((await new NotificationRepository().findById(notification.id))?.pushDeliveredAt));
  assert.equal(deliveries, 1);
  await until(async () => await job.getState() === 'completed'); await job.remove();
  const replay = await queue.getQueue()!.add('notification:deliver', { ...notification, message: 'old retained queue secret' }, { jobId: notification.id, removeOnComplete: true });
  await until(async () => !(await queue.getQueue()!.getJob(replay.id!)));
  assert.equal(deliveries, 1, 'pruning never resets durable delivery authority');
  await pool.query('DELETE FROM users WHERE id=$1', [user.id]);
  const erased = await queue.enqueue('notification:deliver', { id: notification.id }); assert.ok(erased);
  await until(async () => await erased.getState() === 'completed'); assert.equal(deliveries, 1);
});

test('completed jobs are actually pruned at the configured count bound', async () => {
  const jobs = [];
  for (let index = 0; index < 1005; index++) {
    const id = randomUUID(); jobIds.push(id);
    jobs.push({ name: 'notification:deliver', data: { id }, opts: { jobId: id, removeOnComplete: { age: 3600, count: 1000 }, removeOnFail: { age: 604800, count: 1000 } } });
  }
  await queue.getQueue()!.addBulk(jobs);
  await until(async () => (await queue.getQueue()!.getJobCounts('waiting', 'active')).waiting === 0 && (await queue.getQueue()!.getJobCounts('active')).active === 0, 45000);
  assert.ok(await queue.getQueue()!.getCompletedCount() <= 1000);
  assert.equal(deliveries, 1, 'missing/erased durable rows cannot manufacture notification payloads');
});

test('legacy retained payloads are scrubbed after account erasure and invalid failures obey the real count bound', async () => {
  const userRepository = new UserRepository();
  const user = await createTestUser(userRepository, { passwordHash: await bcrypt.hash('synthetic-erasure-password', 10) }); users.push(user.id);
  const id = randomUUID(); jobIds.push(id);
  const legacy = await queue.getQueue()!.add('notification:deliver', { id, recipientId: user.id,
    email: 'private-legacy@invalid.example', title: 'private title', message: 'private legacy body' },
  { jobId: id, delay: 60_000, removeOnComplete: false, removeOnFail: false });
  const legacyFinishedId = randomUUID(); jobIds.push(legacyFinishedId);
  const legacyFinished = await queue.getQueue()!.add('notification:deliver', { id: legacyFinishedId, message: 'private finished content' },
    { jobId: legacyFinishedId, removeOnComplete: false });
  await until(async () => await legacyFinished.getState() === 'completed');
  // Model serialized diagnostics left by a pre-upgrade completed worker.
  await (await queue.getQueue()!.client).hset(queue.getQueue()!.toKey(legacyFinishedId), {
    returnvalue: JSON.stringify({ email: 'private-return@invalid.example' }), stacktrace: JSON.stringify(['private endpoint']) });
  const cleanupRedis = new RedisRepository();
  try {
    assert.equal(await new AccountService(userRepository, cleanupRedis).deleteAccount(user.id, 'synthetic-erasure-password'), true);
    const durableJob = (await pool.query('SELECT * FROM background_jobs WHERE dedup_key=$1', [`account:${user.id}`])).rows[0];
    assert.ok(durableJob);
    await cleanAccountSessions(durableJob, cleanupRedis);
    await pool.query('DELETE FROM background_jobs WHERE id=$1', [durableJob.id]);
  } finally { await cleanupRedis.disconnect(); }
  assert.deepEqual((await queue.getQueue()!.getJob(legacy.id!))!.data, { id });
  const scrubbed = (await queue.getQueue()!.getJob(legacyFinishedId))!;
  assert.deepEqual(scrubbed.data, { id: legacyFinishedId }); assert.equal(scrubbed.returnvalue, null); assert.deepEqual(scrubbed.stacktrace, []);
  const failing = Array.from({ length: 1005 }, () => {
    const jobId = randomUUID(); jobIds.push(jobId);
    return { name: 'notification:deliver', data: { id: 'malformed' }, opts: { jobId, attempts: 1,
      removeOnFail: { age: 604800, count: 1000 }, stackTraceLimit: 0 } };
  });
  await queue.getQueue()!.addBulk(failing);
  await until(async () => (await queue.getQueue()!.getJobCounts('waiting', 'active')).waiting === 0
    && (await queue.getQueue()!.getJobCounts('active')).active === 0, 45000);
  assert.ok(await queue.getQueue()!.getFailedCount() <= 1000);
  const failures = await queue.getQueue()!.getFailed(0, 5);
  for (const failed of failures) {
    assert.equal(failed.failedReason, 'invalid_notification_job');
    assert.deepEqual(failed.stacktrace, []);
  }
  await maintainNotificationQueue(queue.getQueue()!);
  for (const failed of await queue.getQueue()!.getFailed(0, 5)) assert.deepEqual(failed.data, {});
});

test('five durable failures survive complete Redis queue loss; pending outbox recovers and explicit replay preserves history', async () => {
  const repository = new NotificationRepository();
  const user = await createTestUser(new UserRepository()); users.push(user.id);
  const failed = await repository.create({ id: randomUUID(), recipientId: user.id, type: 'follow', title: 'private failed title',
    message: 'private failed body', relatedId: null, createdAt: new Date().toISOString(), readAt: null });
  jobIds.push(failed.id);
  let failures = 0;
  NotificationDeliveryService.prototype.deliver = async notification => {
    if (notification.id === failed.id) { failures++; throw new Error('private provider response and subscription endpoint'); }
    deliveries++; return notification;
  };
  const job = await queue.enqueue('notification:deliver', failed); assert.ok(job);
  for (let attempt = 1; attempt <= 5; attempt++) {
    await until(async () => (await pool.query('SELECT attempts FROM notification_delivery_state WHERE notification_id=$1', [failed.id])).rows[0]?.attempts === attempt);
    if (attempt < 5) {
      await until(async () => await job.getState() === 'delayed');
      await pool.query("UPDATE notification_delivery_state SET next_retry_at=clock_timestamp()-interval '1 second' WHERE notification_id=$1", [failed.id]);
      await job.promote();
    }
  }
  await until(async () => await job.getState() === 'failed');
  const failedJob = (await queue.getQueue()!.getJob(failed.id))!;
  assert.equal(failedJob.failedReason, 'notification_delivery_failed'); assert.deepEqual(failedJob.stacktrace, []);
  assert.equal(failures, 5);
  assert.equal((await repository.inspectFailedDelivery()).find(row => row.notification_id === failed.id)?.attempts, 5);
  assert.equal(JSON.stringify(await repository.inspectFailedDelivery()).includes('private'), false);
  await worker.close();
  const pending = await repository.create({ ...failed, id: randomUUID(), title: 'pending recovery', message: 'pending body' });
  jobIds.push(pending.id);
  // This test infrastructure is explicitly isolated: obliterate the transport,
  // retaining PostgreSQL delivery state and exercising the actual startup scan.
  await queue.getQueue()!.obliterate({ force: true });
  worker = await startNotificationWorker();
  await until(async () => Boolean((await repository.findById(pending.id))?.pushDeliveredAt));
  assert.equal(failures, 5, 'queue loss must not reset a dead notification');
  assert.equal((await repository.findById(failed.id))?.pushDeliveredAt, null);
  NotificationDeliveryService.prototype.deliver = async notification => { deliveries++; return notification; };
  await repository.replayFailedDelivery(failed.id, 'provider_recovered');
  await queue.enqueue('notification:deliver', { id: failed.id });
  await until(async () => Boolean((await repository.findById(failed.id))?.pushDeliveredAt));
  const history = (await pool.query('SELECT previous_attempts,previous_error,operator_reason FROM notification_delivery_replays WHERE notification_id=$1', [failed.id])).rows[0];
  assert.deepEqual(history, { previous_attempts: 5, previous_error: 'notification_delivery_failed', operator_reason: 'provider_recovered' });
  await assert.rejects(repository.replayFailedDelivery(failed.id, 'repeat_delivery'), /only_undelivered_dead/);
});
