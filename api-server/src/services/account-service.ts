import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { usersTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import { eraseAccountData } from "@workspace/db/account-erasure";
import { RedisRepository } from "../repositories/redis-repository.js";
import { UserRepository } from "../repositories/user-repository.js";
import { AccountExportNotFoundError, streamAccountExport } from "./account-export.js";

export class InvalidAccountPasswordError extends Error {}

/** Account lifecycle operations that must be deliberate and auditable. */
export class AccountService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly redisRepository: RedisRepository,
  ) {}

  streamAccountExport(userId: string, options?: { pageSize?: number; signal?: AbortSignal }): AsyncGenerator<string> {
    return streamAccountExport(userId, options);
  }

  /** Compatibility helper for internal callers. HTTP downloads consume the generator directly. */
  async exportAccount(userId: string): Promise<Record<string, unknown> | undefined> {
    try {
      const chunks: string[] = [];
      for await (const chunk of this.streamAccountExport(userId)) chunks.push(chunk);
      return JSON.parse(chunks.join('')) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof AccountExportNotFoundError) return undefined;
      throw error;
    }
  }

  async deleteAccount(userId: string, password: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new InvalidAccountPasswordError("Password confirmation failed");
    }

    const deleted = await db.transaction(async tx => {
      const [locked] = await tx.select().from(usersTable).where(eq(usersTable.id, userId)).for('update');
      if (!locked) return false;
      if (locked.passwordHash !== user.passwordHash) {
        throw new InvalidAccountPasswordError('Credentials changed; confirm the current password');
      }

      await eraseAccountData(statement => tx.execute(statement), locked);
      return true;
    });
    if (!deleted) return false;

    // Invalidate ordinary active sessions immediately after the durable
    // transaction commits. The queued account_cleanup job remains the retry
    // path for Redis outages, login approvals, and any sessions missed here.
    await this.redisRepository.keys(`session:${userId}:*`)
      .then((keys) => Promise.all(keys.map((key) => this.redisRepository.del(key))));
    return true;
  }
}
