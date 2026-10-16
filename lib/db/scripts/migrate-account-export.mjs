/** Ordered subject lookups used by the account archive. Called inside migrateRelease's transaction. */
export const ACCOUNT_EXPORT_INDEXES = [
  ['posts','author_id','id'], ['comments','author_id','id'],
  ['profile_comments','author_id','id'], ['profile_comments','profile_id','id'],
  ['profile_showcases','user_id','id'], ['profile_post_pins','user_id','post_id'],
  ['stories','author_id','id'], ['messages','sender_id','id'],
  ['articles','author_id','id'], ['videos','author_id','id'], ['video_comments','author_id','id'],
  ['highlights','owner_id','id'], ['communities','owner_id','id'], ['events','host_id','id'],
  ['broadcast_channels','owner_id','id'], ['broadcast_channel_messages','author_id','id'],
  ['products','seller_id','id'], ['live_streams','host_id','id'],
  ['post_likes','user_id','post_id'], ['post_bookmarks','user_id','post_id'], ['post_reposts','user_id','id'],
  ['post_poll_votes','user_id','poll_id'], ['story_poll_votes','user_id','poll_id'],
  ['story_views','user_id','story_id'], ['story_view_events','viewer_id','id'], ['story_reactions','user_id','story_id'],
  ['video_bookmarks','user_id','video_id'], ['reel_views','user_id','id'], ['product_saves','user_id','product_id'],
  ['event_rsvps','user_id','event_id'], ['user_follows','following_id','follower_id'],
  ['follow_requests','requester_id','id'], ['follow_requests','target_id','id'],
  ['community_members','user_id','community_id'], ['broadcast_channel_members','user_id','channel_id'],
  ['conversation_members','user_id','conversation_id'],
  ['conversation_invitations','inviter_id','id'], ['conversation_invitations','invitee_id','id'],
  ['contact_authorizations','user_a_id','id'], ['contact_authorizations','user_b_id','id'],
  ['subscriptions','subscriber_id','id'], ['subscriptions','creator_id','id'],
  ['message_reads','user_id','message_id'], ['message_preview_events','user_id','message_id'],
  ['notifications','recipient_id','id'], ['push_subscriptions','user_id','id'],
  ['creator_profile_view_events','viewer_id','id'], ['product_analytics_events','actor_id','id'],
  ['creator_workspace_items','owner_id','id'], ['projects','owner_id','id'],
  ['project_collaborators','user_id','project_id'], ['business_profiles','owner_id','id'],
  ['business_members','user_id','business_id'], ['creator_analytics_daily','creator_id','id'],
  ['subscription_orders','subscriber_id','id'], ['subscription_orders','creator_id','id'],
  ['premium_orders','user_id','id'], ['premium_access','user_id','order_id'],
  ['checkout_intents','owner_id','id'], ['entitlements','user_id','id'], ['payment_operation_audit','actor_id','id'],
  ['report_moderation_events','moderator_id','id'], ['invites','inviter_id','id'], ['invites','invitee_id','id'],
  ['eligibility_enrollments','bound_user_id','id'], ['eligibility_assessments','user_id','id'],
  ['eligibility_challenges','user_id','id'], ['guardian_authorizations','user_id','id'],
  ['guardian_authorizations','guardian_user_id','id'],
  ['contact_authorization_approvals','child_user_id','id'], ['contact_authorization_approvals','guardian_user_id','id'],
  ['conversation_invitation_approvals','child_user_id','id'], ['conversation_invitation_approvals','guardian_user_id','id'],
  ['media_assets','owner_id','id'], ['reports','reporter_id','id'], ['contact_shields','owner_id','id'],
  ['ledger_transactions','credit_account_id','id'], ['ledger_transactions','debit_account_id','id'],
  ['payment_orders','payer_id','id'], ['payment_orders','creator_id','id'],
  ['marketplace_orders','buyer_id','id'], ['marketplace_orders','seller_id','id'],
];

export async function migrateAccountExport(client) {
  // Reuse any complete btree prefix, including primary/unique indexes. Ignore
  // partial/invalid indexes because they cannot cover an arbitrary archive.
  const { rows } = await client.query(`SELECT t.relname AS table_name,
    array_agg(a.attname ORDER BY k.ordinality) AS columns
    FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace
    JOIN pg_class ix ON ix.oid=i.indexrelid JOIN pg_am am ON am.oid=ix.relam
    CROSS JOIN LATERAL unnest(i.indkey) WITH ORDINALITY k(attnum,ordinality)
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.attnum
    WHERE n.nspname=current_schema() AND am.amname='btree' AND i.indisvalid
      AND i.indpred IS NULL AND i.indexprs IS NULL AND k.ordinality<=i.indnkeyatts
    GROUP BY t.relname,i.indexrelid`);
  for (const [table, ...columns] of ACCOUNT_EXPORT_INDEXES) {
    if (rows.some(row => row.table_name===table && columns.every((column,index)=>row.columns[index]===column))) continue;
    // All identifiers are reviewed literals above; keep generated names below PostgreSQL's 63 byte limit.
    const name = `archive_${table}_${columns[0]}_idx`;
    if (name.length>63) throw new Error(`Account export index name is too long: ${name}`);
    await client.query(`CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" (${columns.map(column=>`"${column}"`).join(',')})`);
  }
  // Legacy actor arrays have no subject FK. Index the native JSON predicates
  // before expanding their entries, keeping unrelated rows out of the export.
  for (const [table, column] of [
    ['comments','liked_by'], ['videos','liked_by'], ['video_comments','liked_by'],
    ['posts','reactions'], ['comments','reactions'], ['messages','reactions'], ['broadcast_channel_messages','reactions'],
    ['communities','announcements'], ['communities','moderators'], ['communities','pending_requests'],
    ['live_streams','guest_ids'],
  ]) {
    await client.query(`CREATE INDEX IF NOT EXISTS "archive_${table}_${column}_gin" ON "${table}" USING gin ("${column}")`);
  }
}
