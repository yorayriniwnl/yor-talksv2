const COMPLETED_JOB_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
// Canonical notification rows retain delivery/retry history. Completed queue
// entries need only a small operational window, without duplicating that data.
const COMPLETED_JOB_MAX_COUNT = 1_000;
const FAILED_JOB_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const FAILED_JOB_MAX_COUNT = 5_000;

/** Bound Redis payload retention; durable notification rows remain the retry source. */
export function boundedQueueRetention() {
  return {
    removeOnComplete: { age: COMPLETED_JOB_MAX_AGE_SECONDS, count: COMPLETED_JOB_MAX_COUNT },
    removeOnFail: { age: FAILED_JOB_MAX_AGE_SECONDS, count: FAILED_JOB_MAX_COUNT },
  };
}

export function notificationJobOptions(id: string) {
  return {
    ...boundedQueueRetention(),
    jobId: id,
    attempts: 5,
    backoff: { type: "exponential" as const, delay: 30_000 },
  };
}
