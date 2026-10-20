import { pool } from '@workspace/db';
import { allowedExternalVideoUrl } from '../utils/external-video.js';

export class AccountExportNotFoundError extends Error {}
export const ACCOUNT_EXPORT_PAGE_SIZE = 200;
const mediaFields = new Set(['avatarUrl','mediaUrl','videoUrl','thumbnailUrl','coverUrl','customImageUrl','logoUrl','images']);
function canonicalMedia(data: Record<string,unknown>): Record<string,unknown> {
  const reference = (value: unknown, key: string) => typeof value === 'string' && /^(media|media-poster):[0-9a-f-]{36}$/i.test(value) ? value
    : key === 'videoUrl' ? allowedExternalVideoUrl(value) ?? null : null;
  return Object.fromEntries(Object.entries(data).map(([key,value]) => [key, !mediaFields.has(key) ? value
    : Array.isArray(value) ? value.map(item=>reference(item,key)) : reference(value,key)]));
}

type NativeKey = { expression: string; type: 'uuid' | 'text' | 'bigint' };
type Collection = { section: string; name: string; table: string; from: string; keys: NativeKey[]; where: string; projection: string; scopes?: string[] };
const TEXT_KEYS = new Set(['payment_disputes.id','user_feature_overrides.feature_key','user_topics.type','content_topics.entity_type','media_references.entity_type','media_references.slot']);
const camel = (value: string) => value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
const fields = (columns: string, alias = 't') => columns.split(' ').filter(Boolean)
  .flatMap(column => [`'${camel(column)}'`, `${alias}.${column}`]).join(',');
const projection = (columns: string) => `jsonb_build_object(${fields(columns)})`;
function collection(section: string, name: string, table: string, columns: string, where: string, keys = 'id'): Collection {
  const scopeParts = where.split(' OR ');
  const scopes = scopeParts.length>1 && scopeParts.every(part=>/^t\.[a-z_]+=\$1::uuid$/.test(part)) ? scopeParts : undefined;
  const fixedColumn = !scopes ? where.match(/^t\.([a-z_]+)=\$1::uuid(?: AND|$)/)?.[1] : undefined;
  const nativeKeys = keys.split(' ').filter(key=>key!==fixedColumn);
  return { section, name, table, from: `${table} t`, keys: (nativeKeys.length?nativeKeys:keys.split(' ')).map(key => ({ expression: `t.${key}`,
    type: TEXT_KEYS.has(`${table}.${key}`) ? 'text' : table==='payment_dispute_history' && key==='id' ? 'bigint' : 'uuid' })),
    where, scopes, projection: projection(columns) };
}
const own = (column: string) => `t.${column}=$1::uuid`;
const authored = (table: string, fk: string, id: string) => `EXISTS(SELECT 1 FROM ${table} parent WHERE parent.id=t.${id} AND parent.${fk}=$1::uuid)`;
// Only fixed, server-owned column expressions enter this SQL helper. Legacy
// migrations can store timestamptz where a fresh schema stores UTC wall time.
const unexpired = (alias = 't') => `(CASE WHEN pg_typeof(${alias}.expires_at)='timestamp without time zone'::regtype
  THEN (${alias}.expires_at::timestamp AT TIME ZONE 'UTC') ELSE ${alias}.expires_at::timestamptz END)>$2::timestamptz`;
const visibleMessage = `t.deleted_at IS NULL AND (t.expires_at IS NULL OR ${unexpired()})`;
const visibleStory = (alias = 't') => `(${alias}.is_highlight OR ${alias}.highlight_id IS NOT NULL
  OR EXISTS(SELECT 1 FROM highlight_items retained WHERE retained.story_id=${alias}.id) OR ${unexpired(alias)})`;
const participates = (id: string) => `EXISTS(SELECT 1 FROM conversations c WHERE c.id=${id} AND (
  EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=$1::uuid)
  OR (NOT COALESCE(c.is_group,false) AND NOT EXISTS(SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id)
    AND (c.participant_a=$1::uuid OR c.participant_b=$1::uuid))))`;
