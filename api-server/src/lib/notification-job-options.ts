import { env } from '../config/env.js';

export function notificationJobOptions(id: string) {
  return {
    jobId: id,
    removeOnComplete: { age: env.NOTIFICATION_COMPLETED_RETENTION_SECONDS, count: env.NOTIFICATION_COMPLETED_MAX_COUNT },
    // Failed/waiting jobs remain available to durable outbox recovery.
    removeOnFail: false,
    attempts: 5,
    backoff: { type: 'exponential' as const, delay: 30_000 },
  };
}
