import { createHmac, timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { env } from '../config/env.js';

export const savedCollectionQuerySchema = z.object({
  limit: z.string().regex(/^[1-9]\d{0,2}$/).refine(value => Number(value) <= 100, 'Limit must be between 1 and 100').optional(),
  cursor: z.string().min(1).max(1024).regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/).optional(),
}).strict();

const cursorSchema = z.object({
  v: z.literal(1), kind: z.enum(['saved_posts', 'saved_videos']), ownerId: z.string().uuid(),
  createdAt: z.string().max(40).regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})?$/)
    .refine(value => Number.isFinite(Date.parse(value))),
  id: z.string().uuid(),
}).strict();
type CollectionKind = z.infer<typeof cursorSchema>['kind'];
export type CollectionPosition = { createdAt: string; id: string };
export type CollectionCandidate<T> = CollectionPosition & { item: T };

export class InvalidCollectionCursorError extends Error {
  constructor() { super('Invalid saved collection cursor. Refresh the collection.'); }
}

function readCursor(value: string | undefined, kind: CollectionKind, ownerId: string): CollectionPosition | undefined {
  if (!value) return undefined;
  try {
    const [payload, signature, extra] = value.split('.');
    if (!payload || !signature || extra !== undefined) throw new Error('Malformed cursor');
    const expected = createHmac('sha256', env.JWT_SECRET).update(payload).digest();
    const supplied = Buffer.from(signature, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('Invalid signature');
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
    if (parsed.kind !== kind || parsed.ownerId !== ownerId) throw new Error('Cursor scope changed');
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch { throw new InvalidCollectionCursorError(); }
}

function writeCursor(position: CollectionPosition, kind: CollectionKind, ownerId: string) {
  const payload = Buffer.from(JSON.stringify({ v: 1, kind, ownerId, ...position })).toString('base64url');
  return `${payload}.${createHmac('sha256', env.JWT_SECRET).update(payload).digest('base64url')}`;
}

export function collectionAfter(createdAt: AnyPgColumn, id: AnyPgColumn, position?: CollectionPosition) {
  return position ? sql`(${createdAt}, ${id}) < (${position.createdAt}::timestamp, ${position.id}::uuid)` : undefined;
}

/** Bound each scan without treating filtered or older bookmarks as exhausted. */
export async function visibleCollectionPage<T extends { id: string }>(input: {
  kind: CollectionKind; ownerId: string; limit: number; cursor?: string;
  fetch: (position: CollectionPosition | undefined, limit: number) => Promise<CollectionCandidate<T>[]>;
  filter: (items: T[]) => Promise<T[]>;
}) {
  const limit = Number.isFinite(input.limit) ? Math.min(100, Math.max(1, Math.floor(input.limit))) : 50;
  let position = readCursor(input.cursor, input.kind, input.ownerId);
  const data: T[] = [];
  let hasMore = false;
  let scanned = 0;
  while (scanned < 500 && data.length < limit) {
    const chunkSize = Math.min(100, 500 - scanned);
    const candidates = await input.fetch(position, chunkSize + 1);
    const batch = candidates.slice(0, chunkSize);
    if (!batch.length) { hasMore = false; break; }
    const visible = new Map((await input.filter(batch.map(row => row.item))).map(item => [item.id, item]));
    for (let index = 0; index < batch.length; index++) {
      const row = batch[index];
      position = { createdAt: row.createdAt, id: row.id };
      scanned++;
      const item = visible.get(row.item.id);
      if (item) data.push(item);
      hasMore = index < batch.length - 1 || candidates.length > chunkSize;
      if (data.length === limit) break;
    }
    if (!hasMore) break;
  }
  return { data, meta: { limit, hasMore, nextCursor: hasMore && position ? writeCursor(position, input.kind, input.ownerId) : null } };
}