const paymentOwner = (paymentId: string) => `EXISTS(SELECT 1 FROM payment_orders o WHERE o.provider_payment_id=${paymentId} AND (o.payer_id=$1::uuid OR o.creator_id=$1::uuid))
  OR EXISTS(SELECT 1 FROM subscription_orders o WHERE o.provider_payment_id=${paymentId} AND (o.subscriber_id=$1::uuid OR o.creator_id=$1::uuid))
  OR EXISTS(SELECT 1 FROM marketplace_orders o WHERE o.provider_payment_id=${paymentId} AND (o.buyer_id=$1::uuid OR o.seller_id=$1::uuid))
  OR EXISTS(SELECT 1 FROM premium_orders o WHERE o.provider_payment_id=${paymentId} AND o.user_id=$1::uuid)`;
// Receipt sharing is revocable. Legacy seen_at can belong to another reader;
// export the subject's own read records separately through activity.messageReads.
const messageColumns = 'id conversation_id sender_id recipient_id content media_id media_url media_type media_duration text_style_id created_at reply_to_id forwarded_from_id edited_at expires_at pinned';
const orderColumns = 'id provider provider_order_id provider_payment_id amount_minor currency status created_at paid_at';
const reactionActor = `t.reactions @? ('$.*[*] ? (@ == ' || to_jsonb($1::text)::text || ')')::jsonpath`;
const ownedStory = `EXISTS(SELECT 1 FROM stories parent WHERE parent.id=t.story_id AND parent.author_id=$1::uuid
  AND ${visibleStory('parent')})`;
const ownedPostPoll = `EXISTS(SELECT 1 FROM post_polls p JOIN posts parent ON parent.id=p.post_id WHERE p.id=t.poll_id AND parent.author_id=$1::uuid)`;
const ownedStoryPoll = `EXISTS(SELECT 1 FROM story_polls p JOIN stories parent ON parent.id=p.story_id WHERE p.id=t.poll_id AND parent.author_id=$1::uuid
  AND ${visibleStory('parent')})`;

