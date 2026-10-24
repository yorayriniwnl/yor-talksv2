/** Durable cleanup work owned by the lifecycle worker. Permanent sweeps each
 * have one row that is revived whenever it reaches a terminal state; finite
 * account cleanup requests are not revived, so their dead letters persist. */
export const PERMANENT_SWEEP_KINDS = ['media_cleanup', 'privacy_cleanup', 'message_cleanup'] as const;
export type PermanentSweepKind = typeof PERMANENT_SWEEP_KINDS[number];

export const CLEANUP_JOB_KINDS = ['account_cleanup', ...PERMANENT_SWEEP_KINDS] as const;
