import { sql, type SQLWrapper } from 'drizzle-orm';
import type { ContentRating } from '../utils/content-safety.js';
import { CONTENT_CLASSIFICATION_POLICY_VERSION, type ContentEntityType } from '../eligibility/content-policy.js';
import { isEligibilityEnforcementEnabled } from '../eligibility/enforcement.js';

/** Candidate reduction before LIMIT. Services still apply the shared current-record policy.
 * Columns are trusted schema objects; every viewer value remains parameterized. */
export function discoveryScope(columns: { authorId: SQLWrapper; audience: SQLWrapper; contentRating: SQLWrapper; storyId?: SQLWrapper;
  entityId?: SQLWrapper; entityType?: ContentEntityType }, viewerId?: string, viewerCeiling?: ContentRating,
  requireApprovedChildSafe = isEligibilityEnforcementEnabled()) {
  const { authorId, audience, contentRating, storyId, entityId, entityType } = columns;
  const publicAuthor = sql`coalesce(a.privacy->>'profileVisibility',
    case when a.settings->>'privateAccount'='true' then 'private' else 'public' end)='public'`;
  const rating = sql`case ${contentRating} when 'child_safe' then 0 when 'mature' then 2 else 1 end`;
  const suppliedCeiling = viewerCeiling === undefined ? undefined
    : sql`case ${viewerCeiling} when 'child_safe' then 0 when 'mature' then 2 else 1 end`;
  const approvedChildSafe = entityType && entityId ? sql`exists(select 1 from content_safety_classifications c
    where c.entity_type=${entityType} and c.entity_id=${entityId} and c.status='approved'
      and c.classification='child_safe' and c.policy_version=${CONTENT_CLASSIFICATION_POLICY_VERSION})` : sql`false`;
  const requiresApprovedChildSafe = viewerCeiling === 'child_safe' && requireApprovedChildSafe ? approvedChildSafe : sql`true`;
  if (!viewerId) return sql`exists(select 1 from users a where a.id=${authorId}
    and coalesce(a.account_status,'active') not in ('suspended','deactivated','deleted')
    and ${publicAuthor} and coalesce(${audience},'public')='public' and ${rating}<=${suppliedCeiling ?? sql`1`}
    and ${requiresApprovedChildSafe})`;
  const follows = sql`exists(select 1 from user_follows f where f.follower_id=v.id and f.following_id=a.id)`;
  const close = sql`exists(select 1 from user_close_friends f where f.user_id=a.id and f.friend_id=v.id)`;
  const selected = storyId ? sql`exists(select 1 from story_audience_members m where m.story_id=${storyId} and m.user_id=v.id)` : sql`false`;
  const excluded = storyId ? sql`exists(select 1 from story_audience_exclusions e where e.story_id=${storyId} and e.user_id=v.id)` : sql`false`;
  return sql`exists(select 1 from users a cross join users v where a.id=${authorId} and v.id=${viewerId}
    and coalesce(a.account_status,'active') not in ('suspended','deactivated','deleted')
    and coalesce(v.account_status,'active') not in ('suspended','deactivated','deleted')
    and not coalesce(a.blocked_users,'[]'::jsonb) @> jsonb_build_array(v.id::text)
    and not coalesce(v.blocked_users,'[]'::jsonb) @> jsonb_build_array(a.id::text)
    and ${rating} <= ${suppliedCeiling ?? sql`case v.settings->>'contentFilter' when 'child_safe' then 0 when 'mature' then 2 else 1 end`}
    and ${requiresApprovedChildSafe}
    and (a.id=v.id or (not coalesce(v.muted_users,'[]'::jsonb) @> jsonb_build_array(a.id::text)
      and (${publicAuthor} or ${follows}) and case coalesce(${audience},'public')
        when 'public' then true when 'followers' then ${follows} when 'close_friends' then ${close}
        when 'selected_people' then ${selected} when 'custom' then ${selected}
        when 'everyone_except' then not ${excluded} else false end)))`;
}