/** Reviewed allowlists, never SELECT *. A collection contains only the subject's data or a documented participation view. */
export const ACCOUNT_EXPORT_COLLECTIONS: readonly Collection[] = [
  collection('content','posts','posts','id author_id content images created_at updated_at tags mentions post_type visibility audience language content_category distribution_mode content_rating likes_count comments_count bookmarks_count share_count repost_count views',own('author_id')),
  collection('content','comments','comments','id post_id author_id parent_id content media_url media_type media_duration created_at updated_at is_pinned replies_count',own('author_id')),
  collection('content','profileComments','profile_comments','id profile_id author_id content created_at updated_at',own('author_id')),
  collection('content','receivedProfileComments','profile_comments','id profile_id author_id content created_at updated_at',`t.profile_id=$1::uuid AND t.author_id<>$1::uuid`),
  collection('content','profileShowcases','profile_showcases','id user_id type title content_id custom_text custom_image_url created_at updated_at',own('user_id')),
  collection('content','profilePostPins','profile_post_pins','user_id post_id position created_at',own('user_id'),'user_id post_id'),
  collection('content','stories','stories','id author_id media_url type text_content background_gradient story_font_id story_text_style created_at published_at expires_at is_highlight highlight_title highlight_id publish_mode audience content_category content_rating',`${own('author_id')} AND ${visibleStory()}`),
  collection('content','notes','user_notes','id author_id content audience content_category content_rating created_at expires_at',`${own('author_id')} AND ${unexpired()}`),
  collection('content','sentMessages','messages',messageColumns,`${own('sender_id')} AND ${visibleMessage}`),
  collection('content','receivedMessages','messages',messageColumns,`t.sender_id<>$1::uuid AND ${visibleMessage} AND ${participates('t.conversation_id')}`),
  collection('content','articles','articles','id author_id title excerpt content cover_url read_time claps created_at collection content_category content_rating',own('author_id')),
  collection('content','videos','videos','id author_id video_url thumbnail_url title views created_at type content_category content_rating',own('author_id')),
  collection('content','videoComments','video_comments','id video_id author_id content media_url media_type media_duration created_at updated_at',own('author_id')),
  collection('content','highlights','highlights','id owner_id title cover_url created_at updated_at',own('owner_id')),
  collection('content','highlightItems','highlight_items','highlight_id story_id position created_at',authored('highlights','owner_id','highlight_id'),'highlight_id story_id'),
  collection('content','postPolls','post_polls','id post_id question created_at',authored('posts','author_id','post_id')),
  collection('content','postPollOptions','post_poll_options','id poll_id text position vote_count',ownedPostPoll),
  collection('content','storyPolls','story_polls','id story_id question created_at',ownedStory),
  collection('content','storyPollOptions','story_poll_options','id poll_id text position vote_count',ownedStoryPoll),
  collection('content','communities','communities','id name slug description cover_url owner_id roles genre rules content_rating created_at updated_at',own('owner_id')),
  { ...collection('content','communityDiscussions','communities','id',`t.announcements @> jsonb_build_array(jsonb_build_object('authorId',$1::text)) AND entry.item->>'authorId'=$1::text AND entry.item->>'id' IS NOT NULL`),
    from: `communities t CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(t.announcements)='array' THEN t.announcements ELSE '[]'::jsonb END) entry(item)`,
    keys: [{ expression:'t.id',type:'uuid' },{ expression:"entry.item->>'id'",type:'text' }],
    projection: `jsonb_build_object('communityId',t.id,'id',entry.item->'id','authorId',entry.item->'authorId','title',entry.item->'title','content',entry.item->'content','tag',entry.item->'tag','createdAt',entry.item->'createdAt','contentRating',entry.item->'contentRating')` },
  collection('content','events','events','id host_id title description cover_url category starts_at location is_online content_rating',own('host_id')),
  collection('content','broadcastChannels','broadcast_channels','id owner_id name description cover_url content_category content_rating created_at updated_at',own('owner_id')),
  collection('content','broadcastMessages','broadcast_channel_messages','id channel_id author_id content content_category content_rating created_at',own('author_id')),
  collection('content','products','products','id seller_id title description price images category condition availability content_rating created_at',own('seller_id')),
  collection('content','liveStreams','live_streams','id host_id title cover_url kind status viewers starts_at category content_rating',own('host_id')),
  collection('interactions','likes','post_likes','post_id user_id created_at',own('user_id'),'post_id user_id'),
  collection('interactions','bookmarks','post_bookmarks','post_id user_id created_at',own('user_id'),'post_id user_id'),
  collection('interactions','reposts','post_reposts','id post_id user_id note created_at',own('user_id')),
  collection('interactions','postPollVotes','post_poll_votes','poll_id option_id user_id created_at',own('user_id'),'poll_id user_id'),
  collection('interactions','storyPollVotes','story_poll_votes','poll_id option_id user_id created_at',own('user_id'),'poll_id user_id'),
  collection('interactions','storyViews','story_views','story_id user_id viewed_at',own('user_id'),'story_id user_id'),
  collection('interactions','storyViewEvents','story_view_events','id story_id viewer_id exposure viewed_at',own('viewer_id')),
  collection('interactions','storyReactions','story_reactions','story_id user_id emoji reaction_type created_at updated_at',own('user_id'),'story_id user_id'),
  collection('interactions','videoBookmarks','video_bookmarks','video_id user_id created_at',own('user_id'),'video_id user_id'),
  collection('interactions','reelViews','reel_views','id user_id reel_id started_at watched_ms completed rewatched',own('user_id')),
  collection('interactions','productSaves','product_saves','product_id user_id created_at',own('user_id'),'product_id user_id'),
  collection('interactions','eventRsvps','event_rsvps','event_id user_id status created_at updated_at',own('user_id'),'event_id user_id'),
  ...['comments','videos','video_comments'].map(table => collection('interactions',`${camel(table)}Likes`,table,'id',`t.liked_by ? $1::text`)),
  ...['posts','comments','messages','broadcast_channel_messages'].map(table => ({
    ...collection('interactions',`${camel(table)}Reactions`,table,'id',`${reactionActor} AND jsonb_typeof(reaction.value)='array' AND reaction.value ? $1::text${table==='messages'?` AND ${visibleMessage}`:''}`),
    from: `${table} t CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(t.reactions)='object' THEN t.reactions ELSE '{}'::jsonb END) reaction(key,value)`,
    keys: [{ expression:'t.id',type:'uuid' },{ expression:'reaction.key',type:'text' }] as NativeKey[], projection: `jsonb_build_object('entityId',t.id,'reaction',reaction.key)`,
  })),
  collection('relationships','following','user_follows','follower_id following_id created_at',own('follower_id'),'follower_id following_id'),
  collection('relationships','followers','user_follows','follower_id following_id created_at',own('following_id'),'follower_id following_id'),
  collection('relationships','followRequests','follow_requests','id requester_id target_id status created_at updated_at',`t.requester_id=$1::uuid OR t.target_id=$1::uuid`),
  collection('relationships','favorites','user_favorite_creators','user_id creator_id created_at',own('user_id'),'user_id creator_id'),
  collection('relationships','closeFriends','user_close_friends','user_id friend_id created_at',own('user_id'),'user_id friend_id'),
  collection('relationships','communityMemberships','community_members','community_id user_id role created_at',own('user_id'),'community_id user_id'),
  collection('relationships','communityModeratorAssignments','communities','id',`t.moderators ? $1::text`),
  collection('relationships','pendingCommunityRequests','communities','id',`t.pending_requests ? $1::text`),
  collection('relationships','channelMemberships','broadcast_channel_members','channel_id user_id role notifications_enabled created_at',own('user_id'),'channel_id user_id'),
  collection('relationships','conversationMemberships','conversation_members','conversation_id user_id role joined_at last_read_at',own('user_id'),'conversation_id user_id'),
  collection('relationships','conversations','conversations','id is_group title vanish_mode created_at updated_at',participates('t.id')),
  collection('relationships','groupInvitations','conversation_invitations','id conversation_id inviter_id invitee_id state recipient_accepted_at rejected_at revoked_at created_at updated_at',`t.inviter_id=$1::uuid OR t.invitee_id=$1::uuid`),
  collection('relationships','contacts','contact_authorizations','id user_a_id user_b_id initiator_id state initiator_accepted_at recipient_accepted_at rejected_at revoked_at created_at updated_at',`t.user_a_id=$1::uuid OR t.user_b_id=$1::uuid`),
  collection('relationships','subscriptions','subscriptions','id subscriber_id creator_id tier status price_minor currency started_at expires_at cancel_at_period_end',`t.subscriber_id=$1::uuid OR t.creator_id=$1::uuid`),
  collection('activity','messageReads','message_reads','message_id user_id read_at',`${own('user_id')} AND EXISTS(SELECT 1 FROM messages m WHERE m.id=t.message_id AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR ${unexpired('m')}))`,'message_id user_id'),
  collection('activity','messagePreviews','message_preview_events','message_id user_id previewed_at',`${own('user_id')} AND EXISTS(SELECT 1 FROM messages m WHERE m.id=t.message_id AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR ${unexpired('m')}))`,'message_id user_id'),
  collection('activity','notifications','notifications','id recipient_id type title message related_id created_at read_at channel push_delivered_at',own('recipient_id')),
  collection('activity','termsAcceptances','user_terms_acceptances','id user_id terms_version accepted_at source',own('user_id')),
  collection('activity','pushSubscriptions','push_subscriptions','id user_id user_agent created_at last_used_at',own('user_id')),
  collection('activity','profileViews','creator_profile_view_events','id creator_id viewer_id view_date created_at',own('viewer_id')),
  collection('activity','liveGuestAppearances','live_streams','id starts_at status',`t.guest_ids ? $1::text`),
  collection('activity','productAnalytics','product_analytics_events','id schema_version event_name actor_id occurred_at properties received_at',own('actor_id')),
  collection('creator','workspace','creator_workspace_items','id owner_id kind item_key payload created_at updated_at',own('owner_id')),
  collection('creator','projects','projects','id owner_id title description status visibility looking_for_collaborators created_at updated_at',own('owner_id')),
  collection('creator','projectCollaborations','project_collaborators','project_id user_id role status joined_at',own('user_id'),'project_id user_id'),
  collection('creator','businesses','business_profiles','id owner_id name logo_url industry is_verified website contact_email created_at updated_at',own('owner_id')),
  collection('creator','businessMemberships','business_members','business_id user_id role joined_at',own('user_id'),'business_id user_id'),
  collection('creator','dailyAnalytics','creator_analytics_daily','id creator_id date profile_views new_followers total_post_views total_reel_views total_engagement estimated_earnings',own('creator_id')),
  collection('creator','topics','user_topics','user_id topic_id affinity_score type created_at',own('user_id'),'user_id topic_id type'),
  collection('creator','contentTopics','content_topics','entity_id entity_type topic_id confidence created_at',`(t.entity_type IN ('post','posts') AND EXISTS(SELECT 1 FROM posts p WHERE p.id=t.entity_id AND p.author_id=$1::uuid)) OR (t.entity_type IN ('video','videos') AND EXISTS(SELECT 1 FROM videos p WHERE p.id=t.entity_id AND p.author_id=$1::uuid)) OR (t.entity_type IN ('article','articles') AND EXISTS(SELECT 1 FROM articles p WHERE p.id=t.entity_id AND p.author_id=$1::uuid))`,'entity_id entity_type topic_id'),
  collection('commerce','subscriptionOrders','subscription_orders',`${orderColumns} subscription_id subscriber_id creator_id`,`t.subscriber_id=$1::uuid OR t.creator_id=$1::uuid`),
  collection('commerce','premiumOrders','premium_orders','id user_id plan_key plan_snapshot receipt provider_order_id provider_payment_id amount_minor currency status created_at paid_at updated_at',own('user_id')),
  collection('commerce','premiumAccess','premium_access','order_id user_id starts_at ends_at status cancel_at_period_end updated_at',own('user_id'),'order_id'),
  collection('commerce','checkoutIntents','checkout_intents','id product owner_id receipt provider_order_id amount_minor currency status last_payment_status created_at updated_at',own('owner_id')),
  collection('commerce','entitlements','entitlements','id user_id entity_type entity_id status granted_at expires_at',own('user_id')),
  collection('commerce','featureOverrides','user_feature_overrides','user_id feature_key enabled status granted_at expires_at',own('user_id'),'user_id feature_key'),
  collection('commerce','paymentOperations','payment_operation_audit','id actor_id action target_id reason created_at',own('actor_id')),
  collection('commerce','paymentDisputes','payment_disputes','id payment_id status amount_minor currency amount_deducted product order_id respond_by updated_at',paymentOwner('t.payment_id')),
  collection('commerce','disputeHistory','payment_dispute_history','id dispute_id status amount_deducted observed_at',`EXISTS(SELECT 1 FROM payment_disputes d WHERE d.id=t.dispute_id AND (${paymentOwner('d.payment_id')}))`),
  collection('safety','moderationContributions','report_moderation_events','id report_id moderator_id from_status to_status decision_reason created_at',own('moderator_id')),
  collection('safety','invites','invites','id inviter_id invitee_id status created_at claimed_at',`t.inviter_id=$1::uuid OR t.invitee_id=$1::uuid`),
  collection('safety','waitlist','waitlist','id email status created_at',`EXISTS(SELECT 1 FROM users u WHERE u.id=$1::uuid AND u.email_verified AND lower(u.email)=lower(t.email))`),
  collection('safety','storyAudienceSelections','story_audience_members','story_id user_id created_at',ownedStory,'story_id user_id'),
  collection('safety','storyAudienceExclusions','story_audience_exclusions','story_id user_id created_at',ownedStory,'story_id user_id'),
  collection('eligibility','enrollments','eligibility_enrollments','id bound_user_id requested_experience territory status policy_versions notice_versions authorized_at consumed_at expires_at created_at',own('bound_user_id')),
  collection('eligibility','assessments','eligibility_assessments','id user_id status issuer experience threshold_assertions territory policy_versions verified_at expires_at created_at',own('user_id')),
  collection('eligibility','challenges','eligibility_challenges','id user_id issuer purpose status requested_purposes notice_versions policy_versions territory consumed_at expires_at created_at',own('user_id')),
  collection('eligibility','revisions','eligibility_revisions','user_id revision updated_at',own('user_id'),'user_id'),
  collection('eligibility','guardianAuthorizations','guardian_authorizations','id user_id guardian_user_id issuer status purposes notice_versions policy_versions verified_at granted_at expires_at withdrawn_at created_at',`t.user_id=$1::uuid OR t.guardian_user_id=$1::uuid`),
  collection('eligibility','contactApprovals','contact_authorization_approvals','id contact_authorization_id child_user_id guardian_user_id approved_at policy_versions',`t.child_user_id=$1::uuid OR t.guardian_user_id=$1::uuid`),
  collection('eligibility','groupApprovals','conversation_invitation_approvals','id invitation_id child_user_id guardian_user_id approved_at policy_versions',`t.child_user_id=$1::uuid OR t.guardian_user_id=$1::uuid`),
  collection('media','assets','media_assets','id owner_id purpose provider status resource_type declared_mime declared_bytes verified_mime verified_bytes width height duration_seconds deletion_status created_at updated_at finalized_at',own('owner_id')),
  collection('media','references','media_references','media_id entity_type entity_id slot created_at',`EXISTS(SELECT 1 FROM media_assets a WHERE a.id=t.media_id AND a.owner_id=$1::uuid)
    AND (t.entity_type<>'messages' OR EXISTS(SELECT 1 FROM messages m WHERE m.id=t.entity_id AND m.deleted_at IS NULL AND (m.expires_at IS NULL OR ${unexpired('m')})))
    AND (t.entity_type<>'stories' OR EXISTS(SELECT 1 FROM stories s WHERE s.id=t.entity_id AND ${visibleStory('s')}))
    AND (t.entity_type<>'user_notes' OR EXISTS(SELECT 1 FROM user_notes n WHERE n.id=t.entity_id AND ${unexpired('n')}))`,'media_id entity_type entity_id slot'),
  collection('','reports','reports','id reporter_id entity_type entity_id reason details status created_at resolved_at',own('reporter_id')),
  collection('','contactShields','contact_shields','id identifier_type created_at',own('owner_id')),
  collection('','financialHistory','ledger_transactions','id amount_minor currency reference_id status created_at',`t.credit_account_id=$1::uuid OR t.debit_account_id=$1::uuid`),
  collection('','paymentOrders','payment_orders',`${orderColumns} payer_id creator_id stream_id message`,`t.payer_id=$1::uuid OR t.creator_id=$1::uuid`),
  { ...collection('','marketplaceOrders','marketplace_orders',`${orderColumns} product_id buyer_id seller_id fulfilled_at`,`t.buyer_id=$1::uuid OR t.seller_id=$1::uuid`),
    projection: `jsonb_build_object(${fields(`${orderColumns} product_id buyer_id seller_id fulfilled_at`)},'productSnapshot',jsonb_build_object('id',t.product_snapshot->'id','title',t.product_snapshot->'title')) || CASE WHEN t.buyer_id=$1::uuid THEN jsonb_build_object(${fields('shipping_name shipping_address shipping_phone')}) ELSE '{}'::jsonb END` },
];

