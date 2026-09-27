import { UserRepository } from "../repositories/user-repository.js";
import type { UserRecord } from "../types/index.js";
import {
  canViewContent,
  DEFAULT_CONTENT_RATING,
  normalizeContentRating,
} from "../utils/content-safety.js";

type RatedContent = { contentRating?: unknown | null; moderationStatus?: string | null };

/** Resolves a viewer's maximum content level and applies it consistently to public content. */
export class ContentSafetyService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async getViewerFilter(viewerId?: string) {
    if (!viewerId) return DEFAULT_CONTENT_RATING;
    const user = await this.userRepository.findById(viewerId);
    return normalizeContentRating(user?.settings?.contentFilter);
  }

  async filterVisible<T extends RatedContent>(items: T[], viewerId?: string): Promise<T[]> {
    const viewerFilter = await this.getViewerFilter(viewerId);
    return items.filter((item) => canViewContent(item.contentRating, viewerFilter));
  }

  async canViewAuthorContent(authorId: string, viewerId?: string): Promise<boolean> {
    const [author, viewer] = await Promise.all([
      this.userRepository.findById(authorId),
      viewerId ? this.userRepository.findById(viewerId) : Promise.resolve(undefined),
    ]);
    if (!this.active(author) || (viewerId && !this.active(viewer))) return false;
    if (authorId === viewerId) return true;
    if (viewerId && (
      author.blockedUsers?.includes(viewerId)
      || viewer?.blockedUsers?.includes(authorId)
      || viewer?.mutedUsers?.includes(authorId)
    )) return false;
    const visibility = author.privacy?.profileVisibility ?? (author.settings?.privateAccount ? "private" : "public");
    if (visibility === "public") return true;
    return Boolean(viewerId && await this.userRepository.isFollowing(viewerId, authorId));
  }

  async filterVisibleByAuthor<T extends RatedContent>(items: T[], viewerId: string | undefined, getAuthorId: (item: T) => string): Promise<T[]> {
    return this.filterWithPolicy(items, viewerId, getAuthorId);
  }

  private active(user: UserRecord | undefined): user is UserRecord {
    return Boolean(user && (!user.accountStatus || user.accountStatus === "active"));
  }

  /** All post reads and interactions use this policy, including search. */
  async filterVisiblePosts<T extends RatedContent & { authorId: string; audience?: string | null }>(items: T[], viewerId?: string): Promise<T[]> {
    return this.filterWithPolicy(items, viewerId, (item) => item.authorId, (item) => item.audience ?? "public");
  }

  private async filterWithPolicy<T extends RatedContent>(items: T[], viewerId: string | undefined, authorId: (item: T) => string, audience?: (item: T) => string): Promise<T[]> {
    if (!items.length) return [];
    // Request-scoped context: privacy changes take effect on the next read.
    const ids = [...new Set([...items.map(authorId), ...(viewerId ? [viewerId] : [])])];
    const users = await this.userRepository.findByIds(ids);
    const byId = new Map(users.map((user) => [user.id, user]));
    const viewer = viewerId ? byId.get(viewerId) : undefined;
    if (viewerId && !this.active(viewer)) return [];
    const filter = normalizeContentRating(viewer?.settings?.contentFilter);
    const relationships = viewerId
      ? await this.userRepository.getVisibilityRelationships(viewerId, ids)
      : { following: new Set<string>(), closeFriends: new Set<string>() };
    return items.filter((item) => {
      if (item.moderationStatus === "removed" || !canViewContent(item.contentRating, filter)) return false;
      const ownerId = authorId(item);
      const owner = byId.get(ownerId);
      if (!this.active(owner)) return false;
      if (ownerId === viewerId) return true;
      if (viewerId && (owner.blockedUsers?.includes(viewerId) || viewer?.blockedUsers?.includes(ownerId) || viewer?.mutedUsers?.includes(ownerId))) return false;
      const visibility = owner.privacy?.profileVisibility ?? (owner.settings?.privateAccount ? "private" : "public");
      if (visibility !== "public" && !relationships.following.has(ownerId)) return false;
      switch (audience?.(item) ?? "public") {
        case "public": return true;
        case "followers": return relationships.following.has(ownerId);
        case "close_friends": return relationships.closeFriends.has(ownerId);
        default: return false;
      }
    });
  }

  async isVisible(item: RatedContent | undefined, viewerId?: string, authorId?: string): Promise<boolean> {
    if (!item || item.moderationStatus === "removed") return false;
    if (!canViewContent(item.contentRating, await this.getViewerFilter(viewerId))) return false;
    return authorId ? this.canViewAuthorContent(authorId, viewerId) : true;
  }
}
