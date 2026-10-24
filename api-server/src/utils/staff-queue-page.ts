import { and, eq, lt, or } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { z } from 'zod';

export const staffQueuePageFields = {
  cursor: z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/).optional(),
  limit: z.string().regex(/^[1-9]\d{0,2}$/).refine(value => Number(value) <= 100, 'Limit must be between 1 and 100').optional(),
};

const cursorSchema = z.object({
  v: z.literal(1),
  queue: z.enum(['reports', 'grievances']),
  status: z.string().nullable(),
  // Keep PostgreSQL microseconds intact so tied timestamps cannot skip records.
  createdAt: z.string().max(40).regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?$/)
    .refine(value => Number.isFinite(Date.parse(value))),
  id: z.string().uuid(),
}).strict();

export class InvalidStaffQueueCursorError extends Error {
  constructor() { super('Invalid queue cursor. Refresh the selected queue.'); }
}

export function readStaffQueueCursor(value: string | undefined, queue: 'reports' | 'grievances', status?: string) {
  if (!value) return undefined;
  try {
    const [payload, suppliedSignature] = value.split('.');
    if (!payload || !suppliedSignature) throw new Error('Malformed cursor');
    const expected = createHmac('sha256', env.JWT_SECRET).update(payload).digest();
    const supplied = Buffer.from(suppliedSignature, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('Cursor signature invalid');
    const cursor = cursorSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
    if (cursor.queue !== queue || cursor.status !== (status ?? null)) throw new Error('Cursor scope changed');
    return cursor;
  } catch { throw new InvalidStaffQueueCursorError(); }
}

export function staffQueueAfter(createdAt: AnyPgColumn, id: AnyPgColumn, cursor: ReturnType<typeof readStaffQueueCursor>) {
  return cursor ? or(lt(createdAt, cursor.createdAt), and(eq(createdAt, cursor.createdAt), lt(id, cursor.id))) : undefined;
}

export function staffQueuePage<T extends { id: string; createdAt: string }>(rows: T[], limit: number, queue: 'reports' | 'grievances', status?: string) {
  const hasMore = rows.length > limit;
  const data = rows.slice(0, limit);
  const last = data.at(-1);
  let nextCursor: string | null = null;
  if (hasMore && last) {
    const payload = Buffer.from(JSON.stringify({ v: 1, queue, status: status ?? null, createdAt: last.createdAt, id: last.id })).toString('base64url');
    const signature = createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url');
    nextCursor = `${payload}.${signature}`;
  }
  return { data, meta: { limit, hasMore, nextCursor } };
}
