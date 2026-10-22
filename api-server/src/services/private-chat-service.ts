import { randomUUID } from 'node:crypto';
import { db, runInDatabaseTransaction } from '@workspace/db';
import { privateChatEnvelopesTable, privateChatIdentitiesTable, privateChatThreadsTable, usersTable } from '@workspace/db/schema';
import { and, asc, desc, eq, gt, inArray, or, sql } from 'drizzle-orm';
import { ContactAuthorizationDeniedError, ContactAuthorizationService } from './contact-authorization-service.js';
import { EligibilityService } from './eligibility-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { PrivateChatError, validatePrivateChatCiphertext, validatePrivateChatIdentity } from './private-chat-validation.js';

export type PrivateChatIdentity = typeof privateChatIdentitiesTable.$inferSelect;
export type PrivateChatEnvelope = typeof privateChatEnvelopesTable.$inferSelect;
type ThreadRow = typeof privateChatThreadsTable.$inferSelect;
export interface PrivateChatThread { id: string; participantIds: [string, string]; createdAt: string; updatedAt: string }
export interface PrivateChatThreadDetail { thread: PrivateChatThread; members: PrivateChatIdentity[] }
export interface PrivateChatMessagePage { items: PrivateChatEnvelope[]; nextCursor: string | null; hasMore: boolean }

const forbidden = () => new PrivateChatError(403, 'private_chat_forbidden', 'This private conversation is unavailable');
const notFound = () => new PrivateChatError(404, 'private_chat_not_found', 'Private conversation not found');
const notEnrolled = () => new PrivateChatError(409, 'private_chat_not_enrolled', 'Both participants need a private chat identity');
const conflict = () => new PrivateChatError(409, 'private_chat_conflict', 'This private chat identifier is already in use');
const toThread = (row: ThreadRow): PrivateChatThread => ({
  id: row.id, participantIds: [row.userAId, row.userBId], createdAt: row.createdAt, updatedAt: row.updatedAt,
});
type PageCursor = { threadId: string; createdAt: string; id: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const cursorFor = (message: PrivateChatEnvelope): string => Buffer.from(JSON.stringify({
  threadId: message.threadId, createdAt: message.createdAt, id: message.id,
})).toString('base64url');

export function readPrivateChatCursor(value: string | undefined, threadId: string): PageCursor | undefined {
  if (value === undefined) return undefined;
  try {
    if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!parsed || parsed.threadId !== threadId || typeof parsed.id !== 'string' || !UUID.test(parsed.id)
      || typeof parsed.createdAt !== 'string' || parsed.createdAt.length > 50
      || !/^\d{4}-\d\d-\d\d[T ]\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d(?::?\d\d)?)$/.test(parsed.createdAt)
      || !Number.isFinite(Date.parse(parsed.createdAt))) throw new Error();
    return { threadId, createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    throw new PrivateChatError(400, 'private_chat_invalid_cursor', 'Invalid private message cursor');
  }
}

/**
 * The relay only persists public identity material and encrypted envelopes.
 * Existing account/contact authorization applies independently of encryption.
 * No content moderation, notification, search or ordinary message path is used.
 */
export class PrivateChatService {
  constructor(
    private readonly contacts = new ContactAuthorizationService(),
    private readonly users = new UserRepository(),
    private readonly eligibility = new EligibilityService(),
  ) {}