// A new users FK requires a deliberate review, including the reverse direction
// of private relationships. CI compares this list against the migrated catalog.
export const ACCOUNT_EXPORT_USER_FK_DECISIONS: Readonly<Record<string,string>> = Object.fromEntries([
  ['user_terms_acceptances.user_id', 'Export the requesting subject\'s versioned terms acknowledgement history.'],
  ...`articles.author_id broadcast_channel_members.user_id broadcast_channel_messages.author_id broadcast_channels.owner_id business_members.user_id business_profiles.owner_id checkout_intents.owner_id comments.author_id communities.owner_id community_members.user_id contact_authorization_approvals.child_user_id contact_authorization_approvals.guardian_user_id contact_authorizations.initiator_id contact_authorizations.user_a_id contact_authorizations.user_b_id contact_shields.owner_id conversation_invitation_approvals.child_user_id conversation_invitation_approvals.guardian_user_id conversation_invitations.invitee_id conversation_invitations.inviter_id conversation_members.user_id conversations.participant_a conversations.participant_b creator_analytics_daily.creator_id creator_profile_view_events.viewer_id creator_workspace_items.owner_id eligibility_assessments.user_id eligibility_challenges.user_id eligibility_enrollments.bound_user_id eligibility_revisions.user_id entitlements.user_id event_rsvps.user_id events.host_id follow_requests.requester_id follow_requests.target_id guardian_authorizations.guardian_user_id guardian_authorizations.user_id highlights.owner_id invites.invitee_id invites.inviter_id ledger_transactions.credit_account_id ledger_transactions.debit_account_id live_streams.host_id marketplace_orders.buyer_id marketplace_orders.seller_id media_assets.owner_id message_preview_events.user_id message_reads.user_id messages.recipient_id messages.sender_id notifications.recipient_id payment_operation_audit.actor_id payment_orders.creator_id payment_orders.payer_id post_bookmarks.user_id post_likes.user_id post_poll_votes.user_id post_reposts.user_id posts.author_id premium_access.user_id premium_orders.user_id product_analytics_events.actor_id product_saves.user_id products.seller_id profile_comments.author_id profile_post_pins.user_id profile_showcases.user_id project_collaborators.user_id projects.owner_id push_subscriptions.user_id reel_views.user_id report_moderation_events.moderator_id reports.reporter_id stories.author_id story_poll_votes.user_id story_reactions.user_id story_view_events.viewer_id story_views.user_id subscription_orders.creator_id subscription_orders.subscriber_id subscriptions.creator_id subscriptions.subscriber_id user_close_friends.user_id user_favorite_creators.user_id user_feature_overrides.user_id user_follows.follower_id user_follows.following_id user_notes.author_id user_topics.user_id video_bookmarks.user_id video_comments.author_id videos.author_id`.split(' ').map(key => [key,'Exported through the explicit subject/actor/participation projection.']),
  ['creator_profile_view_events.creator_id','Daily aggregates only; another viewer\'s private browsing history is excluded.'],
  ['profile_comments.profile_id','Received profile comments use a content-only projection without other authors\' private fields.'],
  ['story_audience_members.user_id','Only author-owned selections; another author\'s private audience choices are excluded.'],
  ['story_audience_exclusions.user_id','Only author-owned exclusions; another author\'s private audience choices are excluded.'],
  ['user_close_friends.friend_id','Only subject-owned relationship choices; another user\'s private close-friend list is excluded.'],
  ['user_favorite_creators.creator_id','Only subject-owned favorites; another user\'s private favorites are excluded.'],
  ['consent_records.subject_id','Detailed consent audit records may include identity verification and must be disclosed through authenticated privacy rights processing.'],
  ['moderation_appeals.appellant_user_id','Appeal evidence may identify reporters or witnesses; disclosure requires a reviewed safety and privacy rights process.'],
  ['moderation_appeals.reviewer_id','Staff moderation reviewer identity is not private data belonging to the requesting subject.'],
  ['moderation_decision_notices.recipient_user_id','Moderation decision notices can contain third-party safety evidence and are disclosed through the controlled appeals process.'],
  ['moderation_decisions.actor_id','Internal staff decisions and audit evidence are excluded from self-service subject exports.'],
  ['privacy_rights_requests.subject_id','Rights request handling and identity verification evidence remain in the verified data-rights request process.'],
  ['password_reset_tokens.user_id','Excluded authentication material; account metadata reports reset-required state.'],
]);

