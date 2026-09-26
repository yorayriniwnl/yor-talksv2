import { UserRepository } from "../repositories/user-repository.js";
import { canViewContent, DEFAULT_CONTENT_RATING, normalizeContentRating } from "../utils/content-safety.js";
import { evaluateAudience, type AudienceKind } from "../utils/audience-policy.js";

type RatedContent = {
  contentRating?: unknown;
  audience?: string;
  distributionMode?: string;
  deletedAt?: string | null;
  moderationStatus?: string;
  selectedMemberIds?: string[];
  excludedViewerIds?: string[];
};
export type VisibilityOptions = { discovery?: boolean };

/** One request-scoped policy for current records. Caches never supply authority. */
export class ContentSafetyService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async getViewerFilter(viewerId?: string) {
    if (!viewerId) return DEFAULT_CONTENT_RATING;
    return normalizeContentRating((await this.userRepository.findById(viewerId))?.settings?.contentFilter);
  }

  async prepare(authorIds: string[], viewerId?: string, options: VisibilityOptions = {}) {
    const authors = [...new Set(authorIds)];
    const ids = [...new Set([...authors, ...(viewerId ? [viewerId] : [])])];
    // The SQL repository executes one users query and one relationships query.
    const [users, relationships] = await Promise.all([
      this.userRepository.findByIds
        ? this.userRepository.findByIds(ids)
        : Promise.all(ids.map(id => this.userRepository.findById(id))),
      !viewerId ? Promise.resolve({ following: new Set<string>(), closeFriends: new Set<string>() })
        : this.userRepository.audienceRelationships ? this.userRepository.audienceRelationships(viewerId, authors)
        : Promise.all(authors.map(async id => ({ id, follows: await this.userRepository.isFollowing(viewerId, id),
          close: this.userRepository.isCloseFriend ? await this.userRepository.isCloseFriend(id, viewerId) : false })))
          .then(rows => ({ following: new Set(rows.filter(row => row.follows).map(row => row.id)), closeFriends: new Set(rows.filter(row => row.close).map(row => row.id)) })),
    ]);
    const byId = new Map(users.filter(user => !!user).map(user => [user!.id, user!]));
    const viewer = viewerId ? byId.get(viewerId) : undefined;
    const viewerFilter = normalizeContentRating(viewer?.settings?.contentFilter);
    return (item: RatedContent, authorId: string): boolean => {
      const author = byId.get(authorId);
      if (!author || (viewerId && !viewer)) return false;
      if (item.deletedAt || ['removed', 'quarantined', 'rejected'].includes(item.moderationStatus ?? '')) return false;
      if (['suspended', 'deactivated', 'deleted'].includes(author.accountStatus ?? 'active')) return false;
      if (viewer && ['suspended', 'deactivated', 'deleted'].includes(viewer.accountStatus ?? 'active')) return false;
      if (!canViewContent(item.contentRating, viewerFilter)) return false;
      if (options.discovery && item.distributionMode === 'profile_only') return false;
      if (viewerId && (author.blockedUsers?.includes(viewerId) || viewer?.blockedUsers?.includes(authorId))) return false;
      if (viewerId === authorId) return true;
      if (options.discovery && viewer?.mutedUsers?.includes(authorId)) return false;
      const visibility = author.privacy?.profileVisibility ?? (author.settings?.privateAccount ? 'private' : 'public');
      if (visibility !== 'public' && !relationships.following.has(authorId)) return false;
      return evaluateAudience({ ownerId: authorId, viewerId, audience: (item.audience ?? 'public') as AudienceKind,
        isFollowing: relationships.following.has(authorId), isCloseFriend: relationships.closeFriends.has(authorId),
        selectedMember: Boolean(viewerId && item.selectedMemberIds?.includes(viewerId)),
        excluded: Boolean(viewerId && item.excludedViewerIds?.includes(viewerId)), blocked: false }).allowed;
    };
  }

  async filterVisible<T extends RatedContent>(items: T[], viewerId?: string): Promise<T[]> {
    const filter = await this.getViewerFilter(viewerId);
    return items.filter(item => canViewContent(item.contentRating, filter));
  }

  async filterVisibleByAuthor<T extends RatedContent>(items: T[], viewerId: string | undefined, authorId: (item: T) => string, options: VisibilityOptions = {}): Promise<T[]> {
    if (!items.length) return [];
    const allows = await this.prepare(items.map(authorId), viewerId, options);
    return items.filter(item => allows(item, authorId(item)));
  }

  async canViewAuthorContent(authorId: string, viewerId?: string): Promise<boolean> {
    return (await this.prepare([authorId], viewerId))({}, authorId);
  }

  async isVisible(item: RatedContent | undefined, viewerId?: string, authorId?: string): Promise<boolean> {
    if (!item) return false;
    if (!authorId) return canViewContent(item.contentRating, await this.getViewerFilter(viewerId));
    return (await this.prepare([authorId], viewerId))(item, authorId);
  }
}
