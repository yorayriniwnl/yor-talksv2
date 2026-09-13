import { randomUUID } from "node:crypto";
import { eq, gt, desc, asc, and, inArray, or, sql, countDistinct } from "drizzle-orm";
import {
  highlightsTable,
  highlightItemsTable,
  storyAudienceExclusionsTable,
  storyAudienceMembersTable,
  storyPollOptionsTable,
  storyPollsTable,
  storyPollVotesTable,
  storyReactionsTable,
  storiesTable,
  storyViewEventsTable,
  storyViewsTable,
  usersTable,
} from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { HighlightRecord, StoryRecord } from "../types/index.js";
import type { StoryAnalyticsSummary, StoryViewExposure } from "../services/story-analytics-service.js";

export interface StoryViewerRow {
  viewerId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  viewedAt: string;
}

type StoryViewerCursor = Pick<StoryViewerRow, "viewerId" | "viewedAt">;

export function encodeStoryViewerCursor(row: StoryViewerCursor): string {
  return Buffer.from(JSON.stringify(row), "utf8").toString("base64url");
}

function decodeStoryViewerCursor(value: string | undefined): StoryViewerCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<StoryViewerCursor>;
    if (typeof parsed.viewerId === "string" && typeof parsed.viewedAt === "string") return parsed as StoryViewerCursor;
  } catch { /* malformed cursors start from the first page */ }
  return undefined;
}

export class StoryRepository {
  async listHighlights(ownerId: string): Promise<HighlightRecord[]> {
    const highlights = await db.select().from(highlightsTable)
      .where(eq(highlightsTable.ownerId, ownerId))
      .orderBy(desc(highlightsTable.updatedAt), desc(highlightsTable.createdAt));
    if (highlights.length === 0) return [];
    const items = await db.select().from(highlightItemsTable)
      .where(inArray(highlightItemsTable.highlightId, highlights.map((highlight) => highlight.id)))
      .orderBy(asc(highlightItemsTable.position), asc(highlightItemsTable.createdAt));
    const storyIdsByHighlight = new Map<string, string[]>();
    for (const item of items) {
      const storyIds = storyIdsByHighlight.get(item.highlightId) ?? [];
      storyIds.push(item.storyId);
      storyIdsByHighlight.set(item.highlightId, storyIds);
    }
    return highlights.map((highlight) => ({
      id: highlight.id,
      ownerId: highlight.ownerId,
      title: highlight.title,
      coverUrl: highlight.coverUrl,
      storyIds: storyIdsByHighlight.get(highlight.id) ?? [],
      createdAt: highlight.createdAt,
      updatedAt: highlight.updatedAt,
    }));
  }

  async createHighlight(ownerId: string, title: string, coverUrl?: string): Promise<HighlightRecord> {
    const now = new Date().toISOString();
    const [created] = await db.insert(highlightsTable).values({
      id: randomUUID(),
      ownerId,
      title,
      coverUrl: coverUrl || null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return { ...created, storyIds: [] };
  }

  async create(
    story: StoryRecord,
    poll?: { id: string; question: string; options: Array<{ id: string; text: string; position: number }> },
    audience?: { memberIds?: string[]; exclusionIds?: string[]; highlightId?: string },
  ): Promise<StoryRecord> {
    const { poll: _poll, viewerIds: _viewerIds, reactions: _reactions, ...persistedStory } = story;
    const [created] = await db.transaction(async (tx) => {
      const [createdStory] = await tx.insert(storiesTable).values(persistedStory).returning();
      if (poll) {
        await tx.insert(storyPollsTable).values({ id: poll.id, storyId: createdStory.id, question: poll.question });
        await tx.insert(storyPollOptionsTable).values(poll.options.map((option) => ({
          id: option.id,
          pollId: poll.id,
          text: option.text,
          position: option.position,
        })));
      }
      const memberIds = [...new Set(audience?.memberIds ?? [])];
      if (memberIds.length > 0) {
        await tx.insert(storyAudienceMembersTable).values(memberIds.map((userId) => ({ storyId: createdStory.id, userId }))).onConflictDoNothing();
      }
      const exclusionIds = [...new Set(audience?.exclusionIds ?? [])];
      if (exclusionIds.length > 0) {
        await tx.insert(storyAudienceExclusionsTable).values(exclusionIds.map((userId) => ({ storyId: createdStory.id, userId }))).onConflictDoNothing();
      }
      if (audience?.highlightId) {
        const [{ maxPosition }] = await tx.select({ maxPosition: sql<number>`coalesce(max(${highlightItemsTable.position}), -1)` })
          .from(highlightItemsTable)
          .where(eq(highlightItemsTable.highlightId, audience.highlightId));
        await tx.insert(highlightItemsTable).values({
          highlightId: audience.highlightId,
          storyId: createdStory.id,
          position: Number(maxPosition) + 1,
        }).onConflictDoNothing();
      }
      return [createdStory];
    });
    return { ...(created as StoryRecord), viewerIds: [], reactions: [] };
  }

  /** Only stories that haven't expired yet — matches the 24-hour-expiry pattern of the feature itself. */
  async listActive(viewerId?: string): Promise<StoryRecord[]> {
    return this.hydrateViewerInteractions((await db
      .select()
      .from(storiesTable)
      .where(and(eq(storiesTable.publishMode, "active"), gt(storiesTable.expiresAt, new Date().toISOString())))
      .orderBy(desc(storiesTable.publishedAt), desc(storiesTable.createdAt))
      .limit(100)) as StoryRecord[], viewerId);
  }

  async findById(id: string, viewerId?: string): Promise<StoryRecord | undefined> {
    const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, id));
    return story ? (await this.hydrateViewerInteractions([story as StoryRecord], viewerId))[0] : undefined;
  }

