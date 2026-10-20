import { pool } from "@workspace/db";
import { UserRepository } from "../repositories/user-repository.js";
import { DEFAULT_CONTENT_RATING, normalizeContentRating } from "../utils/content-safety.js";
import { evaluateAudience, type AudienceKind } from "../utils/audience-policy.js";
import { EligibilityService } from "./eligibility-service.js";
import { isEligibilityEnforcementEnabled } from "../eligibility/enforcement.js";
import { allowsRatedContent, contentEntityTypeFor, contentHashFor, contentRevisionFor, effectiveContentCeiling,
  type ApprovedContentClassification, type ContentEntityType } from "../eligibility/content-policy.js";
import { ContentClassificationRepository, type ContentClassificationSubject } from "../repositories/content-classification-repository.js";

type RatedContent = {
  id?: string;
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
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly eligibilityService = new EligibilityService(),
    private readonly classificationRepository = new ContentClassificationRepository(),
  ) {}

  private contentKey(entityType: ContentEntityType, item: Record<string, unknown>, hash = contentHashFor(item)) {
    return `${entityType}:${String(item.id)}:${contentRevisionFor(item, hash)}:${hash}`;
  }

  private async approvedClassifications(items: RatedContent[]): Promise<Map<string, ApprovedContentClassification>> {
    if (!isEligibilityEnforcementEnabled()) return new Map();
    const subjects: ContentClassificationSubject[] = items.flatMap(item => {
      const record = item as Record<string, unknown>;
      const entityType = contentEntityTypeFor(record);
      if (!entityType || typeof record.id !== "string") return [];
      const contentHash = contentHashFor(record);
      return [{ entityType, entityId: record.id, contentRevision: contentRevisionFor(record, contentHash), contentHash }];
    });
    const rows = await this.classificationRepository.findApproved(subjects);
    return new Map(rows.map(row => [`${row.entityType}:${row.entityId}:${row.contentRevision}:${row.contentHash}`, row]));
  }

  async getViewerFilter(viewerId?: string) {
    const eligibilityEnforced = isEligibilityEnforcementEnabled();
    if (!viewerId) return eligibilityEnforced ? "child_safe" as const : DEFAULT_CONTENT_RATING;
    const [viewer, decision] = await Promise.all([
      this.userRepository.findById(viewerId),
      eligibilityEnforced ? this.eligibilityService.decisionFor(viewerId) : Promise.resolve(undefined),
    ]);
    if (!viewer && eligibilityEnforced) return "child_safe" as const;
    return effectiveContentCeiling(viewer?.settings?.contentFilter, decision?.maximumContentRating);
  }

  async prepare(authorIds: string[], viewerId?: string, options: VisibilityOptions = {}) {
    return (await this.prepareContext(authorIds, viewerId, options)).allows;
  }

  async prepareContext(authorIds: string[], viewerId?: string, options: VisibilityOptions = {}, contentItems: RatedContent[] = []) {
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
    const eligibilityEnforced = isEligibilityEnforcementEnabled();
    const eligibilityDecision = viewerId && eligibilityEnforced
      ? await this.eligibilityService.decisionFor(viewerId)
      : undefined;
    const authorDecisions = eligibilityEnforced
      ? typeof this.eligibilityService.decisionForMany === 'function'
        ? await this.eligibilityService.decisionForMany(authors)
        : new Map(await Promise.all(authors.map(async id => [id,await this.eligibilityService.decisionFor(id)] as const)))
      : new Map();
    const viewerPreference = normalizeContentRating(viewer?.settings?.contentFilter);
    const anonymousMaximum = eligibilityEnforced && !viewerId ? "child_safe" : undefined;
    const classifications = await this.approvedClassifications(contentItems);
    const itemIds = contentItems.map(i => i.id).filter((id): id is string => typeof id === 'string');
    const checkedTargetIds = [...new Set([...itemIds, ...ids])];
    const enforcementsResult = checkedTargetIds.length > 0
      ? await pool.query<{ target_type: string; target_id: string; state: string; scope: string }>(
          `SELECT target_type, target_id, state, scope
           FROM moderation_enforcements
           WHERE target_id = ANY($1)
             AND (expires_at IS NULL OR expires_at > clock_timestamp())`,
          [checkedTargetIds]
        )
      : { rows: [] };
    const enforcementsByTargetId = new Map(enforcementsResult.rows.map(row => [row.target_id, row]));

    const allows = (item: RatedContent, authorId: string): boolean => {
      const author = byId.get(authorId);
      if (!author || (viewerId && !viewer)) return false;
      const authorDecision = authorDecisions.get(authorId);
      if (eligibilityEnforced && (!authorDecision?.activated || !authorDecision.capabilities.social)) return false;
      if (item.deletedAt || ['removed', 'quarantined', 'rejected'].includes(item.moderationStatus ?? '')) return false;
      if (['suspended', 'deactivated', 'deleted'].includes(author.accountStatus ?? 'active')) return false;
      if (viewer && ['suspended', 'deactivated', 'deleted'].includes(viewer.accountStatus ?? 'active')) return false;

      // Active moderation enforcements
      const authorEnforcement = enforcementsByTargetId.get(authorId);
      if (authorEnforcement?.target_type === 'user') {
        if (authorEnforcement.state === 'removed') return false;
        if (authorEnforcement.state === 'restricted') {
          if (authorEnforcement.scope === 'global') return false;
          if (options.discovery) return false;
        }
      }
      if (viewerId) {
        const viewerEnforcement = enforcementsByTargetId.get(viewerId);
        if (viewerEnforcement?.target_type === 'user' && viewerEnforcement.state === 'removed') return false;
      }
      if (typeof item.id === 'string') {
        const itemEnforcement = enforcementsByTargetId.get(item.id);
        if (itemEnforcement) {
          if (itemEnforcement.state === 'removed') return false;
          if (itemEnforcement.state === 'restricted') {
            if (itemEnforcement.scope === 'global') return false;
            if (itemEnforcement.scope === 'public' && options.discovery) return false;
            if (itemEnforcement.scope === 'direct_only' && !options.discovery && viewerId !== authorId && !relationships.following.has(authorId)) return false;
          }
        }
      }

      const record = item as Record<string, unknown>;
      const entityType = contentEntityTypeFor(record);
      if (!allowsRatedContent({ contentRating: item.contentRating, viewerPreference,
        maximumContentRating: eligibilityDecision?.maximumContentRating ?? anonymousMaximum, eligibilityEnforced,
        item: record, entityType, classification: entityType ? classifications.get(this.contentKey(entityType, record)) : undefined })) return false;
      if (options.discovery && item.distributionMode === 'profile_only') return false;
      if (viewerId && (author.blockedUsers?.includes(viewerId) || viewer?.blockedUsers?.includes(authorId))) return false;
      if (viewerId === authorId) return true;
      if (options.discovery && viewer?.mutedUsers?.includes(authorId)) return false;
      const visibility = eligibilityEnforced && authorDecision?.experience !== 'adult_18_plus' ? 'private'
        : author.privacy?.profileVisibility ?? (author.settings?.privateAccount ? 'private' : 'public');
      if (visibility !== 'public' && !relationships.following.has(authorId)) return false;
      return evaluateAudience({ ownerId: authorId, viewerId, audience: (item.audience ?? 'public') as AudienceKind,
        isFollowing: relationships.following.has(authorId), isCloseFriend: relationships.closeFriends.has(authorId),
        selectedMember: Boolean(viewerId && item.selectedMemberIds?.includes(viewerId)),
        excluded: Boolean(viewerId && item.excludedViewerIds?.includes(viewerId)), blocked: false }).allowed;
    };
    return { allows, relationshipScore: (authorId: string) => !viewerId ? 0 : viewerId === authorId ? 40
      : relationships.closeFriends.has(authorId) ? 30 : relationships.following.has(authorId) ? 20 : 0 };
  }

  async filterVisible<T extends RatedContent>(items: T[], viewerId?: string): Promise<T[]> {
    const filter = await this.getViewerFilter(viewerId);
    const classifications = await this.approvedClassifications(items);
    const itemIds = items.map(i => i.id).filter((id): id is string => typeof id === 'string');
    const enforcements = itemIds.length > 0
      ? await pool.query<{ target_id: string }>(
          `SELECT target_id FROM moderation_enforcements WHERE target_id = ANY($1) AND state = 'removed' AND (expires_at IS NULL OR expires_at > clock_timestamp())`,
          [itemIds]
        ).then(res => new Set(res.rows.map(r => r.target_id)))
      : new Set<string>();
    return items.filter(item => {
      if (typeof item.id === 'string' && enforcements.has(item.id)) return false;
      const record = item as Record<string, unknown>, entityType = contentEntityTypeFor(record);
      return allowsRatedContent({ contentRating: item.contentRating, viewerPreference: filter, eligibilityEnforced: isEligibilityEnforcementEnabled(),
        item: record, entityType, classification: entityType ? classifications.get(this.contentKey(entityType, record)) : undefined });
    });
  }

  async filterVisibleByAuthor<T extends RatedContent>(items: T[], viewerId: string | undefined, authorId: (item: T) => string, options: VisibilityOptions = {}): Promise<T[]> {
    if (!items.length) return [];
    const context = await this.prepareContext(items.map(authorId), viewerId, options, items);
    return items.filter(item => context.allows(item, authorId(item)));
  }

  async canViewAuthorContent(authorId: string, viewerId?: string): Promise<boolean> {
    return (await this.prepare([authorId], viewerId))({}, authorId);
  }

  async isVisible(item: RatedContent | undefined, viewerId?: string, authorId?: string): Promise<boolean> {
    if (!item) return false;
    if (!authorId) {
      return (await this.filterVisible([item], viewerId)).length > 0;
    }
    return (await this.prepareContext([authorId], viewerId, {}, [item])).allows(item, authorId);
  }
}
