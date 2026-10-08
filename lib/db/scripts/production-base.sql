CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"cover_url" text NOT NULL,
	"read_time" integer DEFAULT 0 NOT NULL,
	"claps" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"collection" text,
	"content_category" text DEFAULT 'other' NOT NULL,
	"content_rating" text DEFAULT 'regular' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_channel_members" (
	"channel_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'subscriber' NOT NULL,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "broadcast_channel_members_channel_id_user_id_pk" PRIMARY KEY("channel_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "broadcast_channel_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"channel_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"content_category" text DEFAULT 'other' NOT NULL,
	"content_rating" text DEFAULT 'regular' NOT NULL,
	"reactions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_channels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_url" text,
	"content_category" text DEFAULT 'other' NOT NULL,
	"content_rating" text DEFAULT 'regular' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_members" (
	"business_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "business_members_business_id_user_id_pk" PRIMARY KEY("business_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "business_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"industry" text NOT NULL,
	"is_verified" boolean DEFAULT false,
	"website" text,
	"contact_email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"parent_id" uuid,
	"content" text NOT NULL,
	"media_url" text,
	"media_type" text,
	"media_duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"liked_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reactions" jsonb DEFAULT '{}'::jsonb,
	"is_pinned" boolean DEFAULT false,
	"replies_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "communities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_url" text,
	"owner_id" uuid NOT NULL,
	"moderators" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pending_requests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"roles" jsonb DEFAULT '{}'::jsonb,
	"invite_links" jsonb DEFAULT '{}'::jsonb,
	"announcements" jsonb DEFAULT '[]'::jsonb,
	"genre" text,
	"rules" jsonb DEFAULT '[]'::jsonb,
	"posts_count" integer DEFAULT 0,
	"events_count" integer DEFAULT 0,
	"activity_score" integer DEFAULT 0,
	"trending_score" integer DEFAULT 0,
	"content_rating" text DEFAULT 'regular' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "communities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "community_members" (
	"community_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "community_members_community_id_user_id_pk" PRIMARY KEY("community_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "contact_shields" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"identifier_type" text NOT NULL,
	"identifier_digest" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_topics" (
	"entity_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"topic_id" uuid NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_topics_entity_id_entity_type_topic_id_pk" PRIMARY KEY("entity_id","entity_type","topic_id")
);
--> statement-breakpoint
CREATE TABLE "conversation_members" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'member',
	"last_read_at" timestamp,
	CONSTRAINT "conversation_members_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"participant_a" uuid,
	"participant_b" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"participant_ids" jsonb DEFAULT '[]'::jsonb,
	"is_group" boolean DEFAULT false,
	"title" text,
	"vanish_mode" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "creator_analytics_daily" (
	"id" uuid PRIMARY KEY NOT NULL,
	"creator_id" uuid NOT NULL,
	"date" timestamp NOT NULL,
	"profile_views" integer DEFAULT 0 NOT NULL,
	"new_followers" integer DEFAULT 0 NOT NULL,
	"total_post_views" integer DEFAULT 0 NOT NULL,
	"total_reel_views" integer DEFAULT 0 NOT NULL,
	"total_engagement" integer DEFAULT 0 NOT NULL,
	"estimated_earnings" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_profile_view_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"creator_id" uuid NOT NULL,
	"viewer_id" uuid NOT NULL,
	"view_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_workspace_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"item_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "event_rsvps" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_rsvps_event_id_user_id_pk" PRIMARY KEY("event_id","user_id"),
	CONSTRAINT "event_rsvp_status_check" CHECK ("event_rsvps"."status" IN ('going', 'interested'))
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"host_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"cover_url" text NOT NULL,
	"category" text NOT NULL,
	"starts_at" timestamp NOT NULL,
	"location" text NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"rsvp_status" text,
	"content_rating" text DEFAULT 'regular' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_entitlements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"feature_key" text NOT NULL,
	"plan_key" text DEFAULT 'default' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follow_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"requester_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievance_tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"category" text NOT NULL,
	"reported_url" text NOT NULL,
	"reporter_name" text NOT NULL,
	"reporter_email" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"sla_deadline" timestamp NOT NULL,
	"officer_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "grievance_tickets_ticket_id_unique" UNIQUE("ticket_id")
);
--> statement-breakpoint
CREATE TABLE "highlight_items" (
	"highlight_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "highlight_items_highlight_id_story_id_pk" PRIMARY KEY("highlight_id","story_id")
);
--> statement-breakpoint
CREATE TABLE "highlights" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"cover_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid,
	"code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"claimed_at" timestamp,
	CONSTRAINT "invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "ledger_transactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"credit_account_id" uuid,
	"debit_account_id" uuid,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"reference_id" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_streams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"host_id" uuid NOT NULL,
	"title" text NOT NULL,
	"cover_url" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"viewers" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp NOT NULL,
	"category" text NOT NULL,
	"guest_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_rating" text DEFAULT 'regular' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid,
	"product_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"buyer_id" uuid,
	"seller_id" uuid,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_payment_id" text,
	"provider_signature" text,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'provider_pending' NOT NULL,
	"shipping_name" text NOT NULL,
	"shipping_address" text NOT NULL,
	"shipping_phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	"fulfilled_at" timestamp,
	"reservation_expires_at" timestamp,
	CONSTRAINT "marketplace_orders_provider_order_id_unique" UNIQUE("provider_order_id")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid,
	"purpose" text NOT NULL,
	"provider" text DEFAULT 'cloudinary' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"public_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"declared_mime" text NOT NULL,
	"declared_bytes" integer NOT NULL,
	"provider_asset_id" text,
	"provider_version" integer,
	"provider_format" text,
	"verified_mime" text,
	"verified_bytes" integer,
	"sha256" text,
	"width" integer,
	"height" integer,
	"duration_seconds" double precision,
	"moderation_json" jsonb,
	"verification_token" uuid,
	"verification_until" timestamp with time zone,
	"deletion_status" text DEFAULT 'none' NOT NULL,
	"deletion_attempts" integer DEFAULT 0 NOT NULL,
	"deletion_token" uuid,
	"deletion_until" timestamp with time zone,
	"cleanup_at" timestamp with time zone DEFAULT now() NOT NULL,
	"upload_expires_at" timestamp with time zone NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_at" timestamp with time zone,
	CONSTRAINT "media_assets_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "media_references" (
	"media_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"slot" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_references_media_id_entity_type_entity_id_slot_pk" PRIMARY KEY("media_id","entity_type","entity_id","slot")
);
--> statement-breakpoint
CREATE TABLE "message_preview_events" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"previewed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_preview_events_message_id_user_id_pk" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "message_reads" (
	"message_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "message_reads_message_id_user_id_pk" PRIMARY KEY("message_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid,
	"content" text NOT NULL,
	"media_id" uuid,
	"media_url" text,
	"media_type" text,
	"media_duration" integer,
	"media_legacy" boolean DEFAULT false NOT NULL,
	"text_style_id" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"seen_at" timestamp,
	"reply_to_id" uuid,
	"forwarded_from_id" uuid,
	"reactions" jsonb DEFAULT '{}'::jsonb,
	"edited_at" timestamp,
	"deleted_at" timestamp,
	"expires_at" timestamp,
	"pinned" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"duration" integer DEFAULT 0,
	"subgenre" text,
	"hashtags" jsonb DEFAULT '[]'::jsonb,
	"mentions" jsonb DEFAULT '[]'::jsonb,
	"comments" jsonb DEFAULT '[]'::jsonb,
	"share_count" integer DEFAULT 0,
	"bookmarked_by" jsonb DEFAULT '[]'::jsonb,
	"completion_rate" integer DEFAULT 0,
	"average_watch_time" integer DEFAULT 0,
	"engagement_score" integer DEFAULT 0,
	"trending_score" integer DEFAULT 0,
	"recommendation_score" integer DEFAULT 0,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"channel" text DEFAULT 'in_app',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"push_delivered_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payer_id" uuid,
	"creator_id" uuid,
	"stream_id" uuid,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_payment_id" text,
	"provider_signature" text,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "payment_orders_provider_order_id_unique" UNIQUE("provider_order_id")
);
--> statement-breakpoint
CREATE TABLE "post_bookmarks" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_bookmarks_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_likes" (
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_poll_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"poll_id" uuid NOT NULL,
	"text" text NOT NULL,
	"position" integer NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_poll_votes" (
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_poll_votes_poll_id_user_id_pk" PRIMARY KEY("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "post_polls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"question" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_reposts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"bookmarks_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"repost_count" integer DEFAULT 0 NOT NULL,
	"reactions" jsonb DEFAULT '{}'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"mentions" jsonb DEFAULT '[]'::jsonb,
	"score" integer DEFAULT 0,
	"post_type" text DEFAULT 'text',
	"visibility" text DEFAULT 'public',
	"audience" text DEFAULT 'public' NOT NULL,
	"language" text,
	"content_category" text DEFAULT 'other' NOT NULL,
	"content_quality_score" integer DEFAULT 0,
	"trending_score" integer DEFAULT 0,
	"distribution_mode" text DEFAULT 'feed_and_profile' NOT NULL,
	"views" integer DEFAULT 0,
	"engagement_rate" integer DEFAULT 0,
	"content_rating" text DEFAULT 'regular' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_analytics_daily" (
	"date" timestamp NOT NULL,
	"event_name" text NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"unique_users" integer DEFAULT 0 NOT NULL,
	"rolled_up_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_analytics_daily_date_event_name_pk" PRIMARY KEY("date","event_name")
);
--> statement-breakpoint
CREATE TABLE "product_analytics_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"schema_version" integer NOT NULL,
	"event_name" text NOT NULL,
	"actor_id" uuid,
	"occurred_at" timestamp NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_analytics_job_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"processed_through" timestamp,
	"processed_events" integer DEFAULT 0 NOT NULL,
	"error_code" text
);
--> statement-breakpoint
CREATE TABLE "product_saves" (
	"product_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_saves_product_id_user_id_pk" PRIMARY KEY("product_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seller_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category" text NOT NULL,
	"condition" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"availability" text DEFAULT 'active' NOT NULL,
	"content_rating" text DEFAULT 'regular' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_post_pins" (
	"user_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profile_post_pins_user_id_post_id_pk" PRIMARY KEY("user_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "profile_showcases" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text DEFAULT 'custom' NOT NULL,
	"title" text NOT NULL,
	"content_id" uuid,
	"custom_text" text,
	"custom_image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_collaborators" (
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'collaborator' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"joined_at" timestamp,
	CONSTRAINT "project_collaborators_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'planning' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"looking_for_collaborators" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reel_views" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"reel_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"watched_ms" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"rewatched" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"reporter_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"media_url" text NOT NULL,
	"type" text NOT NULL,
	"text_content" text,
	"background_gradient" text,
	"story_font_id" text DEFAULT 'default' NOT NULL,
	"story_text_style" jsonb DEFAULT '{"size":"md","weight":"strong","align":"center","background":"none","backgroundOpacity":0,"positionX":50,"positionY":50,"rotation":0}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_highlight" boolean DEFAULT false NOT NULL,
	"highlight_title" text,
	"highlight_id" uuid,
	"publish_mode" text DEFAULT 'active' NOT NULL,
	"priority_boost" integer DEFAULT 0 NOT NULL,
	"engagement_score" integer DEFAULT 0 NOT NULL,
	"audience" text DEFAULT 'followers' NOT NULL,
	"content_category" text DEFAULT 'other' NOT NULL,
	"content_rating" text DEFAULT 'regular' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_audience_exclusions" (
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_audience_exclusions_story_id_user_id_pk" PRIMARY KEY("story_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "story_audience_members" (
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_audience_members_story_id_user_id_pk" PRIMARY KEY("story_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "story_poll_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"poll_id" uuid NOT NULL,
	"text" text NOT NULL,
	"position" integer NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_poll_votes" (
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_poll_votes_poll_id_user_id_pk" PRIMARY KEY("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "story_polls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"question" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_reactions" (
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"reaction_type" text DEFAULT 'CUSTOM' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_reactions_story_id_user_id_pk" PRIMARY KEY("story_id","user_id"),
	CONSTRAINT "story_reaction_emoji_check" CHECK (char_length("story_reactions"."emoji") BETWEEN 1 AND 32)
);
--> statement-breakpoint
CREATE TABLE "story_view_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"story_id" uuid NOT NULL,
	"viewer_id" uuid,
	"exposure" text DEFAULT 'identified' NOT NULL,
	"event_key" text NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_views" (
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_views_story_id_user_id_pk" PRIMARY KEY("story_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "subscription_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subscription_id" uuid NOT NULL,
	"subscriber_id" uuid,
	"creator_id" uuid,
	"provider" text DEFAULT 'razorpay' NOT NULL,
	"provider_order_id" text NOT NULL,
	"provider_payment_id" text,
	"provider_signature" text,
	"amount_minor" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "subscription_orders_provider_order_id_unique" UNIQUE("provider_order_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subscriber_id" uuid,
	"creator_id" uuid,
	"tier" text DEFAULT 'basic' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topics_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_close_friends" (
	"user_id" uuid NOT NULL,
	"friend_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_close_friends_user_id_friend_id_pk" PRIMARY KEY("user_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE "user_favorite_creators" (
	"user_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_favorite_creators_user_id_creator_id_pk" PRIMARY KEY("user_id","creator_id")
);
--> statement-breakpoint
CREATE TABLE "user_feature_overrides" (
	"user_id" uuid NOT NULL,
	"feature_key" text NOT NULL,
	"enabled" boolean NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "user_feature_overrides_user_id_feature_key_pk" PRIMARY KEY("user_id","feature_key")
);
--> statement-breakpoint
CREATE TABLE "user_follows" (
	"follower_id" uuid NOT NULL,
	"following_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "user_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"audience" text DEFAULT 'followers' NOT NULL,
	"content_category" text DEFAULT 'other' NOT NULL,
	"content_rating" text DEFAULT 'regular' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_topics" (
	"user_id" uuid NOT NULL,
	"topic_id" uuid NOT NULL,
	"affinity_score" integer DEFAULT 1 NOT NULL,
	"type" text DEFAULT 'interest' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_topics_user_id_topic_id_type_pk" PRIMARY KEY("user_id","topic_id","type")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"google_subject" text,
	"password_hash" text NOT NULL,
	"auth_version" integer DEFAULT 0 NOT NULL,
	"terms_version" text,
	"terms_accepted_at" timestamp,
	"age_confirmed_at" timestamp,
	"full_name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"bio_style_id" text DEFAULT 'default' NOT NULL,
	"message_font_id" text DEFAULT 'default' NOT NULL,
	"story_font_id" text DEFAULT 'default' NOT NULL,
	"app_icon_id" text DEFAULT 'yor-default' NOT NULL,
	"avatar_url" text,
	"role" text DEFAULT 'user' NOT NULL,
	"account_types" jsonb DEFAULT '["user"]'::jsonb NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"email_verified" boolean DEFAULT false,
	"password_reset_required" boolean DEFAULT false,
	"last_login_at" timestamp,
	"devices" jsonb DEFAULT '[]'::jsonb,
	"blocked_users" jsonb DEFAULT '[]'::jsonb,
	"muted_users" jsonb DEFAULT '[]'::jsonb,
	"privacy" jsonb DEFAULT '{}'::jsonb,
	"totp_secret" text,
	"contact_identity_digest" text,
	"location" text,
	"country" text,
	"language" text,
	"time_zone" text,
	"website" text,
	"creator_category" text,
	"subgenres" jsonb DEFAULT '[]'::jsonb,
	"verified" boolean DEFAULT false,
	"creator_type" text,
	"account_type" text DEFAULT 'personal',
	"follower_count" integer DEFAULT 0,
	"following_count" integer DEFAULT 0,
	"post_count" integer DEFAULT 0,
	"reel_count" integer DEFAULT 0,
	"engagement_score" integer DEFAULT 0,
	"reputation_score" integer DEFAULT 0,
	"account_status" text DEFAULT 'active',
	"activity_status" text DEFAULT 'offline',
	"last_active_timestamp" timestamp,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_subject_unique" UNIQUE("google_subject")
);
--> statement-breakpoint
CREATE TABLE "video_bookmarks" (
	"video_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "video_bookmarks_video_id_user_id_pk" PRIMARY KEY("video_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "video_comments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"video_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"media_url" text,
	"media_type" text,
	"media_duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"liked_by" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text NOT NULL,
	"title" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"liked_by" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"content_category" text DEFAULT 'other' NOT NULL,
	"content_rating" text DEFAULT 'regular' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_channel_members" ADD CONSTRAINT "broadcast_channel_members_channel_id_broadcast_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."broadcast_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_channel_members" ADD CONSTRAINT "broadcast_channel_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_channel_messages" ADD CONSTRAINT "broadcast_channel_messages_channel_id_broadcast_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."broadcast_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_channel_messages" ADD CONSTRAINT "broadcast_channel_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_channels" ADD CONSTRAINT "broadcast_channels_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_business_id_business_profiles_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_members" ADD CONSTRAINT "business_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communities" ADD CONSTRAINT "communities_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_community_id_communities_id_fk" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_members" ADD CONSTRAINT "community_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_shields" ADD CONSTRAINT "contact_shields_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_topics" ADD CONSTRAINT "content_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_a_users_id_fk" FOREIGN KEY ("participant_a") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_b_users_id_fk" FOREIGN KEY ("participant_b") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_analytics_daily" ADD CONSTRAINT "creator_analytics_daily_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profile_view_events" ADD CONSTRAINT "creator_profile_view_events_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profile_view_events" ADD CONSTRAINT "creator_profile_view_events_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_workspace_items" ADD CONSTRAINT "creator_workspace_items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_requests" ADD CONSTRAINT "follow_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_requests" ADD CONSTRAINT "follow_requests_target_id_users_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlight_items" ADD CONSTRAINT "highlight_items_highlight_id_highlights_id_fk" FOREIGN KEY ("highlight_id") REFERENCES "public"."highlights"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlight_items" ADD CONSTRAINT "highlight_items_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "highlights" ADD CONSTRAINT "highlights_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_credit_account_id_users_id_fk" FOREIGN KEY ("credit_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_transactions" ADD CONSTRAINT "ledger_transactions_debit_account_id_users_id_fk" FOREIGN KEY ("debit_account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_references" ADD CONSTRAINT "media_references_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_preview_events" ADD CONSTRAINT "message_preview_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_preview_events" ADD CONSTRAINT "message_preview_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reads" ADD CONSTRAINT "message_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_forwarded_from_id_messages_id_fk" FOREIGN KEY ("forwarded_from_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_stream_id_live_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."live_streams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_poll_options" ADD CONSTRAINT "post_poll_options_poll_id_post_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."post_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_poll_votes" ADD CONSTRAINT "post_poll_votes_poll_id_post_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."post_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_poll_votes" ADD CONSTRAINT "post_poll_votes_option_id_post_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."post_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_poll_votes" ADD CONSTRAINT "post_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_polls" ADD CONSTRAINT "post_polls_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reposts" ADD CONSTRAINT "post_reposts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reposts" ADD CONSTRAINT "post_reposts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_analytics_events" ADD CONSTRAINT "product_analytics_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_saves" ADD CONSTRAINT "product_saves_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_saves" ADD CONSTRAINT "product_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_comments" ADD CONSTRAINT "profile_comments_profile_id_users_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_comments" ADD CONSTRAINT "profile_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_post_pins" ADD CONSTRAINT "profile_post_pins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_post_pins" ADD CONSTRAINT "profile_post_pins_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_showcases" ADD CONSTRAINT "profile_showcases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_views" ADD CONSTRAINT "reel_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reel_views" ADD CONSTRAINT "reel_views_reel_id_videos_id_fk" FOREIGN KEY ("reel_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_highlight_id_highlights_id_fk" FOREIGN KEY ("highlight_id") REFERENCES "public"."highlights"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_audience_exclusions" ADD CONSTRAINT "story_audience_exclusions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_audience_exclusions" ADD CONSTRAINT "story_audience_exclusions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_audience_members" ADD CONSTRAINT "story_audience_members_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_audience_members" ADD CONSTRAINT "story_audience_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_poll_options" ADD CONSTRAINT "story_poll_options_poll_id_story_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."story_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_poll_votes" ADD CONSTRAINT "story_poll_votes_poll_id_story_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."story_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_poll_votes" ADD CONSTRAINT "story_poll_votes_option_id_story_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."story_poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_poll_votes" ADD CONSTRAINT "story_poll_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_polls" ADD CONSTRAINT "story_polls_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_view_events" ADD CONSTRAINT "story_view_events_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_view_events" ADD CONSTRAINT "story_view_events_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_subscriber_id_users_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_orders" ADD CONSTRAINT "subscription_orders_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_subscriber_id_users_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_close_friends" ADD CONSTRAINT "user_close_friends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_close_friends" ADD CONSTRAINT "user_close_friends_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_creators" ADD CONSTRAINT "user_favorite_creators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_favorite_creators" ADD CONSTRAINT "user_favorite_creators_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feature_overrides" ADD CONSTRAINT "user_feature_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_users_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_users_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notes" ADD CONSTRAINT "user_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_topics" ADD CONSTRAINT "user_topics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_topics" ADD CONSTRAINT "user_topics_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_bookmarks" ADD CONSTRAINT "video_bookmarks_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_bookmarks" ADD CONSTRAINT "video_bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_comments" ADD CONSTRAINT "video_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videos" ADD CONSTRAINT "videos_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_author_idx" ON "articles" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "broadcast_channel_member_user_idx" ON "broadcast_channel_members" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "broadcast_channel_message_channel_idx" ON "broadcast_channel_messages" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE INDEX "broadcast_channel_message_author_idx" ON "broadcast_channel_messages" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "broadcast_channel_owner_idx" ON "broadcast_channels" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "broadcast_channel_created_at_idx" ON "broadcast_channels" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "business_member_user_idx" ON "business_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "business_owner_idx" ON "business_profiles" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "comment_post_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comment_author_idx" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "comment_parent_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "community_owner_idx" ON "communities" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "community_member_user_idx" ON "community_members" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "contact_shields_owner_idx" ON "contact_shields" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "contact_shields_digest_idx" ON "contact_shields" USING btree ("identifier_type","identifier_digest");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_shields_owner_identifier_idx" ON "contact_shields" USING btree ("owner_id","identifier_type","identifier_digest");--> statement-breakpoint
CREATE INDEX "topic_entity_idx" ON "content_topics" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "conv_member_user_idx" ON "conversation_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conv_part_a_idx" ON "conversations" USING btree ("participant_a");--> statement-breakpoint
CREATE INDEX "conv_part_b_idx" ON "conversations" USING btree ("participant_b");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_direct_pair_unique" ON "conversations" USING btree (least("participant_a","participant_b"),greatest("participant_a","participant_b")) WHERE coalesce("conversations"."is_group",false)=false AND "conversations"."participant_a" IS NOT NULL AND "conversations"."participant_b" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_creator_date_unique_idx" ON "creator_analytics_daily" USING btree ("creator_id","date");--> statement-breakpoint
CREATE INDEX "profile_view_creator_date_idx" ON "creator_profile_view_events" USING btree ("creator_id","view_date");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_view_creator_viewer_day_idx" ON "creator_profile_view_events" USING btree ("creator_id","viewer_id","view_date");--> statement-breakpoint
CREATE INDEX "creator_workspace_owner_kind_idx" ON "creator_workspace_items" USING btree ("owner_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_workspace_owner_kind_key_idx" ON "creator_workspace_items" USING btree ("owner_id","kind","item_key");--> statement-breakpoint
CREATE INDEX "entitlement_user_entity_idx" ON "entitlements" USING btree ("user_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "event_rsvp_user_idx" ON "event_rsvps" USING btree ("user_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "event_rsvp_event_status_idx" ON "event_rsvps" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "event_host_idx" ON "events" USING btree ("host_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_entitlement_feature_plan_idx" ON "feature_entitlements" USING btree ("feature_key","plan_key");--> statement-breakpoint
CREATE INDEX "feature_entitlement_active_idx" ON "feature_entitlements" USING btree ("feature_key","status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "follow_requests_requester_target_idx" ON "follow_requests" USING btree ("requester_id","target_id");--> statement-breakpoint
CREATE INDEX "follow_requests_target_status_idx" ON "follow_requests" USING btree ("target_id","status","created_at");--> statement-breakpoint
CREATE INDEX "follow_requests_requester_status_idx" ON "follow_requests" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX "grievance_ticket_idx" ON "grievance_tickets" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "grievance_status_idx" ON "grievance_tickets" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "highlight_item_position_idx" ON "highlight_items" USING btree ("highlight_id","position");--> statement-breakpoint
CREATE INDEX "highlight_owner_idx" ON "highlights" USING btree ("owner_id","updated_at");--> statement-breakpoint
CREATE INDEX "ledger_credit_idx" ON "ledger_transactions" USING btree ("credit_account_id");--> statement-breakpoint
CREATE INDEX "ledger_debit_idx" ON "ledger_transactions" USING btree ("debit_account_id");--> statement-breakpoint
CREATE INDEX "ledger_ref_idx" ON "ledger_transactions" USING btree ("reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_ref_unique_idx" ON "ledger_transactions" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "livestream_host_idx" ON "live_streams" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "marketplace_order_product_idx" ON "marketplace_orders" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "marketplace_order_buyer_idx" ON "marketplace_orders" USING btree ("buyer_id","created_at");--> statement-breakpoint
CREATE INDEX "marketplace_order_seller_idx" ON "marketplace_orders" USING btree ("seller_id","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_cleanup_idx" ON "media_assets" USING btree ("deletion_status","cleanup_at");--> statement-breakpoint
CREATE INDEX "media_assets_owner_idx" ON "media_assets" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "media_references_entity_idx" ON "media_references" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "message_preview_user_idx" ON "message_preview_events" USING btree ("user_id","previewed_at");--> statement-breakpoint
CREATE INDEX "msg_conv_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "msg_sender_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "msg_recipient_idx" ON "messages" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "notif_recip_idx" ON "notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "payment_order_payer_idx" ON "payment_orders" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "payment_order_creator_idx" ON "payment_orders" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "payment_order_stream_idx" ON "payment_orders" USING btree ("stream_id");--> statement-breakpoint
CREATE INDEX "post_bookmarks_user_idx" ON "post_bookmarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "post_likes_user_idx" ON "post_likes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_poll_options_poll_position_idx" ON "post_poll_options" USING btree ("poll_id","position");--> statement-breakpoint
CREATE INDEX "post_poll_options_poll_idx" ON "post_poll_options" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "post_poll_votes_option_idx" ON "post_poll_votes" USING btree ("option_id");--> statement-breakpoint
CREATE INDEX "post_poll_votes_user_idx" ON "post_poll_votes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_polls_post_idx" ON "post_polls" USING btree ("post_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_reposts_user_post_idx" ON "post_reposts" USING btree ("user_id","post_id");--> statement-breakpoint
CREATE INDEX "post_reposts_post_idx" ON "post_reposts" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "post_reposts_user_idx" ON "post_reposts" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "post_author_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "post_score_idx" ON "posts" USING btree ("score","created_at");--> statement-breakpoint
CREATE INDEX "post_created_at_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_analytics_occurred_at_idx" ON "product_analytics_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "product_analytics_actor_occurred_at_idx" ON "product_analytics_events" USING btree ("actor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "product_analytics_job_started_idx" ON "product_analytics_job_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "product_save_user_idx" ON "product_saves" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "product_seller_idx" ON "products" USING btree ("seller_id");--> statement-breakpoint
CREATE INDEX "profile_comments_profile_idx" ON "profile_comments" USING btree ("profile_id","created_at");--> statement-breakpoint
CREATE INDEX "profile_comments_author_idx" ON "profile_comments" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profile_post_pin_position_idx" ON "profile_post_pins" USING btree ("user_id","position");--> statement-breakpoint
CREATE INDEX "profile_post_pin_post_idx" ON "profile_post_pins" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "profile_showcases_user_idx" ON "profile_showcases" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "project_owner_idx" ON "projects" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_user_endpoint_idx" ON "push_subscriptions" USING btree ("user_id","endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reel_views_reel_idx" ON "reel_views" USING btree ("reel_id");--> statement-breakpoint
CREATE INDEX "reel_views_user_idx" ON "reel_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "story_author_idx" ON "stories" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "story_audience_exclusion_user_idx" ON "story_audience_exclusions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "story_audience_member_user_idx" ON "story_audience_members" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "story_poll_options_poll_position_idx" ON "story_poll_options" USING btree ("poll_id","position");--> statement-breakpoint
CREATE INDEX "story_poll_options_poll_idx" ON "story_poll_options" USING btree ("poll_id");--> statement-breakpoint
CREATE INDEX "story_poll_votes_option_idx" ON "story_poll_votes" USING btree ("option_id");--> statement-breakpoint
CREATE UNIQUE INDEX "story_polls_story_idx" ON "story_polls" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "story_reaction_user_idx" ON "story_reactions" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "story_view_event_idempotency_idx" ON "story_view_events" USING btree ("story_id","event_key");--> statement-breakpoint
CREATE INDEX "story_view_event_story_time_idx" ON "story_view_events" USING btree ("story_id","viewed_at");--> statement-breakpoint
CREATE INDEX "story_view_event_viewer_time_idx" ON "story_view_events" USING btree ("viewer_id","viewed_at");--> statement-breakpoint
CREATE INDEX "story_view_user_idx" ON "story_views" USING btree ("user_id","viewed_at");--> statement-breakpoint
CREATE INDEX "subscription_order_subscription_idx" ON "subscription_orders" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "subscription_order_subscriber_idx" ON "subscription_orders" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "subscription_order_creator_idx" ON "subscription_orders" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "sub_creator_idx" ON "subscriptions" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "sub_subscriber_idx" ON "subscriptions" USING btree ("subscriber_id");--> statement-breakpoint
CREATE INDEX "topic_name_idx" ON "topics" USING btree ("name");--> statement-breakpoint
CREATE INDEX "user_close_friends_friend_idx" ON "user_close_friends" USING btree ("friend_id");--> statement-breakpoint
CREATE INDEX "user_close_friends_user_idx" ON "user_close_friends" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_favorite_creators_creator_idx" ON "user_favorite_creators" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "user_favorite_creators_user_idx" ON "user_favorite_creators" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_feature_override_active_idx" ON "user_feature_overrides" USING btree ("user_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "user_follows_following_idx" ON "user_follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "user_notes_author_idx" ON "user_notes" USING btree ("author_id","created_at");--> statement-breakpoint
CREATE INDEX "user_notes_expiry_idx" ON "user_notes" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_notes_author_unique_idx" ON "user_notes" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "user_topic_idx" ON "user_topics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "video_bookmark_user_idx" ON "video_bookmarks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "video_bookmark_video_idx" ON "video_bookmarks" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "video_comment_video_idx" ON "video_comments" USING btree ("video_id","created_at");--> statement-breakpoint
CREATE INDEX "video_comment_author_idx" ON "video_comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "video_author_idx" ON "videos" USING btree ("author_id");