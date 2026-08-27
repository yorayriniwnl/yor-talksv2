import { and, desc, eq, inArray, ne } from "drizzle-orm";
import {
  broadcastChannelMembersTable,
  broadcastChannelMessagesTable,
  broadcastChannelsTable,
  db,
} from "@workspace/db";
import type { BroadcastChannelMessageRecord, BroadcastChannelRecord } from "../types/index.js";

type ChannelRow = typeof broadcastChannelsTable.$inferSelect;

function toChannelRecord(channel: ChannelRow, memberCount: number, isMember: boolean, notificationsEnabled: boolean, viewerId: string): BroadcastChannelRecord {
  return {
    id: channel.id,
    ownerId: channel.ownerId,
    name: channel.name,
    description: channel.description,
    coverUrl: channel.coverUrl,
    contentCategory: channel.contentCategory,
    contentRating: channel.contentRating as BroadcastChannelRecord["contentRating"],
    memberCount,
    isMember,
    isOwner: channel.ownerId === viewerId,
    notificationsEnabled,
    createdAt: channel.createdAt,
    updatedAt: channel.updatedAt,
  };
}

export class BroadcastChannelRepository {
  async list(viewerId: string): Promise<BroadcastChannelRecord[]> {
    const channels = await db.select().from(broadcastChannelsTable)
      .orderBy(desc(broadcastChannelsTable.updatedAt), desc(broadcastChannelsTable.createdAt))
      .limit(100);
    if (channels.length === 0) return [];

    const memberships = await db.select({ channelId: broadcastChannelMembersTable.channelId, userId: broadcastChannelMembersTable.userId, notificationsEnabled: broadcastChannelMembersTable.notificationsEnabled })
      .from(broadcastChannelMembersTable)
      .where(inArray(broadcastChannelMembersTable.channelId, channels.map((channel) => channel.id)));
    const counts = new Map<string, number>();
    const viewerMemberships = new Set<string>();
    const viewerNotificationSettings = new Map<string, boolean>();
    for (const membership of memberships) {
      counts.set(membership.channelId, (counts.get(membership.channelId) ?? 0) + 1);
      if (membership.userId === viewerId) viewerMemberships.add(membership.channelId);
      if (membership.userId === viewerId) viewerNotificationSettings.set(membership.channelId, membership.notificationsEnabled);
    }
    return channels.map((channel) => toChannelRecord(channel, counts.get(channel.id) ?? 0, viewerMemberships.has(channel.id), viewerNotificationSettings.get(channel.id) ?? true, viewerId));
  }

  async findById(id: string, viewerId: string): Promise<BroadcastChannelRecord | undefined> {
    const [channel] = await db.select().from(broadcastChannelsTable).where(eq(broadcastChannelsTable.id, id)).limit(1);
    if (!channel) return undefined;
    const members = await db.select({ userId: broadcastChannelMembersTable.userId, notificationsEnabled: broadcastChannelMembersTable.notificationsEnabled })
      .from(broadcastChannelMembersTable)
      .where(eq(broadcastChannelMembersTable.channelId, id));
    return toChannelRecord(channel, members.length, members.some((member) => member.userId === viewerId), members.find((member) => member.userId === viewerId)?.notificationsEnabled ?? true, viewerId);
  }

  async create(input: {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    coverUrl?: string;
    contentCategory: string;
    contentRating: string;
    createdAt: string;
    updatedAt: string;
  }): Promise<BroadcastChannelRecord> {
    const [channel] = await db.transaction(async (tx) => {
      const [created] = await tx.insert(broadcastChannelsTable).values({
        ...input,
        coverUrl: input.coverUrl ?? null,
      }).returning();
      await tx.insert(broadcastChannelMembersTable).values({ channelId: created.id, userId: input.ownerId, role: "owner" });
      return [created];
    });
    return toChannelRecord(channel, 1, true, true, input.ownerId);
  }

  async join(channelId: string, userId: string): Promise<boolean> {
    const inserted = await db.insert(broadcastChannelMembersTable)
      .values({ channelId, userId, role: "subscriber" })
      .onConflictDoNothing()
      .returning({ channelId: broadcastChannelMembersTable.channelId });
    return inserted.length > 0;
  }

  async leave(channelId: string, userId: string): Promise<boolean> {
    const deleted = await db.delete(broadcastChannelMembersTable)
      .where(and(
        eq(broadcastChannelMembersTable.channelId, channelId),
        eq(broadcastChannelMembersTable.userId, userId),
        ne(broadcastChannelMembersTable.role, "owner"),
      ))
      .returning({ channelId: broadcastChannelMembersTable.channelId });
    return deleted.length > 0;
  }

  async isMember(channelId: string, userId: string): Promise<boolean> {
    const [membership] = await db.select({ userId: broadcastChannelMembersTable.userId })
      .from(broadcastChannelMembersTable)
      .where(and(eq(broadcastChannelMembersTable.channelId, channelId), eq(broadcastChannelMembersTable.userId, userId)))
      .limit(1);
    return Boolean(membership);
  }

  async listNotificationRecipients(channelId: string, ownerId: string): Promise<string[]> {
    const members = await db.select({ userId: broadcastChannelMembersTable.userId })
      .from(broadcastChannelMembersTable)
      .where(and(
        eq(broadcastChannelMembersTable.channelId, channelId),
        ne(broadcastChannelMembersTable.userId, ownerId),
        eq(broadcastChannelMembersTable.notificationsEnabled, true),
      ));
    return members.map((member) => member.userId);
  }

  async setNotifications(channelId: string, userId: string, enabled: boolean): Promise<boolean> {
    const updated = await db.update(broadcastChannelMembersTable)
      .set({ notificationsEnabled: enabled })
      .where(and(eq(broadcastChannelMembersTable.channelId, channelId), eq(broadcastChannelMembersTable.userId, userId)))
      .returning({ channelId: broadcastChannelMembersTable.channelId });
    return updated.length > 0;
  }

  async listMessages(channelId: string, userId: string, limit = 100): Promise<BroadcastChannelMessageRecord[] | undefined> {
    if (!(await this.isMember(channelId, userId))) return undefined;
    const messages = await db.select().from(broadcastChannelMessagesTable)
      .where(eq(broadcastChannelMessagesTable.channelId, channelId))
      .orderBy(desc(broadcastChannelMessagesTable.createdAt))
      .limit(Math.min(100, Math.max(1, limit)));
    return messages.reverse().map((message) => ({
      ...message,
      contentRating: message.contentRating as BroadcastChannelMessageRecord["contentRating"],
    }));
  }

  async createMessage(input: {
    id: string;
    channelId: string;
    authorId: string;
    content: string;
    contentCategory: string;
    contentRating: string;
    createdAt: string;
  }): Promise<BroadcastChannelMessageRecord | undefined> {
    const [channel] = await db.select({ ownerId: broadcastChannelsTable.ownerId })
      .from(broadcastChannelsTable)
      .where(eq(broadcastChannelsTable.id, input.channelId))
      .limit(1);
    if (!channel || channel.ownerId !== input.authorId) return undefined;
    const [message] = await db.insert(broadcastChannelMessagesTable).values(input).returning();
    await db.update(broadcastChannelsTable).set({ updatedAt: input.createdAt }).where(eq(broadcastChannelsTable.id, input.channelId));
    return message ? {
      ...message,
      contentRating: message.contentRating as BroadcastChannelMessageRecord["contentRating"],
    } : undefined;
  }
}
