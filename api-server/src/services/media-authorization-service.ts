import { pool } from '@workspace/db';
import { EligibilityService } from './eligibility-service.js';
import { ContentSafetyService } from './content-safety-service.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { ConversationRepository } from '../repositories/message-repository.js';
import { ContactAuthorizationDeniedError, ContactAuthorizationService } from './contact-authorization-service.js';
import { loadOperatorPolicyIds } from '../eligibility/territory-policy.js';
import { MediaLifecycleError, type MediaAssetRow } from './media-service.js';

export type MediaEntityType = 'users' | 'posts' | 'stories' | 'user_notes' | 'videos' | 'articles' | 'products'
  | 'events' | 'live_streams' | 'communities' | 'comments' | 'video_comments' | 'messages' | 'highlights'
  | 'profile_showcases' | 'business_profiles' | 'broadcast_channels' | 'owner-preview';
export type MediaViewer =
  | { kind: 'user'; userId: string; deviceId: string; authVersion: number; eligibilityRevision: string }
  | { kind: 'anonymous'; eligibilityRevision: string };
export interface MediaGrantContext {
  v: 2;
  assetId: string;
  entityType: MediaEntityType;
  entityId: string;
  slot: string;
  variant: 'original' | 'poster';
  ownerPreview: boolean;
  viewer: MediaViewer;
  policyRevision: string;
  exp: number;
}
export interface MediaRequester {
  userId?: string;
  deviceId?: string;
  authVersion?: number;
}

const resources: Partial<Record<MediaEntityType, { table: string; owner: string }>> = {
  posts: { table: 'posts', owner: 'author_id' }, stories: { table: 'stories', owner: 'author_id' },
  user_notes: { table: 'user_notes', owner: 'author_id' }, videos: { table: 'videos', owner: 'author_id' },
  articles: { table: 'articles', owner: 'author_id' }, products: { table: 'products', owner: 'seller_id' },
  events: { table: 'events', owner: 'host_id' }, live_streams: { table: 'live_streams', owner: 'host_id' },
  communities: { table: 'communities', owner: 'owner_id' }, comments: { table: 'comments', owner: 'author_id' },
  video_comments: { table: 'video_comments', owner: 'author_id' }, highlights: { table: 'highlights', owner: 'owner_id' },
  profile_showcases: { table: 'profile_showcases', owner: 'user_id' }, business_profiles: { table: 'business_profiles', owner: 'owner_id' },
  broadcast_channels: { table: 'broadcast_channels', owner: 'owner_id' },
};
const denied = () => new MediaLifecycleError('Media is not available to this viewer', 404, 'media_not_available');
const camel = (key: string) => key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
function recordFromRow(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [camel(key), item]));
}

/** Resolves media authority from current sessions, references and entity records. */
export class MediaAuthorizationService {
  constructor(
    private readonly eligibility = new EligibilityService(),
    private readonly safety = new ContentSafetyService(),
    private readonly users = new UserRepository(),
    private readonly redis = new RedisRepository(),
    private readonly conversations = new ConversationRepository(),
    private readonly contactAuthorization = new ContactAuthorizationService(),
  ) {}

  async authorize(context: MediaGrantContext, asset: MediaAssetRow, requester: MediaRequester = {}): Promise<void> {
    if (context.v !== 2 || context.assetId !== asset.id || context.ownerPreview !== (context.entityType === 'owner-preview')
      || context.viewer.eligibilityRevision !== context.policyRevision) throw denied();
    if (context.ownerPreview) {
      if (context.viewer.kind !== 'user' || requester.userId !== context.viewer.userId || asset.owner_id !== context.viewer.userId
        || requester.deviceId !== context.viewer.deviceId || requester.authVersion !== context.viewer.authVersion) throw denied();
      const decision = await this.currentUser(context, requester);
      if (!decision.activated || !decision.capabilities.publish || decision.revision !== context.policyRevision) throw denied();
      return;
    }

    const reference = await pool.query(`SELECT 1 FROM media_references WHERE media_id=$1 AND entity_type=$2 AND entity_id=$3 AND slot=$4`,
      [context.assetId, context.entityType, context.entityId, context.slot]);
    if (!reference.rowCount) throw denied();

    if (context.viewer.kind === 'user') {
      if (requester.userId !== context.viewer.userId || requester.deviceId !== context.viewer.deviceId
        || requester.authVersion !== context.viewer.authVersion) throw denied();
      const decision = await this.currentUser(context, requester);
      if (!decision.activated || !decision.capabilities.social || decision.revision !== context.policyRevision) throw denied();
      if (await this.entityVisible(context, context.viewer.userId)) return;
      throw denied();
    }

    const publicDecision = await this.eligibility.publicDecision({ operatorPolicyIds: loadOperatorPolicyIds() });
    if (!publicDecision.publicBrowsingAllowed || publicDecision.revision !== context.policyRevision) throw denied();
    if (await this.entityVisible(context)) return;
    throw denied();
  }

  private async currentUser(context: MediaGrantContext, requester: MediaRequester) {
    if (context.viewer.kind !== 'user' || !requester.userId || !requester.deviceId) throw denied();
    const [rawSession, user, decision] = await Promise.all([
      this.redis.getStrict(`session:${requester.userId}:${requester.deviceId}`),
      this.users.findById(requester.userId),
      this.eligibility.decisionFor(requester.userId),
    ]);
    if (!rawSession || !user || (user.authVersion ?? 0) !== requester.authVersion || user.accountStatus !== 'active') throw denied();
    return decision;
  }