export const ACCOUNT_EXPORT_EXCLUSIONS = [
  'Password hashes, TOTP secrets, identity digests, session/OTP/reset tokens, active invitation codes, push endpoints/encryption keys, provider signatures and private assurance methods/evidence/nonces are excluded.',
  'Other people\'s private profile fields, browsing events, audience choices, saved/close-friend lists, raw reaction identities and buyer shipping fields are excluded.',
  'Deleted/expired messages, expired notes and expired non-highlight stories are excluded, including their attachment references.',
  'Uploaded media values are canonical references, not bytes or access grants; delivery still requires current authorization. Submitted allowlisted external video links are retained.',
  'System-only queues, webhook payloads, provider reconciliation, background jobs, global aggregates and internal moderation/security evidence are excluded.',
  'Unbound guest enrollment/grievance records cannot safely be attributed from an account email; verified support handles those access requests separately.',
] as const;

const ACCOUNT_COLUMNS = 'id username email full_name bio bio_style_id message_font_id story_font_id app_icon_id avatar_url role account_types permissions created_at updated_at settings email_verified password_reset_required last_login_at devices blocked_users muted_users privacy location country language time_zone website creator_category subgenres verified creator_type account_type follower_count following_count post_count reel_count engagement_score reputation_score account_status activity_status last_active_timestamp terms_version terms_accepted_at age_confirmed_at';

