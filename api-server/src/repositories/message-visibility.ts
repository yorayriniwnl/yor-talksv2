import { and, isNull, or, sql, type SQL } from 'drizzle-orm';
import { messagesTable, conversationsTable } from '@workspace/db/schema';

/** PostgreSQL is the authority, including equality at the expiry boundary.
 * clock_timestamp (rather than transaction now) also covers time spent waiting
 * for a lock or a provider in a long transaction. */
export function currentMessageCondition(): SQL {
  return and(isNull(messagesTable.deletedAt), or(isNull(messagesTable.expiresAt),
    // Historical migrations contain both timestamp and timestamptz columns.
    // Epoch comparison treats the former's persisted UTC values consistently
    // even if a connection's TimeZone differs from UTC.
    sql`extract(epoch from ${messagesTable.expiresAt}) > extract(epoch from clock_timestamp())`))!;
}

export function conversationMembershipCondition(userId: string): SQL {
  return sql`exists (select 1 from ${conversationsTable} c where c.id=${messagesTable.conversationId}
    and exists(select 1 from users u where u.id=${userId}::uuid and coalesce(u.account_status,'active')='active')
    and ((coalesce(c.is_group,false)=false and (c.participant_a=${userId}::uuid or c.participant_b=${userId}::uuid))
      or exists(select 1 from conversation_members cm where cm.conversation_id=c.id and cm.user_id=${userId}::uuid)))`;
}

/** SQL fragment for pg queries; caller must bind $viewer and $message safely. */
export const MESSAGE_CURRENT_SQL = `m.deleted_at IS NULL AND (m.expires_at IS NULL OR extract(epoch from m.expires_at) > extract(epoch from clock_timestamp()))`;
export const conversationAuthorizationSql = (viewer: string) => `
  EXISTS(SELECT 1 FROM users u WHERE u.id=${viewer}::uuid AND coalesce(u.account_status,'active')='active') AND
  ((coalesce(c.is_group,false)=false AND (c.participant_a=${viewer}::uuid OR c.participant_b=${viewer}::uuid))
   OR EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=${viewer}::uuid))`;
export const messageMembershipSql = (viewer: string) => `EXISTS (SELECT 1 FROM conversations c WHERE c.id=m.conversation_id AND ${conversationAuthorizationSql(viewer)})`;

/** Mirrors entitlement precedence at the database boundary: an active override
 * (including an indefinite denial) wins over paid access. Positive overrides
 * must have a future expiry. Feature rollout availability is checked by the
 * service; persisted authority is checked again here. */
export const messagePreviewEntitledSql = (viewer: string) => `(CASE WHEN EXISTS(SELECT 1 FROM user_feature_overrides o
  WHERE o.user_id=${viewer}::uuid AND o.feature_key='MESSAGE_UNREAD_PREVIEW' AND o.status='active'
    AND (extract(epoch from o.expires_at)>extract(epoch from clock_timestamp()) OR (o.expires_at IS NULL AND o.enabled=false)))
  THEN (SELECT o.enabled FROM user_feature_overrides o WHERE o.user_id=${viewer}::uuid
    AND o.feature_key='MESSAGE_UNREAD_PREVIEW' AND o.status='active'
    AND (extract(epoch from o.expires_at)>extract(epoch from clock_timestamp()) OR (o.expires_at IS NULL AND o.enabled=false)))
  ELSE EXISTS(SELECT 1 FROM premium_access a JOIN premium_orders p ON p.id=a.order_id
    WHERE a.user_id=${viewer}::uuid AND a.status IN ('active','cancelled') AND p.status='paid'
      AND extract(epoch from a.starts_at)<=extract(epoch from clock_timestamp()) AND extract(epoch from a.ends_at)>extract(epoch from clock_timestamp())
      AND p.plan_snapshot->'features' ? 'MESSAGE_UNREAD_PREVIEW') END)`;

export const previewEntitlementCondition = (userId:string):SQL => {
  // A fixed internal placeholder becomes a Drizzle bind; account data never
  // becomes SQL source text.
  const parts=messagePreviewEntitledSql('__viewer__').split('__viewer__');
  return sql.join(parts.flatMap((part,index)=>index? [sql`${userId}`,sql.raw(part)]:[sql.raw(part)]),sql``);
};
