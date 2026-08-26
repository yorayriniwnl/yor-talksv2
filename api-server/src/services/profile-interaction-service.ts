import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { profileCommentsTable, profileShowcasesTable } from "@workspace/db/schema";
import { UserRepository } from "../repositories/user-repository.js";
import { enforceTextContentPolicy } from "./content-policy-service.js";
import type { ProfileCommentRecord, ProfileShowcaseRecord, UserRecord } from "../types/index.js";

export class ProfileInteractionRequestError extends Error {}
export class ProfileInteractionForbiddenError extends Error {}
export class ProfileInteractionService {
  constructor(private readonly userRepository = new UserRepository()) {}

  private async assertVisible(profileId: string, viewerId: string): Promise<UserRecord> {
    const profile = await this.userRepository.findById(profileId);
    if (!profile) throw new ProfileInteractionRequestError("Profile not found");
    if (profileId === viewerId) return profile;
    if (profile.blockedUsers?.includes(viewerId)) throw new ProfileInteractionForbiddenError("This profile is unavailable");
    const viewer = await this.userRepository.findById(viewerId);
    if (viewer?.blockedUsers?.includes(profileId)) throw new ProfileInteractionForbiddenError("This profile is unavailable");
    const visibility = profile.privacy?.profileVisibility ?? (profile.settings?.privateAccount ? "private" : "public");
    if (visibility === "private" || (visibility === "followers" && !(await this.userRepository.isFollowing(viewerId, profileId)))) {
      throw new ProfileInteractionForbiddenError("Follow this profile to view its interactions");
    }
    return profile;
  }

  async listCommentsWithAuthors(profileId: string, viewerId: string) {
    await this.assertVisible(profileId, viewerId);
    const rows = await db.select().from(profileCommentsTable).where(eq(profileCommentsTable.profileId, profileId)).orderBy(asc(profileCommentsTable.createdAt));
    return Promise.all(rows.map(async (comment) => ({ comment: comment as ProfileCommentRecord, author: await this.userRepository.findById(comment.authorId) })));
  }

  async createComment(profileId: string, authorId: string, content: string) {
    const profile = await this.assertVisible(profileId, authorId);
    const author = await this.userRepository.findById(authorId);
    if (!author || profile.blockedUsers?.includes(authorId) || author.blockedUsers?.includes(profileId)) throw new ProfileInteractionForbiddenError("You cannot comment on this profile");
    const normalizedContent = content.trim();
    await enforceTextContentPolicy(normalizedContent, undefined, "profile comment");
    const [created] = await db.insert(profileCommentsTable).values({
      id: randomUUID(),
      profileId,
      authorId,
      content: normalizedContent,
    }).returning();
    return { comment: created as ProfileCommentRecord, author };
  }

  async deleteComment(profileId: string, commentId: string, requesterId: string) {
    const [comment] = await db.select().from(profileCommentsTable).where(and(eq(profileCommentsTable.id, commentId), eq(profileCommentsTable.profileId, profileId)));
    if (!comment) throw new ProfileInteractionRequestError("Profile comment not found");
    if (comment.authorId !== requesterId && profileId !== requesterId) throw new ProfileInteractionForbiddenError("You cannot delete this comment");
    await db.delete(profileCommentsTable).where(eq(profileCommentsTable.id, commentId));
    return comment as ProfileCommentRecord;
  }

  async listShowcases(profileId: string, viewerId: string) {
    await this.assertVisible(profileId, viewerId);
    return (await db.select().from(profileShowcasesTable).where(eq(profileShowcasesTable.userId, profileId)).orderBy(asc(profileShowcasesTable.createdAt))) as ProfileShowcaseRecord[];
  }

  async createShowcase(userId: string, input: Omit<ProfileShowcaseRecord, "id" | "userId" | "createdAt" | "updatedAt">) {
    const [created] = await db.insert(profileShowcasesTable).values({ id: randomUUID(), userId, ...input }).returning();
    return created as ProfileShowcaseRecord;
  }

  async deleteShowcase(userId: string, showcaseId: string) {
    const [deleted] = await db.delete(profileShowcasesTable).where(and(eq(profileShowcasesTable.id, showcaseId), eq(profileShowcasesTable.userId, userId))).returning();
    if (!deleted) throw new ProfileInteractionRequestError("Showcase not found");
    return deleted as ProfileShowcaseRecord;
  }
}
