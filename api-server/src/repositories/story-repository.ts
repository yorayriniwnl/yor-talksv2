import { eq, gt, desc, and, inArray, or, sql } from "drizzle-orm";
import { storyPollOptionsTable, storyPollsTable, storyPollVotesTable, storyReactionsTable, storiesTable, storyViewsTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { StoryRecord } from "../types/index.js";

export class StoryRepository {
  async create(story: StoryRecord, poll?: { id: string; question: string; options: Array<{ id: string; text: string; position: number }> }): Promise<StoryRecord> {
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
      return [createdStory];
    });
    return { ...(created as StoryRecord), viewerIds: [], reactions: [] };
  }

  /** Only stories that haven't expired yet — matches the 24-hour-expiry pattern of the feature itself. */
  async listActive(viewerId?: string): Promise<StoryRecord[]> {
    return this.hydrateViewerInteractions((await db
      .select()
      .from(storiesTable)
      .where(or(eq(storiesTable.isHighlight, true), gt(storiesTable.expiresAt, new Date().toISOString())))
      .orderBy(desc(storiesTable.createdAt))
      .limit(100)) as StoryRecord[], viewerId);
  }

  async findById(id: string, viewerId?: string): Promise<StoryRecord | undefined> {
    const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, id));
    return story ? (await this.hydrateViewerInteractions([story as StoryRecord], viewerId))[0] : undefined;
  }

  async findActiveById(id: string, viewerId?: string): Promise<StoryRecord | undefined> {
    const [story] = await db.select().from(storiesTable).where(and(
      eq(storiesTable.id, id),
      or(eq(storiesTable.isHighlight, true), gt(storiesTable.expiresAt, new Date().toISOString())),
    ));
    return story ? (await this.hydrateViewerInteractions([story as StoryRecord], viewerId))[0] : undefined;
  }

  async update(id: string, updates: Partial<StoryRecord>): Promise<StoryRecord | undefined> {
    const { poll: _poll, viewerIds: _viewerIds, reactions: _reactions, ...persistedUpdates } = updates;
    const [updated] = await db.update(storiesTable).set(persistedUpdates).where(eq(storiesTable.id, id)).returning();
    return updated as StoryRecord | undefined;
  }

  async addView(id: string, userId: string): Promise<StoryRecord | undefined> {
    await db.insert(storyViewsTable).values({ storyId: id, userId }).onConflictDoNothing();
    return this.findActiveById(id, userId);
  }

  async react(id: string, userId: string, emoji: string): Promise<StoryRecord | undefined> {
    await db.insert(storyReactionsTable).values({ storyId: id, userId, emoji })
      .onConflictDoUpdate({
        target: [storyReactionsTable.storyId, storyReactionsTable.userId],
        set: { emoji, updatedAt: new Date().toISOString() },
      });
    return this.findActiveById(id, userId);
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
      db.select({ storyId: storyReactionsTable.storyId, emoji: storyReactionsTable.emoji }).from(storyReactionsTable).where(and(
        eq(storyReactionsTable.userId, viewerId),
        inArray(storyReactionsTable.storyId, storyIds),
      )),
    ]);
    const viewed = new Set(views.map((view) => view.storyId));
    const reactionByStory = new Map(reactions.map((reaction) => [reaction.storyId, reaction.emoji]));
    return stories.map((story) => ({
      ...story,
      viewerIds: viewed.has(story.id) ? [viewerId] : [],
      reactions: reactionByStory.has(story.id) ? [{ userId: viewerId, emoji: reactionByStory.get(story.id) ?? "" }] : [],
    }));
  }
}