  private async entityVisible(context: MediaGrantContext, viewerId?: string): Promise<boolean> {
    if (context.entityType === 'users') {
      return this.profileVisible(context.entityId, viewerId);
    }
    if (context.entityType === 'messages') {
      const result = await pool.query<{ conversation_id: string; deleted_at: string | null; expires_at: string | null }>(
        `SELECT conversation_id,deleted_at,expires_at FROM messages WHERE id=$1`, [context.entityId]);
      const message = result.rows[0];
      if (!message || message.deleted_at || (message.expires_at && Date.parse(message.expires_at) <= Date.now())) return false;
      if (!viewerId) return false;
      const members=await this.conversations.getMembers(message.conversation_id);
      if(!members.includes(viewerId))return false;
      try { await this.contactAuthorization.requirePairwiseContacts(members,'read'); return true; }
      catch(error) { if(error instanceof ContactAuthorizationDeniedError)return false; throw error; }
    }
    if (context.entityType === 'comments' || context.entityType === 'video_comments') {
      const table = context.entityType === 'comments' ? 'comments' : 'video_comments';
      const parentColumn = context.entityType === 'comments' ? 'post_id' : 'video_id';
      const parentTable = context.entityType === 'comments' ? 'posts' : 'videos';
      const result = await pool.query<{ row: Record<string, unknown>; parent_id: string }>(`SELECT to_jsonb(c) AS row,c.${parentColumn} AS parent_id FROM "${table}" c WHERE c.id=$1`, [context.entityId]);
      const comment = recordFromRow(result.rows[0]?.row);
      const parentId = result.rows[0]?.parent_id;
      if (!comment || typeof comment.authorId !== 'string' || typeof parentId !== 'string') return false;
      const parentResult = await pool.query<{ row: Record<string, unknown>; owner_id: string }>(
        `SELECT to_jsonb(p) AS row,p.author_id AS owner_id FROM "${parentTable}" p WHERE p.id=$1`, [parentId]);
      const parent = recordFromRow(parentResult.rows[0]?.row);
      if (!parent || !parentResult.rows[0]) return false;
      if (!await this.safety.isVisible(parent, viewerId, String(parentResult.rows[0].owner_id))) return false;
      return this.safety.isVisible(comment, viewerId, comment.authorId);
    }
    const config = resources[context.entityType];
    if (!config) return false;
    const result = await pool.query<{ row: Record<string, unknown>; owner_id: string }>(
      `SELECT to_jsonb(e) AS row,e."${config.owner}" AS owner_id FROM "${config.table}" e WHERE e.id=$1`, [context.entityId]);
    const entity = recordFromRow(result.rows[0]?.row), ownerId = result.rows[0]?.owner_id;
    if (!entity || typeof ownerId !== 'string') return false;
    if (['highlights','profile_showcases','business_profiles'].includes(context.entityType)) return this.profileVisible(ownerId, viewerId);
    if (context.entityType === 'stories' && viewerId) {
      const [selected, excluded] = await Promise.all([
        pool.query('SELECT 1 FROM story_audience_members WHERE story_id=$1 AND user_id=$2', [context.entityId, viewerId]),
        pool.query('SELECT 1 FROM story_audience_exclusions WHERE story_id=$1 AND user_id=$2', [context.entityId, viewerId]),
      ]);
      entity.selectedMemberIds = selected.rowCount ? [viewerId] : [];
      entity.excludedViewerIds = excluded.rowCount ? [viewerId] : [];
    }
    if (context.entityType === 'posts' && entity.authorId === undefined) entity.authorId = ownerId;
    if (context.entityType === 'stories' && entity.authorId === undefined) entity.authorId = ownerId;
    if (context.entityType === 'profile_showcases' && entity.authorId === undefined) entity.authorId = ownerId;
    if (context.entityType === 'highlights' && entity.authorId === undefined) entity.authorId = ownerId;
    if (context.entityType === 'business_profiles' && entity.authorId === undefined) entity.authorId = ownerId;
    if (context.entityType === 'broadcast_channels' && entity.authorId === undefined) entity.authorId = ownerId;
    return this.safety.isVisible(entity, viewerId, ownerId);
  }

  private async profileVisible(ownerId: string, viewerId?: string): Promise<boolean> {
    const owner = await this.users.findById(ownerId);
    if (!owner || (owner.accountStatus ?? 'active') !== 'active' || !(await this.eligibility.decisionFor(ownerId)).activated) return false;
    const viewer = viewerId ? await this.users.findById(viewerId) : undefined;
    if (viewerId && (!viewer || (viewer.accountStatus ?? 'active') !== 'active' || owner.blockedUsers?.includes(viewerId)
      || viewer.blockedUsers?.includes(ownerId))) return false;
    if (viewerId === ownerId) return true;
    const visibility = owner.privacy?.profileVisibility ?? (owner.settings?.privateAccount ? 'private' : 'public');
    if (visibility === 'public') return true;
    return Boolean(viewerId && await this.users.isFollowing(viewerId, ownerId));
  }
}
