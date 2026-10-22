import { createHash, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

/** Adapt the same parameterized statements to a PostgreSQL recovery client. */
export function accountErasureExecutor(client) {
  const dialect = new PgDialect();
  return statement => { const query = dialect.sqlToQuery(statement); return client.query(query.sql,query.params); };
}

/** Caller must hold the user's row lock in a transaction. Never commits itself. */
export async function eraseAccountData(execute, locked, journal = {}) {
  const userId = locked.id;
  const stableIdentityDigest = journal.emailHash ?? createHash('sha256').update(locked.email.trim().toLowerCase()).digest('hex');
  // The archive already attributes a waitlist address only after email
  // verification. Apply that same ownership rule when erasing the account;
  // an unverified signup must not remove somebody else's waitlist record.
  if (locked.emailVerified) {
    await execute(sql`DELETE FROM waitlist WHERE lower(email)=lower(${locked.email})`);
    await execute(sql`DELETE FROM preregistrations WHERE lower(email)=lower(${locked.email})`);
  }

  // Preserve the latest restrictive guardian decision before account
  // deletion nulls its user reference; older grants must never resurface.
  await execute(sql`WITH affected_subjects AS MATERIALIZED (
    SELECT DISTINCT user_id FROM guardian_authorizations WHERE guardian_user_id=${userId} AND user_id IS NOT NULL
  ), bumped AS (
    INSERT INTO eligibility_revisions(user_id,revision)
    SELECT user_id,1 FROM affected_subjects
    ON CONFLICT(user_id) DO UPDATE SET revision=eligibility_revisions.revision+1,updated_at=clock_timestamp()
    RETURNING user_id,revision
  )
  UPDATE guardian_authorizations g SET status='revoked',withdrawn_at=clock_timestamp(),subject_revision=b.revision
  FROM bumped b WHERE g.guardian_user_id=${userId} AND g.user_id=b.user_id`);
  await execute(sql`WITH bumped AS (
    UPDATE eligibility_enrollments e SET revision=revision+1
    WHERE e.id IN (SELECT DISTINCT enrollment_id FROM guardian_authorizations WHERE guardian_user_id=${userId} AND enrollment_id IS NOT NULL)
    RETURNING id,revision
  )
  UPDATE guardian_authorizations g SET status='revoked',withdrawn_at=clock_timestamp(),subject_revision=b.revision
  FROM bumped b WHERE g.guardian_user_id=${userId} AND g.enrollment_id=b.id`);

  await execute(sql`UPDATE ledger_transactions SET
    credit_account_id=CASE WHEN credit_account_id=${userId} THEN NULL ELSE credit_account_id END,
    debit_account_id=CASE WHEN debit_account_id=${userId} THEN NULL ELSE debit_account_id END
    WHERE credit_account_id=${userId} OR debit_account_id=${userId}`);
  await execute(sql`UPDATE invites SET invitee_id=NULL WHERE invitee_id=${userId}`);

  await execute(sql`UPDATE marketplace_orders SET shipping_name='Deleted account',shipping_address='',shipping_phone=NULL WHERE buyer_id=${userId}`);
  await execute(sql`UPDATE payment_orders SET message='' WHERE payer_id=${userId}`);
  await execute(sql`UPDATE marketplace_orders o SET product_snapshot=jsonb_build_object('id',p.id,'title',p.title)
    FROM products p WHERE p.id=o.product_id AND p.seller_id=${userId}`);
  await execute(sql`UPDATE entitlements SET status='revoked' WHERE entity_type='subscription'
    AND entity_id IN (SELECT id::text FROM subscriptions WHERE creator_id=${userId} OR subscriber_id=${userId})`);
  await execute(sql`UPDATE subscriptions SET status='cancelled' WHERE creator_id=${userId} OR subscriber_id=${userId}`);

  await execute(sql`INSERT INTO media_cleanup_holds(deletion_id,source_type,source_id,references_json)
    SELECT ${userId}::uuid,'post',id,images FROM posts WHERE author_id=${userId} AND images<>'[]'::jsonb
    UNION ALL SELECT ${userId}::uuid,'avatar',id,to_jsonb(avatar_url) FROM users WHERE id=${userId} AND avatar_url IS NOT NULL
    UNION ALL SELECT ${userId}::uuid,'story',id,to_jsonb(media_url) FROM stories WHERE author_id=${userId} AND media_url IS NOT NULL
    UNION ALL SELECT ${userId}::uuid,'video',id,jsonb_build_array(video_url,thumbnail_url) FROM videos WHERE author_id=${userId}`);
  await execute(sql`UPDATE users SET follower_count=greatest(0,coalesce(follower_count,0)-1)
    WHERE id IN (SELECT following_id FROM user_follows WHERE follower_id=${userId})`);
  await execute(sql`UPDATE users SET following_count=greatest(0,coalesce(following_count,0)-1)
    WHERE id IN (SELECT follower_id FROM user_follows WHERE following_id=${userId})`);
  await execute(sql`INSERT INTO background_jobs(id,kind,dedup_key,payload)
    VALUES(${randomUUID()},'account_cleanup',${`account:${userId}`},${JSON.stringify({
      userId,
      emailHash: stableIdentityDigest,
    })}::jsonb)
    ON CONFLICT(dedup_key) DO UPDATE SET status='pending',attempts=0,payload=excluded.payload,
      lease_token=NULL,lease_until=NULL,last_error=NULL,available_at=clock_timestamp(),updated_at=clock_timestamp()
    WHERE ${Boolean(journal.replay)}`);

  // Nullable legacy foreign keys retain the other author's direct history.
  // Its unnormalized participant snapshot must also lose the deleted ID.
  await execute(sql`UPDATE conversations SET participant_ids=participant_ids-${userId},updated_at=clock_timestamp()
    WHERE NOT COALESCE(is_group,false) AND jsonb_typeof(participant_ids)='array'
      AND participant_ids ? ${userId}`);

  // Group conversations still carry two legacy user foreign keys. Repoint
  // those references before deleting a member so they cannot cascade the
  // entire conversation and its surviving members' history.
  await execute(sql`SELECT c.id FROM conversations c
    WHERE c.is_group AND (
      c.participant_a=${userId} OR c.participant_b=${userId}
      OR c.participant_ids @> jsonb_build_array(${userId}::text)
      OR EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=${userId})
    ) ORDER BY c.id FOR UPDATE`);

  // Remove references from surviving messages before authored messages
  // are erased. These nullable links must not prevent the deletion.
  await execute(sql`UPDATE messages SET reply_to_id=NULL
    WHERE reply_to_id IN (SELECT id FROM messages WHERE sender_id=${userId})`);
  await execute(sql`UPDATE messages SET forwarded_from_id=NULL
    WHERE forwarded_from_id IN (SELECT id FROM messages WHERE sender_id=${userId})`);

  // These legacy JSON references have no foreign keys. Remove only the
  // departing actor, preserving other reactions and their ordering.
  for (const tableName of ['posts', 'comments', 'messages', 'broadcast_channel_messages']) {
    await execute(sql`UPDATE ${sql.identifier(tableName)} AS retained SET reactions=COALESCE((
      SELECT jsonb_object_agg(reaction.key,CASE WHEN jsonb_typeof(reaction.value)='array'
        THEN reaction.value-${userId} ELSE reaction.value END)
      FROM jsonb_each(CASE WHEN jsonb_typeof(retained.reactions)='object' THEN retained.reactions ELSE '{}'::jsonb END) AS reaction(key,value)
    ),'{}'::jsonb)
    WHERE EXISTS (
      SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(retained.reactions)='object' THEN retained.reactions ELSE '{}'::jsonb END) AS reaction(key,value)
      WHERE jsonb_typeof(reaction.value)='array' AND reaction.value ? ${userId}
    )`);
  }
  for (const [tableName, columnName] of [
    ['comments', 'liked_by'], ['videos', 'liked_by'], ['video_comments', 'liked_by'],
    ['users', 'blocked_users'], ['users', 'muted_users'], ['live_streams', 'guest_ids'],
    ['communities', 'moderators'], ['communities', 'pending_requests'],
  ]) {
    const column = sql.identifier(columnName);
    await execute(sql`UPDATE ${sql.identifier(tableName)} SET ${column}=${column}-${userId}
      WHERE jsonb_typeof(${column})='array' AND ${column} ? ${userId}`);
  }

  // Discussions are embedded in the community row. Authored discussions
  // follow account-content deletion; likes on other discussions are pruned
  // without replacing their content or unrelated legacy announcement data.
  await execute(sql`UPDATE communities c SET announcements=COALESCE((
    SELECT jsonb_agg(CASE
      WHEN jsonb_typeof(item.value->'likedBy')='array' AND (item.value->'likedBy') ? ${userId}
      THEN jsonb_set(jsonb_set(item.value,'{likedBy}',(item.value->'likedBy')-${userId}),
        '{likes}',to_jsonb(jsonb_array_length((item.value->'likedBy')-${userId})))
      ELSE item.value END ORDER BY item.ordinality)
    FROM jsonb_array_elements(c.announcements) WITH ORDINALITY AS item(value,ordinality)
    WHERE item.value->>'authorId' IS DISTINCT FROM ${userId}
  ),'[]'::jsonb), posts_count=greatest(0,coalesce(c.posts_count,0)-(
    SELECT count(*)::integer FROM jsonb_array_elements(c.announcements) AS item(value)
    WHERE item.value->>'authorId'=${userId}
  )),updated_at=clock_timestamp()
  WHERE jsonb_typeof(c.announcements)='array' AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(c.announcements) AS item(value)
    WHERE item.value->>'authorId'=${userId}
      OR (jsonb_typeof(item.value->'likedBy')='array' AND (item.value->'likedBy') ? ${userId})
  )`);

  // Generated notifications keep actor names in their rendered text. Drop
  // only notifications attributed to this actor or to their channel update;
  // recipient-owned notices from other actors stay intact. Workers resolve
  // the canonical row by ID, so a queued copy cannot resurrect these notices.
  await execute(sql`DELETE FROM notifications n WHERE n.metadata->>'actorId'=${userId}
    OR (n.type='broadcast_channel' AND (
      n.metadata->>'messageId' IN (SELECT id::text FROM broadcast_channel_messages WHERE author_id=${userId})
      OR n.related_id IN (SELECT id FROM broadcast_channels WHERE owner_id=${userId})
    ))`);

  // Group recipient_id is a legacy display/unread field. Keep retained
  // messages valid by pointing it at another surviving member, falling
  // back to the author when only that member remains.
  await execute(sql`UPDATE messages m SET recipient_id=COALESCE((
    SELECT cm.user_id FROM conversation_members cm
    WHERE cm.conversation_id=m.conversation_id AND cm.user_id<>${userId} AND cm.user_id<>m.sender_id
    ORDER BY cm.user_id LIMIT 1
  ),m.sender_id)
  WHERE m.sender_id<>${userId} AND m.recipient_id=${userId}
    AND EXISTS (SELECT 1 FROM conversations c WHERE c.id=m.conversation_id AND c.is_group)`);

  // Rebuild the legacy columns and JSON participant list from normalized
  // membership. One remaining member keeps the archive accessible; an
  // empty group has no surviving owner and is removed below.
  await execute(sql`WITH affected AS MATERIALIZED (
    SELECT c.id FROM conversations c
    WHERE c.is_group AND (
      c.participant_a=${userId} OR c.participant_b=${userId}
      OR c.participant_ids @> jsonb_build_array(${userId}::text)
      OR EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=${userId})
    )
  ), surviving AS (
    SELECT cm.conversation_id AS id,array_agg(cm.user_id ORDER BY cm.user_id) AS member_ids
    FROM conversation_members cm JOIN affected a ON a.id=cm.conversation_id
    WHERE cm.user_id<>${userId}
    GROUP BY cm.conversation_id
  )
  UPDATE conversations c SET participant_a=s.member_ids[1],
    participant_b=COALESCE(s.member_ids[2],s.member_ids[1]),
    participant_ids=to_jsonb(s.member_ids::text[]),updated_at=clock_timestamp()
  FROM surviving s WHERE c.id=s.id`);

  // Pending invitations were authorized against the old member set. Revoke
  // them and scrub the departing ID from retained invitation snapshots.
  await execute(sql`UPDATE conversation_invitations i SET
    member_ids_at_invite=(SELECT COALESCE(jsonb_agg(entry.value ORDER BY entry.ordinality),'[]'::jsonb)
      FROM jsonb_array_elements(i.member_ids_at_invite) WITH ORDINALITY AS entry(value,ordinality)
      WHERE entry.value<>to_jsonb(${userId}::text)),
    guardian_required_user_ids=(SELECT COALESCE(jsonb_agg(entry.value ORDER BY entry.ordinality),'[]'::jsonb)
      FROM jsonb_array_elements(i.guardian_required_user_ids) WITH ORDINALITY AS entry(value,ordinality)
      WHERE entry.value<>to_jsonb(${userId}::text)),
    state=CASE WHEN i.state='pending' THEN 'revoked' ELSE i.state END,
    revoked_at=CASE WHEN i.state='pending' THEN clock_timestamp() ELSE i.revoked_at END,
    updated_at=clock_timestamp()
  WHERE i.member_ids_at_invite @> jsonb_build_array(${userId}::text)
    OR i.guardian_required_user_ids @> jsonb_build_array(${userId}::text)
    OR i.conversation_id IN (
      SELECT c.id FROM conversations c
      WHERE c.is_group AND EXISTS (SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id=c.id AND cm.user_id=${userId})
    )`);

  // A group with no surviving member cannot be accessed by anyone. Delete
  // it explicitly, including any legacy orphaned messages, before the user
  // row's remaining foreign keys are cascaded.
  await execute(sql`DELETE FROM conversations c
    WHERE c.is_group AND (
      c.participant_a=${userId} OR c.participant_b=${userId}
      OR c.participant_ids @> jsonb_build_array(${userId}::text)
      OR EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=${userId})
    ) AND NOT EXISTS (SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id=c.id AND cm.user_id<>${userId})`);

  // Recovery supplies the original event ID and erasure time. Idempotent replay
  // never creates a newer erasure event or retains the former username.
  await execute(sql`INSERT INTO deletion_journal(id,account_id,stable_identity_digest,reason,status,erased_at,replayed_at)
    VALUES(${journal.id ?? randomUUID()}::uuid,${userId}::uuid,${stableIdentityDigest},${journal.replay ? 'disaster_recovery_replay' : 'user_request'},
      ${journal.replay ? 'replayed' : 'erased'},COALESCE(${journal.erasedAt ?? null}::timestamptz,clock_timestamp()),
      CASE WHEN ${Boolean(journal.replay)} THEN clock_timestamp() ELSE NULL END)
    ON CONFLICT(id) DO UPDATE SET status='replayed',replayed_at=clock_timestamp()`);

  // An unverified signup has no authority over another address's preferences.
  if (locked.emailVerified) {
  // Add promotional email suppressions
  await execute(sql`INSERT INTO email_suppressions(id, email_hash, purpose, reason, suppressed_at, metadata)
    VALUES(${randomUUID()}::uuid, ${stableIdentityDigest}, 'all_promotional', 'account_deletion', clock_timestamp(), jsonb_build_object('account_id', ${userId}::text))
    ON CONFLICT(email_hash, purpose) DO NOTHING`);
  await execute(sql`INSERT INTO email_suppressions(id, email_hash, purpose, reason, suppressed_at, metadata)
    VALUES(${randomUUID()}::uuid, ${stableIdentityDigest}, 'launch_updates', 'account_deletion', clock_timestamp(), jsonb_build_object('account_id', ${userId}::text))
    ON CONFLICT(email_hash, purpose) DO NOTHING`);

  await execute(sql`UPDATE consent_records SET granted=false, withdrawn_at=clock_timestamp()
    WHERE (subject_id=${userId} OR subject_digest=${stableIdentityDigest}) AND granted=true`);
  }

  // The departing member's own messages are private account content and
  // are removed. Messages from all other members in retained groups stay.
  await execute(sql`DELETE FROM messages WHERE sender_id=${userId}`);

  await execute(sql`DELETE FROM users WHERE id=${userId}`);
}