/** Cursor encoding is only a projection; predicates and ordering retain indexable native types. */
export function buildAccountExportPageQuery(item: Collection, userId: string, boundary: string, cursor: string[] | null, pageSize: number) {
  if (cursor && cursor.length!==item.keys.length) throw new Error('Invalid account export position');
  const values: unknown[] = [userId,boundary,...cursor??[],pageSize];
  const order = item.keys.map(key=>key.expression).join(',');
  const positions = item.keys.map((key,index)=>`$${index+3}::${key.type}`).join(',');
  const after = !cursor ? '' : item.keys.length===1 ? ` AND ${order}>${positions}` : ` AND (${order})>(${positions})`;
  const limit = `$${values.length}::integer`;
  const selected = item.keys.map((key,index)=>`${key.expression} AS export_key_${index}`).join(',');
  const encoded = `jsonb_build_array(${item.keys.map(key=>`${key.expression}::text`).join(',')})`;
  const branches = (item.scopes??[item.where]).map(where=>`SELECT ${selected},${encoded} AS cursor,${item.projection} AS data
    FROM ${item.from} WHERE $1::uuid IS NOT NULL AND $2::timestamptz IS NOT NULL AND (${where})${after}
    ORDER BY ${order} LIMIT ${limit}`);
  return { text: branches.length===1 ? branches[0]
    : `SELECT cursor,data FROM (${branches.map(branch=>`(${branch})`).join(' UNION ')}) limited_scopes
       ORDER BY ${item.keys.map((_,index)=>`export_key_${index}`).join(',')} LIMIT ${limit}`, values };
}