  async findActiveById(id: string, viewerId?: string): Promise<StoryRecord | undefined> {
    const [story] = await db.select().from(storiesTable).where(and(
      eq(storiesTable.id, id),
      eq(storiesTable.publishMode, "active"),
      gt(storiesTable.expiresAt, new Date().toISOString()),
    ));
    return story ? (await this.hydrateViewerInteractions([story as StoryRecord], viewerId))[0] : undefined;
  }

  async update(id: string, updates: Partial<StoryRecord>): Promise<StoryRecord | undefined> {
    const { poll: _poll, viewerIds: _viewerIds, reactions: _reactions, ...persistedUpdates } = updates;
    const [updated] = await db.update(storiesTable).set(persistedUpdates).where(eq(storiesTable.id, id)).returning();
    return updated as StoryRecord | undefined;
  }

  async addView(id: string, userId: string, eventKey: string, exposure: StoryViewExposure, viewedAt = new Date().toISOString()): Promise<StoryRecord | undefined> {
    await db.transaction(async (tx) => {
      const inserted = await tx.insert(storyViewEventsTable).values({
        id: randomUUID(),
        storyId: id,
        viewerId: userId,
        exposure,
        eventKey,
        viewedAt,
      }).onConflictDoNothing().returning({ id: storyViewEventsTable.id });
      if (inserted.length > 0) {
        await tx.insert(storyViewsTable).values({ storyId: id, userId, viewedAt }).onConflictDoNothing();
      }
    });
    return this.findActiveById(id, userId);
  }

  async react(id: string, userId: string, emoji: string, reactionType: "NORMAL_HEART" | "SUPER_HEART" | "CUSTOM"): Promise<StoryRecord | undefined> {
    await db.insert(storyReactionsTable).values({ storyId: id, userId, emoji, reactionType })
      .onConflictDoUpdate({
        target: [storyReactionsTable.storyId, storyReactionsTable.userId],
        set: { emoji, reactionType, updatedAt: new Date().toISOString() },
      });
    return this.findActiveById(id, userId);
  }

  async findReaction(id: string, userId: string): Promise<{ emoji: string; reactionType: "NORMAL_HEART" | "SUPER_HEART" | "CUSTOM" } | undefined> {
    const [reaction] = await db.select({ emoji: storyReactionsTable.emoji, reactionType: storyReactionsTable.reactionType })
      .from(storyReactionsTable)
      .where(and(eq(storyReactionsTable.storyId, id), eq(storyReactionsTable.userId, userId)))
      .limit(1);
    return reaction as { emoji: string; reactionType: "NORMAL_HEART" | "SUPER_HEART" | "CUSTOM" } | undefined;
  }

