import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import {
  commentsTable,
  contactShieldsTable,
  invitesTable,
  ledgerTransactionsTable,
  postsTable,
  reportsTable,
  userFollowsTable,
  usersTable,
} from "@workspace/db/schema";
import { db } from "@workspace/db";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { toOwnUser } from "../utils/user-view.js";

export class InvalidAccountPasswordError extends Error {}

/** Account lifecycle operations that must be deliberate and auditable. */
export class AccountService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisRepository: RedisRepository,
  ) {}

  async exportAccount(userId: string): Promise<Record<string, unknown> | undefined> {
    const user = await this.userRepository.findById(userId);
    if (!user) return undefined;

    const [posts, comments, following, followers, reports, shields] = await Promise.all([
      db.select().from(postsTable).where(eq(postsTable.authorId, userId)),
      db.select().from(commentsTable).where(eq(commentsTable.authorId, userId)),
      db.select().from(userFollowsTable).where(eq(userFollowsTable.followerId, userId)),
      db.select().from(userFollowsTable).where(eq(userFollowsTable.followingId, userId)),
      db.select().from(reportsTable).where(eq(reportsTable.reporterId, userId)),
      db.select({ id: contactShieldsTable.id, type: contactShieldsTable.identifierType, createdAt: contactShieldsTable.createdAt })
        .from(contactShieldsTable)
        .where(eq(contactShieldsTable.ownerId, userId)),
    ]);

    return {
      format: "yor-talks-account-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      account: toOwnUser(user),
      content: { posts, comments },
      relationships: { following, followers },
      reports,
      contactShields: shields,
    };
  }

  async deleteAccount(userId: string, password: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new InvalidAccountPasswordError("Password confirmation failed");
    }

    // Preserve financial audit rows without retaining a deleted user's
    // identity, and detach invite references that are intentionally nullable.
    await db.update(ledgerTransactionsTable)
      .set({ creditAccountId: null, debitAccountId: null })
      .where(or(eq(ledgerTransactionsTable.creditAccountId, userId), eq(ledgerTransactionsTable.debitAccountId, userId)));
    await db.update(invitesTable)
      .set({ inviteeId: null })
      .where(eq(invitesTable.inviteeId, userId));

    await this.redisRepository.keys(`session:${userId}:*`).then((keys) => Promise.all(keys.map((key) => this.redisRepository.del(key))));
    await this.userRepository.deleteById(userId);
    return true;
  }
}
