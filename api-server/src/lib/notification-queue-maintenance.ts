import type { Queue } from 'bullmq';
import type Redis from 'ioredis';
import { notificationJobIdentity, notificationJobPolicy } from './notification-job-policy.js';

/** Upgrade retained legacy payloads and enforce age/count bounds on idle queues.
 * IDs are durable lookup references; reporter/recipient/content fields never
 * belong in Redis. A concurrently removed job needs no further sanitization. */
export async function maintainNotificationQueue(queue: Queue, signal?: AbortSignal): Promise<void> {
  for (const state of ['wait', 'active', 'delayed', 'failed', 'completed', 'paused', 'waiting-children'] as const) {
    for (let offset = 0; ; offset += 250) {
      signal?.throwIfAborted();
      const page = await queue.getJobs([state], offset, offset + 249, true);
      for (const job of page) {
        signal?.throwIfAborted();
        if (job.name !== 'notification:deliver') continue;
        let minimal: { id?: string } = {};
        try { minimal = notificationJobIdentity(job.data); } catch { /* malformed state retains no private data */ }
        try {
          if (JSON.stringify(job.data) !== JSON.stringify(minimal)) await job.updateData(minimal);
          // Pre-upgrade provider exceptions and completed return values may
          // contain the same content or endpoints as the old data payload.
          // Retain only bounded machine diagnostics for finished jobs.
          if (state === 'failed' || state === 'completed') {
            const reason = ['notification_delivery_failed', 'notification_datastore_unavailable', 'invalid_notification_job', 'notification_job_failed'].includes(job.failedReason)
              ? job.failedReason : 'notification_job_failed';
            // This repository configures BullMQ with its supported ioredis
            // adapter; the generic client interface omits Lua commands.
            const client = await queue.client as unknown as Redis;
            await client.eval("if redis.call('EXISTS',KEYS[1])==1 then return redis.call('HSET',KEYS[1],unpack(ARGV)) end return 0",
              1, queue.toKey(job.id!), 'stacktrace', '[]', 'returnvalue', 'null',
              ...(state === 'failed' ? ['failedReason', reason] : []));
          }
        }
        catch (error) { if (await queue.getJob(job.id!)) throw error; }
      }
      if (page.length < 250) break;
    }
  }
  for (const state of ['completed', 'failed'] as const) {
    signal?.throwIfAborted();
    const policy = state === 'completed' ? notificationJobPolicy.removeOnComplete : notificationJobPolicy.removeOnFail;
    // clean is batched, so repeatedly drain aged jobs before the count sweep.
    while ((await queue.clean(policy.age * 1000, 1000, state)).length === 1000) { signal?.throwIfAborted(); }
    const count = state === 'completed' ? await queue.getCompletedCount() : await queue.getFailedCount();
    if (count > policy.count) await queue.clean(0, count - policy.count, state);
  }
}
