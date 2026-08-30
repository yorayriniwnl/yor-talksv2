import crypto from "node:crypto";
import { logger } from "../lib/logger.js";
import { RedisRepository } from "../repositories/redis-repository.js";

export interface AuditEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  subject?: string;
}

/**
 * Security audit and abuse-detection service backed by Redis.
 *
 * Events are stored in per-subject sorted sets keyed by timestamp so they
 * survive process restarts and are shared across all instances. A 15-minute
 * sliding window is used for abuse detection (≥ 5 events of the same type).
 *
 * Redis key pattern: `security:audit:{type}:{subject}` → sorted set
 *   score  = Unix-ms timestamp
 *   member = event ID
 *
 * An additional key `security:audit:event:{id}` stores the full JSON for
 * the audit log endpoint, with a 24-hour TTL for automatic cleanup.
 */
export class SecurityService {
  /** Retention window for abuse detection queries (15 minutes). */
  private static readonly ABUSE_WINDOW_MS = 15 * 60 * 1000;
  /** How long individual event detail records are kept (24 hours). */
  private static readonly EVENT_TTL_SECONDS = 24 * 60 * 60;
  /** Abuse threshold: number of events in the window that triggers detection. */
  private static readonly ABUSE_THRESHOLD = 5;
  private readonly pendingWrites = new Set<Promise<void>>();

  constructor(
    private readonly redisRepository: RedisRepository = new RedisRepository(),
  ) {}

  createAuditEvent(type: string, message: string, subject?: string): AuditEvent {
    const event: AuditEvent = {
      id: crypto.randomUUID(),
      type,
      message,
      createdAt: new Date().toISOString(),
      ...(subject ? { subject } : {}),
    };
    logger.warn({ eventId: event.id, type, message }, "Security audit event");

    // Fire-and-forget write to Redis. Audit recording must not block the
    // calling auth flow; if Redis is temporarily unavailable the event is
    // still captured in the structured log output above.
    const effectiveSubject = subject ?? message;
    const indexKey = `security:audit:${type}:${effectiveSubject}`;
    const score = Date.now();
    const write = (async () => {
      try {
        await this.redisRepository.zadd(indexKey, score, event.id);
        // Trim entries older than the abuse window to bound memory usage.
        await this.redisRepository.zremrangebyscore(
          indexKey,
          "-inf",
          String(score - SecurityService.ABUSE_WINDOW_MS),
        );
        // Store the full event detail with a TTL for the audit log endpoint.
        await this.redisRepository.setStrict(
          `security:audit:event:${event.id}`,
          JSON.stringify(event),
          SecurityService.EVENT_TTL_SECONDS,
        );
      } catch (error) {
        logger.warn({ error, eventId: event.id }, "Failed to persist security audit event to Redis");
      }
    })();
    this.pendingWrites.add(write);
    void write.finally(() => this.pendingWrites.delete(write));

    return event;
  }

  /** Waits for fire-and-forget audit writes, primarily for graceful shutdown and tests. */
  async flush(): Promise<void> {
    await Promise.allSettled([...this.pendingWrites]);
  }

  async getAuditLog(): Promise<AuditEvent[]> {
    try {
      const keys = await this.redisRepository.scanStrict("security:audit:event:*");
      if (keys.length === 0) return [];
      const events: AuditEvent[] = [];
      const results = await Promise.all(
        keys.slice(0, 200).map((key) => this.redisRepository.getStrict(key)),
      );
      for (const raw of results) {
        if (!raw) continue;
        try {
          events.push(JSON.parse(raw) as AuditEvent);
        } catch { /* skip malformed entries */ }
      }
      return events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    } catch {
      return [];
    }
  }

  async detectAbuse(subject: string, action: string): Promise<boolean> {
    try {
      const indexKey = `security:audit:${action}:${subject}`;
      const cutoff = Date.now() - SecurityService.ABUSE_WINDOW_MS;
      const count = await this.redisRepository.zcount(indexKey, String(cutoff), "+inf");
      return count >= SecurityService.ABUSE_THRESHOLD;
    } catch {
      // If Redis is down, fail open for abuse detection — the IP-based rate
      // limiter (Redis-backed in production) is the primary defense. Returning
      // false here avoids locking out every user during a transient Redis issue.
      return false;
    }
  }
}
