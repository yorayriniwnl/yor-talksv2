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

  async isVisible(item: RatedContent | undefined, viewerId?: string): Promise<boolean> {
    if (!item) return false;
    return canViewContent(item.contentRating, await this.getViewerFilter(viewerId));
  }
}