  async isAudienceMember(storyId: string, userId: string): Promise<boolean> {
    const [member] = await db.select({ userId: storyAudienceMembersTable.userId })
      .from(storyAudienceMembersTable)
      .where(and(eq(storyAudienceMembersTable.storyId, storyId), eq(storyAudienceMembersTable.userId, userId)))
      .limit(1);
    return Boolean(member);
  }

  async isAudienceExcluded(storyId: string, userId: string): Promise<boolean> {
    const [excluded] = await db.select({ userId: storyAudienceExclusionsTable.userId })
      .from(storyAudienceExclusionsTable)
      .where(and(eq(storyAudienceExclusionsTable.storyId, storyId), eq(storyAudienceExclusionsTable.userId, userId)))
      .limit(1);
    return Boolean(excluded);
  }

  async getHighlightOwner(highlightId: string): Promise<string | undefined> {
    const [highlight] = await db.select({ ownerId: highlightsTable.ownerId })
      .from(highlightsTable)
      .where(eq(highlightsTable.id, highlightId))
      .limit(1);
    return highlight?.ownerId;
  }

  async getAnalytics(storyId: string): Promise<StoryAnalyticsSummary> {
    const [summary] = await db.select({
      totalViews: sql<number>`count(*)`,
      uniqueViewers: countDistinct(sql`coalesce(${storyViewEventsTable.viewerId}::text, ${storyViewEventsTable.id}::text)`),
      identifiedViews: sql<number>`count(*) filter (where ${storyViewEventsTable.exposure} = 'identified')`,
      privateViews: sql<number>`count(*) filter (where ${storyViewEventsTable.exposure} = 'private')`,
    }).from(storyViewEventsTable).where(eq(storyViewEventsTable.storyId, storyId));
    const totalViews = Number(summary?.totalViews ?? 0);
    const uniqueViewers = Number(summary?.uniqueViewers ?? 0);
    const rewatches = Math.max(0, totalViews - uniqueViewers);
    return {
      totalViews,
      uniqueViewers,
      rewatches,
      rewatchRate: totalViews === 0 ? 0 : Number(((rewatches / totalViews) * 100).toFixed(1)),
      identifiedViews: Number(summary?.identifiedViews ?? 0),
      privateViews: Number(summary?.privateViews ?? 0),
    };
  }

  async listViewers(storyId: string, query = "", cursor?: string, limit = 30): Promise<{ viewers: StoryViewerRow[]; nextCursor: string | null }> {
    const decodedCursor = decodeStoryViewerCursor(cursor);
    const search = query.trim();
    const searchClause = search
      ? sql`AND (u.username ILIKE ${`%${search}%`} OR u.full_name ILIKE ${`%${search}%`})`
      : sql``;
    const cursorClause = decodedCursor
      ? sql`WHERE (latest."viewedAt" < ${decodedCursor.viewedAt}::timestamptz OR (latest."viewedAt" = ${decodedCursor.viewedAt}::timestamptz AND latest."viewerId" < ${decodedCursor.viewerId}))`
      : sql``;
    const rows = await db.execute(sql`
      WITH latest AS (
        SELECT DISTINCT ON (sve.viewer_id)
          sve.viewer_id AS "viewerId",
          u.username AS username,
          u.full_name AS "displayName",
          u.avatar_url AS "avatarUrl",
          sve.viewed_at AS "viewedAt"
        FROM story_view_events sve
        INNER JOIN users u ON u.id = sve.viewer_id
        WHERE sve.story_id = ${storyId}
          AND sve.exposure = 'identified'
          AND sve.viewer_id IS NOT NULL
          ${searchClause}
        ORDER BY sve.viewer_id, sve.viewed_at DESC, sve.id DESC
      )
      SELECT * FROM latest
      ${cursorClause}
      ORDER BY "viewedAt" DESC, "viewerId" DESC
      LIMIT ${Math.min(100, Math.max(1, limit + 1))}
    `);
    const viewers = (rows.rows as unknown as StoryViewerRow[]);
    const hasMore = viewers.length > limit;
    const visible = viewers.slice(0, limit);
    return {
      viewers: visible,
      nextCursor: hasMore && visible.length ? encodeStoryViewerCursor(visible[visible.length - 1]) : null,
    };
  }

