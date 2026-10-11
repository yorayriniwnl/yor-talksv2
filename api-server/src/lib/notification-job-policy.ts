/** Redis is transport; the PostgreSQL notification outbox owns deduplication.
 * At most 1,000 completed jobs / one hour and 1,000 failed jobs / seven days.
 * Age pruning runs on finalization; counts bound an idle queue's retained data. */
export const notificationJobPolicy = {
  removeOnComplete: { age: 3600, count: 1000 },
  removeOnFail: { age: 7 * 86400, count: 1000 },
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 30_000 },
  stackTraceLimit: 0,
};

export function notificationJobIdentity(payload: unknown): { id: string } {
  const id = typeof payload === 'object' && payload !== null && 'id' in payload ? (payload as { id: unknown }).id : null;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('invalid_notification_job');
  }
  return { id };
}
