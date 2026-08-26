import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { contactShieldsTable, db, usersTable } from "@workspace/db";
import type { UserRecord } from "../types/index.js";
import {
  getContactIdentifierDigest,
  isValidContactIdentifier,
  normalizeContactIdentifier,
  type ContactIdentifierType,
} from "../utils/contact-shield.js";

export interface ContactShieldInput {
  type: ContactIdentifierType;
  value: string;
}

export interface ContactShieldView {
  id: string;
  type: ContactIdentifierType;
  createdAt: string;
}

export class ContactShieldService {
  async list(userId: string): Promise<ContactShieldView[]> {
    const shields = await db
      .select({ id: contactShieldsTable.id, type: contactShieldsTable.identifierType, createdAt: contactShieldsTable.createdAt })
      .from(contactShieldsTable)
      .where(eq(contactShieldsTable.ownerId, userId))
      .orderBy(contactShieldsTable.createdAt);

    return shields.map((shield) => ({
      id: shield.id,
      type: shield.type as ContactIdentifierType,
      createdAt: shield.createdAt,
    }));
  }

  async add(userId: string, inputs: ContactShieldInput[]): Promise<ContactShieldView[]> {
    if (inputs.length > 500) {
      throw new Error("You can shield up to 500 contacts at a time");
    }

    const owner = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    if (!owner[0]) throw new Error("User not found");

    const unique = new Map<string, ContactShieldInput>();
    for (const input of inputs) {
      const normalized = normalizeContactIdentifier(input.type, input.value);
      if (!isValidContactIdentifier(input.type, normalized)) {
        throw new Error(`Invalid ${input.type} contact`);
      }
      if (input.type === "email" && normalized === owner[0].email.trim().toLowerCase()) {
        continue;
      }
      unique.set(`${input.type}:${normalized}`, { type: input.type, value: normalized });
    }

    if (unique.size > 0) {
      await db.insert(contactShieldsTable).values(
        [...unique.values()].map((input) => ({
          id: randomUUID(),
          ownerId: userId,
          identifierType: input.type,
          identifierDigest: getContactIdentifierDigest(input.type, input.value),
        })),
      ).onConflictDoNothing();
    }

    return this.list(userId);
  }

  async remove(userId: string, shieldId: string): Promise<boolean> {
    const deleted = await db.delete(contactShieldsTable)
      .where(and(eq(contactShieldsTable.id, shieldId), eq(contactShieldsTable.ownerId, userId)))
      .returning({ id: contactShieldsTable.id });
    return deleted.length > 0;
  }

  async getShieldedUserIds(viewerId: string): Promise<Set<string>> {
    const viewer = await db
      .select({ id: usersTable.id, email: usersTable.email, contactIdentityDigest: usersTable.contactIdentityDigest, blockedUsers: usersTable.blockedUsers })
      .from(usersTable)
      .where(eq(usersTable.id, viewerId));
    if (!viewer[0]) return new Set();

    const viewerEmailDigest = viewer[0].contactIdentityDigest ?? getContactIdentifierDigest("email", viewer[0].email);
    const owned = await db
      .select({ digest: contactShieldsTable.identifierDigest })
      .from(contactShieldsTable)
      .where(and(eq(contactShieldsTable.ownerId, viewerId), eq(contactShieldsTable.identifierType, "email")));
    const ownedDigests = owned.map(({ digest }) => digest);

    const blockedByViewer = ownedDigests.length === 0
      ? []
      : await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(inArray(usersTable.contactIdentityDigest, ownedDigests));
    const blockedViewer = await db
      .select({ ownerId: contactShieldsTable.ownerId })
      .from(contactShieldsTable)
      .where(and(eq(contactShieldsTable.identifierType, "email"), eq(contactShieldsTable.identifierDigest, viewerEmailDigest)));
    const blockedByAccount = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`${usersTable.blockedUsers} @> ${JSON.stringify([viewerId])}::jsonb`);

    return new Set([
      ...blockedByViewer.map(({ id }) => id),
      ...blockedViewer.map(({ ownerId }) => ownerId),
      ...blockedByAccount.map(({ id }) => id),
      ...(Array.isArray(viewer[0].blockedUsers) ? viewer[0].blockedUsers.filter((id): id is string => typeof id === "string") : []),
    ].filter((id) => id !== viewerId));
  }

  async canView(viewerId: string, targetId: string): Promise<boolean> {
    if (viewerId === targetId) return true;
    const shielded = await this.getShieldedUserIds(viewerId);
    return !shielded.has(targetId);
  }

  async filterVisibleUsers(viewerId: string | undefined, users: UserRecord[]): Promise<UserRecord[]> {
    if (!viewerId || users.length === 0) return users;
    const shielded = await this.getShieldedUserIds(viewerId);
    return users.filter((user) => user.id === viewerId || !shielded.has(user.id));
  }
}
