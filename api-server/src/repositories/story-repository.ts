import { eq, gt, desc, and, inArray, or, sql } from "drizzle-orm";
import { storyPollOptionsTable, storyPollsTable, storyPollVotesTable, storiesTable } from "@workspace/db/schema";
import { db } from "@workspace/db";
import type { StoryRecord } from "../types/index.js";

export class StoryRepository {
  async create(story: StoryRecord, poll?: { id: string; question: string; options: Array<{ id: string; text: string; position: number }> }): Promise<StoryRecord> {
    const { poll: _poll, ...persistedStory } = story;
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
    return created as StoryRecord;
  }

  /** Only stories that haven't expired yet — matches the 24-hour-expiry pattern of the feature itself. */
  async listActive(): Promise<StoryRecord[]> {
    return (await db
      .select()
      .from(storiesTable)
      .where(or(eq(storiesTable.isHighlight, true), gt(storiesTable.expiresAt, new Date().toISOString())))
      .orderBy(desc(storiesTable.createdAt))
      .limit(100)) as StoryRecord[];
  }

  async findById(id: string): Promise<StoryRecord | undefined> {
    const [story] = await db.select().from(storiesTable).where(eq(storiesTable.id, id));
    return story as StoryRecord | undefined;
  }

  async update(id: string, updates: Partial<StoryRecord>): Promise<StoryRecord | undefined> {
    const { poll: _poll, ...persistedUpdates } = updates;
    const [updated] = await db.update(storiesTable).set(persistedUpdates).where(eq(storiesTable.id, id)).returning();
    return updated as StoryRecord | undefined;
  }

  async votePoll(storyId: string, optionId: string, userId: string): Promise<boolean> {
    const [poll] = await db.select({ id: storyPollsTable.id })
      .from(storyPollsTable)
      .where(eq(storyPollsTable.storyId, storyId))
      .limit(1);
    if (!poll) return false;
    const [option] = await db.select({ id: storyPollOptionsTable.id })
      .from(storyPollOptionsTable)
      .where(and(eq(storyPollOptionsTable.id, optionId), eq(storyPollOptionsTable.pollId, poll.id)))
      .limit(1);
    if (!option) return false;
    const inserted = await db.insert(storyPollVotesTable)
      .values({ pollId: poll.id, optionId, userId })
      .onConflictDoNothing()
      .returning({ pollId: storyPollVotesTable.pollId });
    if (inserted.length > 0) {
      await db.execute(sql`UPDATE story_poll_options SET vote_count = vote_count + 1 WHERE id = ${optionId}`);
    }
    return true;
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
}
