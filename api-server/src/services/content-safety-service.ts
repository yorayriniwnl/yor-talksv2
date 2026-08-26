import { UserRepository } from "../repositories/user-repository.js";
import {
  canViewContent,
  DEFAULT_CONTENT_RATING,
  normalizeContentRating,
} from "../utils/content-safety.js";

type RatedContent = { contentRating?: unknown | null };

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
    if (!viewerId || authorId === viewerId) return true;
    const author = await this.userRepository.findById(authorId);
    if (!author) return false;
    const visibility = author.privacy?.profileVisibility ?? (author.settings?.privateAccount ? "private" : "public");
    return visibility === "public" || await this.userRepository.isFollowing(viewerId, authorId);
  }

  async filterVisibleByAuthor<T extends RatedContent>(items: T[], viewerId: string | undefined, getAuthorId: (item: T) => string): Promise<T[]> {
    const contentVisible = await this.filterVisible(items, viewerId);
    if (!viewerId) return contentVisible;
    const visible = await Promise.all(contentVisible.map(async (item) => ({
      item,
      allowed: await this.canViewAuthorContent(getAuthorId(item), viewerId),
    })));
    return visible.filter(({ allowed }) => allowed).map(({ item }) => item);
  }

  async isVisible(item: RatedContent | undefined, viewerId?: string, authorId?: string): Promise<boolean> {
    if (!item) return false;
    if (!canViewContent(item.contentRating, await this.getViewerFilter(viewerId))) return false;
    return authorId ? this.canViewAuthorContent(authorId, viewerId) : true;
  }
}
