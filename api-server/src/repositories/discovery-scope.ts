import { sql, type SQLWrapper } from 'drizzle-orm';

/** Candidate reduction before LIMIT. Services still apply the shared current-record policy.
 * Columns are trusted schema objects; every viewer value remains parameterized. */
export function discoveryScope(columns: { authorId: SQLWrapper; audience: SQLWrapper; contentRating: SQLWrapper; storyId?: SQLWrapper }, viewerId?: string) {
  const { authorId, audience, contentRating, storyId } = columns;
  const publicAuthor = sql`coalesce(a.privacy->>'profileVisibility',
    case when a.settings->>'privateAccount'='true' then 'private' else 'public' end)='public'`;
  const rating = sql`case ${contentRating} when 'child_safe' then 0 when 'mature' then 2 else 1 end`;
  if (!viewerId) return sql`exists(select 1 from users a where a.id=${authorId}
    and coalesce(a.account_status,'active') not in ('suspended','deactivated','deleted')
    and ${publicAuthor} and coalesce(${audience},'public')='public' and ${rating}<=1)`;
  const follows = sql`exists(select 1 from user_follows f where f.follower_id=v.id and f.following_id=a.id)`;
  const close = sql`exists(select 1 from user_close_friends f where f.user_id=a.id and f.friend_id=v.id)`;
  const selected = storyId ? sql`exists(select 1 from story_audience_members m where m.story_id=${storyId} and m.user_id=v.id)` : sql`false`;
  const excluded = storyId ? sql`exists(select 1 from story_audience_exclusions e where e.story_id=${storyId} and e.user_id=v.id)` : sql`false`;
  return sql`exists(select 1 from users a cross join users v where a.id=${authorId} and v.id=${viewerId}
    and coalesce(a.account_status,'active') not in ('suspended','deactivated','deleted')
    and coalesce(v.account_status,'active') not in ('suspended','deactivated','deleted')
    and not coalesce(a.blocked_users,'[]'::jsonb) @> jsonb_build_array(v.id::text)
    and not coalesce(v.blocked_users,'[]'::jsonb) @> jsonb_build_array(a.id::text)
    and ${rating} <= case v.settings->>'contentFilter' when 'child_safe' then 0 when 'mature' then 2 else 1 end
    and (a.id=v.id or (not coalesce(v.muted_users,'[]'::jsonb) @> jsonb_build_array(a.id::text)
      and (${publicAuthor} or ${follows}) and case coalesce(${audience},'public')
        when 'public' then true when 'followers' then ${follows} when 'close_friends' then ${close}
        when 'selected_people' then ${selected} when 'custom' then ${selected}
        when 'everyone_except' then not ${excluded} else false end)))`;
}