  async votePoll(storyId: string, optionId: string, userId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [poll] = await tx.select({ id: storyPollsTable.id })
        .from(storyPollsTable)
        .where(eq(storyPollsTable.storyId, storyId))
        .limit(1);
      if (!poll) return false;
      const [option] = await tx.select({ id: storyPollOptionsTable.id })
        .from(storyPollOptionsTable)
        .where(and(eq(storyPollOptionsTable.id, optionId), eq(storyPollOptionsTable.pollId, poll.id)))
        .limit(1);
      if (!option) return false;
      const inserted = await tx.insert(storyPollVotesTable)
        .values({ pollId: poll.id, optionId, userId })
        .onConflictDoNothing()
        .returning({ pollId: storyPollVotesTable.pollId });
      if (inserted.length > 0) {
        await tx.execute(sql`UPDATE story_poll_options SET vote_count = vote_count + 1 WHERE id = ${optionId}`);
      }
      return true;
    });
  }

  async getPolls(storyIds: string[], userId?: string): Promise<Map<string, StoryRecord["poll"]>> {
    const result = new Map<string, StoryRecord["poll"]>();
    if (storyIds.length === 0) return result;
    const polls = await db.select().from(storyPollsTable).where(inArray(storyPollsTable.storyId, storyIds));
    if (polls.length === 0) return result;
    const pollIds = polls.map((poll) => poll.id);
    const options = await db.select().from(storyPollOptionsTable)
      .where(inArray(storyPollOptionsTable.pollId, pollIds))
      .orderBy(storyPollOptionsTable.position);
    const votes = userId
      ? await db.select({ pollId: storyPollVotesTable.pollId, optionId: storyPollVotesTable.optionId })
        .from(storyPollVotesTable)
        .where(and(inArray(storyPollVotesTable.pollId, pollIds), eq(storyPollVotesTable.userId, userId)))
      : [];
    const votedOptions = new Map(votes.map((vote) => [vote.pollId, vote.optionId]));
    const optionsByPoll = new Map<string, typeof options>();
    for (const option of options) {
      const current = optionsByPoll.get(option.pollId) ?? [];
      current.push(option);
      optionsByPoll.set(option.pollId, current);
    }
    for (const poll of polls) {
      const pollOptions = optionsByPoll.get(poll.id) ?? [];
      result.set(poll.storyId, {
        id: poll.id,
        question: poll.question,
        options: pollOptions.map((option) => ({ id: option.id, text: option.text, position: option.position, votes: option.voteCount })),
        totalVotes: pollOptions.reduce((total, option) => total + option.voteCount, 0),
        ...(votedOptions.has(poll.id) ? { votedOptionId: votedOptions.get(poll.id) } : {}),
      });
    }
    return result;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(storiesTable).where(eq(storiesTable.id, id)).returning();
    return result.length > 0;
  }

  private async hydrateViewerInteractions(stories: StoryRecord[], viewerId?: string): Promise<StoryRecord[]> {
    if (stories.length === 0) return [];
    if (!viewerId) return stories.map((story) => ({ ...story, viewerIds: [], reactions: [] }));
    const storyIds = stories.map((story) => story.id);
    const [views, reactions] = await Promise.all([
      db.select({ storyId: storyViewsTable.storyId }).from(storyViewsTable).where(and(
        eq(storyViewsTable.userId, viewerId),
        inArray(storyViewsTable.storyId, storyIds),
      )),
      db.select({ storyId: storyReactionsTable.storyId, emoji: storyReactionsTable.emoji, reactionType: storyReactionsTable.reactionType }).from(storyReactionsTable).where(and(
        eq(storyReactionsTable.userId, viewerId),
        inArray(storyReactionsTable.storyId, storyIds),
      )),
    ]);
    const viewed = new Set(views.map((view) => view.storyId));
    const reactionByStory = new Map(reactions.map((reaction) => [reaction.storyId, reaction]));
    return stories.map((story) => ({
      ...story,
      viewerIds: viewed.has(story.id) ? [viewerId] : [],
      reactions: reactionByStory.has(story.id) ? [{
        userId: viewerId,
        emoji: reactionByStory.get(story.id)?.emoji ?? "",
        reactionType: reactionByStory.get(story.id)?.reactionType as "NORMAL_HEART" | "SUPER_HEART" | "CUSTOM",
      }] : [],
    }));
  }
}