  private async requireAccount(userId: string): Promise<void> {
    await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).for('share');
    await db.execute(sql`SELECT user_id FROM eligibility_revisions WHERE user_id=${userId}::uuid FOR SHARE`);
    const user = await this.users.findById(userId);
    const decision = await this.eligibility.decisionFor(userId);
    if (!user || (user.accountStatus ?? 'active') !== 'active' || !decision.activated || !decision.capabilities.messaging) throw forbidden();
  }

  /** Must run inside runInDatabaseTransaction; locks survive until delivery data is selected. */
  private async requirePair(userId: string, recipientId: string, action: 'read' | 'send'): Promise<void> {
    if (userId === recipientId) throw forbidden();
    try {
      await this.contacts.lockCurrentPairwiseContacts([userId, recipientId], action);
    } catch (error) {
      if (error instanceof ContactAuthorizationDeniedError) throw forbidden();
      throw error;
    }
    const members = await this.users.findByIds([userId, recipientId]);
    if (members.length !== 2 || members.some(user => (user.accountStatus ?? 'active') !== 'active'
      || user.blockedUsers?.includes(user.id === userId ? recipientId : userId))) throw forbidden();
    for (const member of members) {
      const decision = await this.eligibility.decisionFor(member.id);
      if (!decision.activated || !decision.capabilities.messaging) throw forbidden();
    }
    // Preserve follower-only/message-request preferences on every relay read
    // as well as send. A revoked boundary never discloses stored envelopes.
    for (const member of members) {
      if (member.privacy?.allowDmFromStrangers === false || member.privacy?.messageRequests === false) {
        const otherId = member.id === userId ? recipientId : userId;
        if (!await this.users.isFollowing(otherId, member.id)) throw forbidden();
      }
    }
  }

  async getIdentity(userId: string): Promise<PrivateChatIdentity | null> {
    return runInDatabaseTransaction(async () => {
      await this.requireAccount(userId);
      const [identity] = await db.select().from(privateChatIdentitiesTable).where(eq(privateChatIdentitiesTable.userId, userId));
      return identity ?? null;
    });
  }

  async enrollIdentity(userId: string, publicKey: string, fingerprint: string): Promise<PrivateChatIdentity> {
    const identity = await validatePrivateChatIdentity(userId, publicKey, fingerprint);
    return runInDatabaseTransaction(async () => {
      await this.requireAccount(userId);
      const [created] = await db.insert(privateChatIdentitiesTable).values({ userId, ...identity })
        .onConflictDoNothing().returning();
      if (created) return created;
      const [existing] = await db.select().from(privateChatIdentitiesTable).where(eq(privateChatIdentitiesTable.userId, userId));
      if (!existing || existing.fingerprint !== identity.fingerprint || existing.publicKey !== identity.publicKey) {
        throw new PrivateChatError(409, 'private_chat_identity_immutable', 'This account already has a private chat identity; restore its original key');
      }
      return existing;
    });
  }

  private async identities(row: ThreadRow): Promise<PrivateChatIdentity[]> {
    const members = await db.select().from(privateChatIdentitiesTable)
      .where(inArray(privateChatIdentitiesTable.userId, [row.userAId, row.userBId])).orderBy(asc(privateChatIdentitiesTable.userId));
    if (members.length !== 2) throw notEnrolled();
    return members;
  }

  async createThread(userId: string, recipientId: string): Promise<PrivateChatThreadDetail> {
    return runInDatabaseTransaction(async () => {
      await this.requirePair(userId, recipientId, 'send');
      const [userAId, userBId] = [userId, recipientId].sort();
      const members = await db.select().from(privateChatIdentitiesTable)
        .where(inArray(privateChatIdentitiesTable.userId, [userAId, userBId])).orderBy(asc(privateChatIdentitiesTable.userId));
      if (members.length !== 2) throw notEnrolled();
      const [created] = await db.insert(privateChatThreadsTable).values({ id: randomUUID(), userAId, userBId })
        .onConflictDoNothing().returning();
      const existing = created ?? (await db.select().from(privateChatThreadsTable)
        .where(and(eq(privateChatThreadsTable.userAId, userAId), eq(privateChatThreadsTable.userBId, userBId))))[0];
      if (!existing) throw conflict();
      return { thread: toThread(existing), members };
    });
  }

  async listThreads(userId: string): Promise<{ items: PrivateChatThread[] }> {
    return runInDatabaseTransaction(async () => {
      await this.requireAccount(userId);
      const rows = await db.select().from(privateChatThreadsTable)
        .where(or(eq(privateChatThreadsTable.userAId, userId), eq(privateChatThreadsTable.userBId, userId)))
        .orderBy(desc(privateChatThreadsTable.updatedAt), desc(privateChatThreadsTable.id)).limit(100);
      const items: PrivateChatThread[] = [];
      for (const row of rows) {
        try {
          await this.requirePair(userId, row.userAId === userId ? row.userBId : row.userAId, 'read');
          items.push(toThread(row));
        } catch (error) {
          if (!(error instanceof PrivateChatError && error.status === 403)) throw error;
        }
      }
      return { items };
    });
  }

  private async authorizedThread(userId: string, threadId: string, action: 'read' | 'send'): Promise<ThreadRow> {
    const [row] = await db.select().from(privateChatThreadsTable).where(and(eq(privateChatThreadsTable.id, threadId),
      or(eq(privateChatThreadsTable.userAId, userId), eq(privateChatThreadsTable.userBId, userId))));
    if (!row) throw notFound();
    await this.requirePair(userId, row.userAId === userId ? row.userBId : row.userAId, action);
    // Serialize sends and page reads so a previously started transaction cannot
    // insert behind a polling cursor after its page has already been returned.
    const [locked] = await db.select().from(privateChatThreadsTable).where(eq(privateChatThreadsTable.id, threadId))
      .for(action === 'send' ? 'update' : 'share');
    if (!locked) throw notFound();
    return locked;
  }

  async getThread(userId: string, threadId: string): Promise<PrivateChatThreadDetail> {
    return runInDatabaseTransaction(async () => {
      const row = await this.authorizedThread(userId, threadId, 'read');
      return { thread: toThread(row), members: await this.identities(row) };
    });
  }

  async listMessages(userId: string, threadId: string, after?: string, limit = 20): Promise<PrivateChatMessagePage> {
    const cursor = readPrivateChatCursor(after, threadId);
    const pageSize = Math.max(1, Math.min(50, Math.floor(limit)));
    return runInDatabaseTransaction(async () => {
      await this.authorizedThread(userId, threadId, 'read');
      const rows = await db.select({
        id: privateChatEnvelopesTable.id,
        bytes: sql<number>`octet_length(${privateChatEnvelopesTable.ciphertext})`,
      }).from(privateChatEnvelopesTable).where(and(
        eq(privateChatEnvelopesTable.threadId, threadId),
        cursor ? or(gt(privateChatEnvelopesTable.createdAt, cursor.createdAt),
          and(eq(privateChatEnvelopesTable.createdAt, cursor.createdAt), gt(privateChatEnvelopesTable.id, cursor.id))) : undefined,
      )).orderBy(asc(privateChatEnvelopesTable.createdAt), asc(privateChatEnvelopesTable.id)).limit(pageSize + 1);
      const selectedIds: string[] = [];
      let bytes = 0;
      for (const row of rows) {
        const size = row.bytes;
        if (selectedIds.length >= pageSize || (selectedIds.length > 0 && bytes + size > 4 * 1024 * 1024)) break;
        selectedIds.push(row.id);
        bytes += size;
      }
      // Select payloads only after the metadata budget is known; a full page of
      // maximum-sized attachments must not materialize 100MiB in the API.
      const items = selectedIds.length ? await db.select().from(privateChatEnvelopesTable)
        .where(inArray(privateChatEnvelopesTable.id, selectedIds))
        .orderBy(asc(privateChatEnvelopesTable.createdAt), asc(privateChatEnvelopesTable.id)) : [];
      return { items, nextCursor: items.length ? cursorFor(items[items.length - 1]) : after ?? null, hasMore: rows.length > items.length };
    });
  }

  async sendMessage(userId: string, threadId: string, id: string, ciphertext: string): Promise<PrivateChatEnvelope> {
    return runInDatabaseTransaction(async () => {
      const thread = await this.authorizedThread(userId, threadId, 'send');
      const members = await this.identities(thread);
      const validated = await validatePrivateChatCiphertext(ciphertext, members.map(member => member.publicKey));
      const [existing] = await db.select().from(privateChatEnvelopesTable).where(eq(privateChatEnvelopesTable.id, id));
      if (existing) {
        if (existing.senderId !== userId || existing.threadId !== threadId || existing.ciphertext !== validated) throw conflict();
        return existing;
      }
      const [created] = await db.insert(privateChatEnvelopesTable).values({
        id, threadId, senderId: userId, ciphertext: validated,
        createdAt: sql`GREATEST(clock_timestamp(), COALESCE(
          (SELECT max(created_at) + interval '1 microsecond' FROM private_chat_envelopes WHERE thread_id=${threadId}::uuid),
          '-infinity'::timestamptz))`,
      }).onConflictDoNothing().returning();
      if (!created) throw conflict();
      await db.update(privateChatThreadsTable).set({ updatedAt: created.createdAt }).where(eq(privateChatThreadsTable.id, threadId));
      return created;
    });
  }
}
