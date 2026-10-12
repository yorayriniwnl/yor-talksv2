import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { Queue, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { notificationJobOptions } from '../lib/notification-job-options.js';
import { pruneCompletedNotifications } from '../workers/notification-worker.js';

async function until(check: () => Promise<boolean>) {
  const deadline = Date.now() + 10000;
  while (!(await check())) {
    if (Date.now() > deadline) throw new Error('synthetic queue did not reach expected state');
    await new Promise(resolve => setTimeout(resolve, 25));
  }
}

test('actual BullMQ bounds completed IDs while preserving delayed/failed work and pruning idle historical completions', async t => {
  const name = `notification-retention-${randomUUID()}`;
  const queue = new Queue(name, { connection: { url: env.REDIS_URL } });
  const originalLimit = env.NOTIFICATION_COMPLETED_MAX_COUNT;
  env.NOTIFICATION_COMPLETED_MAX_COUNT = 1;
  const worker = new Worker(name, async job => { if (job.name === 'synthetic-failure') throw new Error('synthetic retry failure'); }, { connection: { url: env.REDIS_URL } });
  worker.on('error', () => undefined);
  t.after(async () => {
    env.NOTIFICATION_COMPLETED_MAX_COUNT = originalLimit;
    try { await worker.close(); await queue.obliterate({ force: true }); }
    finally { await queue.close(); }
  });
  await worker.waitUntilReady();
  const first = await queue.add('notification:deliver', { id: 'fixture-first' }, notificationJobOptions('fixture-first'));
  await until(async () => await first.getState() === 'completed');
  const delayed = await queue.add('notification:deliver', { id: 'fixture-delayed' }, { ...notificationJobOptions('fixture-delayed'), delay: 3600000 });
  const failed = await queue.add('synthetic-failure', { id: 'fixture-failed' }, { ...notificationJobOptions('fixture-failed'), attempts: 1 });
  await until(async () => await failed.getState() === 'failed');
  const second = await queue.add('notification:deliver', { id: 'fixture-second' }, notificationJobOptions('fixture-second'));
  await until(async () => await second.getState() === 'completed');
  assert.equal(await queue.getJob('fixture-first') == null, true);
  assert.equal(await queue.getCompletedCount(), 1);
  const redis = await queue.client as unknown as Pick<Redis, 'hset' | 'zadd'>;
  const historical = Date.now() - (env.NOTIFICATION_COMPLETED_RETENTION_SECONDS + 60) * 1000;
  await redis.hset(queue.toKey('fixture-second'), 'finishedOn', historical);
  await redis.zadd(queue.toKey('completed'), historical, 'fixture-second');
  await pruneCompletedNotifications(queue);
  assert.equal(await queue.getJob('fixture-second') == null, true, 'idle old completion removed without another job completing');
  assert.equal(await delayed.getState(), 'delayed');
  assert.equal(await failed.getState(), 'failed');
});