/** The production HTTP path consumes this generator directly; only one bounded page is retained. */
export async function* streamAccountExport(userId: string, options: { pageSize?: number; signal?: AbortSignal } = {}): AsyncGenerator<string> {
  const pageSize = options.pageSize ?? ACCOUNT_EXPORT_PAGE_SIZE;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 500) throw new Error('Invalid account export page size');
  const client = await pool.connect();
  let completed = false;
  let connectionFailure: Error | undefined;
  const onClientError = (error: Error) => { connectionFailure ??= error; };
  const onClientEnd = () => { connectionFailure ??= new Error('Account export database connection ended'); };
  // A checked-out client has no pool idle-error handler. Timeouts can arrive
  // while the consumer is paused at a yield, so retain a listener until release.
  client.on('error',onClientError);
  client.on('end',onClientEnd);
  const check = () => { options.signal?.throwIfAborted(); if (connectionFailure) throw connectionFailure; };
  try {
    check();
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SET LOCAL TIME ZONE 'UTC'");
    await client.query("SET LOCAL application_name='yor-account-export'");
    await client.query("SET LOCAL statement_timeout='30s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout='30s'");
    const { rows } = await client.query<{data: Record<string,unknown>; boundary: string}>(
      `SELECT ${projection(ACCOUNT_COLUMNS)} || jsonb_build_object('twoFactorEnabled',t.totp_secret IS NOT NULL) AS data, transaction_timestamp()::text AS boundary FROM users t WHERE t.id=$1`, [userId]);
    if (!rows[0]) throw new AccountExportNotFoundError('User not found');
    const boundary = rows[0].boundary;
    yield `{"format":"yor-talks-account-export","version":2,"exportedAt":${JSON.stringify(new Date(boundary).toISOString())},"account":${JSON.stringify(canonicalMedia(rows[0].data))},"exclusions":${JSON.stringify(ACCOUNT_EXPORT_EXCLUSIONS)}`;
    let section = '';
    for (const item of ACCOUNT_EXPORT_COLLECTIONS) {
      check();
      if (item.section !== section) {
        if (section) yield '}';
        section = item.section;
        if (section) yield `,${JSON.stringify(section)}:{`;
      }
      const previous = ACCOUNT_EXPORT_COLLECTIONS[ACCOUNT_EXPORT_COLLECTIONS.indexOf(item)-1];
      yield `${section && previous?.section !== section ? '' : ','}${JSON.stringify(item.name)}:[`;
      let cursor: string[] | null = null, first = true;
      while (true) {
        check();
        const page: { rows: Array<{ cursor: string[]; data: Record<string,unknown> }> } = await client.query(
          buildAccountExportPageQuery(item,userId,boundary,cursor,pageSize));
        for (const row of page.rows) {
          check();
          yield `${first?'':','}${JSON.stringify(canonicalMedia(row.data))}`;
          first = false;
        }
        if (page.rows.length < pageSize) break;
        cursor = page.rows.at(-1)!.cursor;
      }
      yield ']';
    }
    if (section) yield '}';
    check();
    await client.query('COMMIT');
    completed = true;
    yield '}';
  } finally {
    if (!completed && !connectionFailure) await client.query('ROLLBACK').catch(() => undefined);
    client.release(Boolean(connectionFailure));
    client.off('error',onClientError);
    client.off('end',onClientEnd);
  }
}
