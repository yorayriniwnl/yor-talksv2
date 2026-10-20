#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { validateDeletionManifest, DeletionVerificationError } from './verify-restored-deletions.mjs';

const MAX_MANIFEST_BYTES = 1024 * 1024;

export class DeletionReplayError extends Error {}

function requireValid(condition, message) {
  if (!condition) throw new DeletionReplayError(message);
}

/** Replays erasures against an isolated restored database snapshot before serving traffic. */
export async function replayRestoredDeletions(client, manifest, expectedDatabase) {
  requireValid(typeof expectedDatabase === 'string' && /^[A-Za-z0-9_-]{1,63}$/.test(expectedDatabase),
    'an explicit recovery database name is required');

  const current = await client.query('SELECT current_database() AS database_name');
  requireValid(current.rows[0]?.database_name === expectedDatabase,
    'connected database does not match the explicit recovery target');

  let replayedCount = 0;

  for (const accountId of manifest.deletedAccountIds) {
    let inTransaction = false;
    try {
      await client.query('BEGIN');
      inTransaction = true;
      await client.query("SET LOCAL statement_timeout = '30s'");
      await client.query("SET LOCAL lock_timeout = '5s'");

      // Check if user row exists
      const userRes = await client.query('SELECT id, email, username FROM public.users WHERE id=$1 FOR UPDATE', [accountId]);
      const user = userRes.rows[0];

      if (user) {
        const stableDigest = createHash('sha256').update(user.email.trim().toLowerCase()).digest('hex');

        // Minimize commerce/orders
        await client.query(`UPDATE marketplace_orders SET shipping_name='Deleted account', shipping_address='', shipping_phone=NULL WHERE buyer_id=$1`, [accountId]);
        await client.query(`UPDATE payment_orders SET message='' WHERE payer_id=$1`, [accountId]);
        await client.query(`UPDATE marketplace_orders o SET product_snapshot=jsonb_build_object('id',p.id,'title',p.title) FROM products p WHERE p.id=o.product_id AND p.seller_id=$1`, [accountId]);
        await client.query(`UPDATE subscriptions SET status='cancelled' WHERE creator_id=$1 OR subscriber_id=$1`, [accountId]);
        await client.query(`UPDATE entitlements SET status='revoked' WHERE entity_type='subscription' AND entity_id IN (SELECT id::text FROM subscriptions WHERE creator_id=$1 OR subscriber_id=$1)`, [accountId]);

        // Break reply/forward chains
        await client.query(`UPDATE messages SET reply_to_id=NULL WHERE reply_to_id IN (SELECT id FROM messages WHERE sender_id=$1)`, [accountId]);
        await client.query(`UPDATE messages SET forwarded_from_id=NULL WHERE forwarded_from_id IN (SELECT id FROM messages WHERE sender_id=$1)`, [accountId]);

        // Scrub reactions from retained content
        for (const tableName of ['posts', 'comments', 'messages', 'broadcast_channel_messages']) {
          await client.query(`UPDATE ${tableName} AS retained SET reactions=COALESCE((
            SELECT jsonb_object_agg(reaction.key, CASE WHEN jsonb_typeof(reaction.value)='array'
              THEN reaction.value-$1 ELSE reaction.value END)
            FROM jsonb_each(CASE WHEN jsonb_typeof(retained.reactions)='object' THEN retained.reactions ELSE '{}'::jsonb END) AS reaction(key,value)
          ),'{}'::jsonb)
          WHERE EXISTS (
            SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(retained.reactions)='object' THEN retained.reactions ELSE '{}'::jsonb END) AS reaction(key,value)
            WHERE jsonb_typeof(reaction.value)='array' AND reaction.value ? $1
          )`, [accountId]);
        }

        // Clean user IDs from legacy arrays
        for (const [tbl, col] of [
          ['comments', 'liked_by'], ['videos', 'liked_by'], ['video_comments', 'liked_by'],
          ['users', 'blocked_users'], ['users', 'muted_users'], ['live_streams', 'guest_ids'],
          ['communities', 'moderators'], ['communities', 'pending_requests'],
        ]) {
          await client.query(`UPDATE ${tbl} SET ${col}=${col}-$1 WHERE jsonb_typeof(${col})='array' AND ${col} ? $1`, [accountId]);
        }

        // Drop attributed notifications
        await client.query(`DELETE FROM notifications WHERE metadata->>'actorId'=$1`, [accountId]);

        // Preserve surviving group members' conversations and messages
        await client.query(`UPDATE messages m SET recipient_id=COALESCE((
          SELECT cm.user_id FROM conversation_members cm
          WHERE cm.conversation_id=m.conversation_id AND cm.user_id<>$1 AND cm.user_id<>m.sender_id
          ORDER BY cm.user_id LIMIT 1
        ), m.sender_id)
        WHERE m.sender_id<>$1 AND m.recipient_id=$1
          AND EXISTS (SELECT 1 FROM conversations c WHERE c.id=m.conversation_id AND c.is_group)`, [accountId]);

        await client.query(`UPDATE conversations SET participant_ids=participant_ids-$1, updated_at=clock_timestamp()
          WHERE jsonb_typeof(participant_ids)='array' AND participant_ids ? $1`, [accountId]);

        // Repoint participant_a and participant_b for group conversations
        await client.query(`WITH affected AS MATERIALIZED (
          SELECT c.id FROM conversations c
          WHERE c.is_group AND (
            c.participant_a=$1 OR c.participant_b=$1
            OR c.participant_ids @> jsonb_build_array($1::text)
            OR EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=$1)
          )
        ), surviving AS (
          SELECT cm.conversation_id AS id, array_agg(cm.user_id ORDER BY cm.user_id) AS member_ids
          FROM conversation_members cm JOIN affected a ON a.id=cm.conversation_id
          WHERE cm.user_id<>$1
          GROUP BY cm.conversation_id
        )
        UPDATE conversations c SET participant_a=s.member_ids[1],
          participant_b=COALESCE(s.member_ids[2], s.member_ids[1]),
          participant_ids=to_jsonb(s.member_ids::text[]), updated_at=clock_timestamp()
        FROM surviving s WHERE c.id=s.id`, [accountId]);

        // Delete empty groups where no surviving member exists
        await client.query(`DELETE FROM conversations c
          WHERE c.is_group AND (
            c.participant_a=$1 OR c.participant_b=$1
            OR c.participant_ids @> jsonb_build_array($1::text)
            OR EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id=$1)
          ) AND NOT EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id=c.id AND cm.user_id<>$1)`, [accountId]);

        // Delete membership
        await client.query(`DELETE FROM conversation_members WHERE user_id=$1`, [accountId]);

        // Delete departing member's messages (while other members' messages remain)
        await client.query(`DELETE FROM messages WHERE sender_id=$1`, [accountId]);

        // Add email suppression
        await client.query(`INSERT INTO email_suppressions (id, email_hash, purpose, reason, suppressed_at, metadata)
          VALUES (gen_random_uuid(), $1, 'all_promotional', 'disaster_recovery_replay', clock_timestamp(), jsonb_build_object('account_id', $2::text))
          ON CONFLICT (email_hash, purpose) DO NOTHING`, [stableDigest, accountId]);

        // Delete user row
        await client.query(`DELETE FROM users WHERE id=$1`, [accountId]);

        // Record in deletion_journal
        await client.query(`INSERT INTO deletion_journal (account_id, stable_identity_digest, reason, status, erased_at, replayed_at, metadata)
          VALUES ($1, $2, 'disaster_recovery_replay', 'replayed', clock_timestamp(), clock_timestamp(),
            jsonb_build_object('journal_id', $3::text, 'cutoff', $4::text))`,
          [accountId, stableDigest, manifest.journalId, manifest.through]);

        replayedCount++;
      } else {
        // Even if user row was missing, ensure no orphaned authored messages survive
        await client.query(`DELETE FROM messages WHERE sender_id=$1`, [accountId]);
      }

      await client.query('COMMIT');
      inTransaction = false;
    } catch (err) {
      if (inTransaction) await client.query('ROLLBACK').catch(() => {});
      throw err;
    }
  }

  // Record completed recovery audit log in database
  await client.query(`CREATE TABLE IF NOT EXISTS recovery_replay_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_id text NOT NULL,
    through text NOT NULL,
    replayed_accounts integer NOT NULL,
    completed_at timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query(`INSERT INTO recovery_replay_log (journal_id, through, replayed_accounts, completed_at)
    VALUES ($1, $2, $3, clock_timestamp())`,
    [manifest.journalId, manifest.through, replayedCount]);

  return {
    journalId: manifest.journalId,
    through: manifest.through,
    requestedAccounts: manifest.deletedAccountIds.length,
    replayedAccounts: replayedCount,
  };
}

async function main() {
  let client;
  try {
    requireValid(process.argv.length === 3, 'supply exactly one independently sourced deletion manifest path');
    requireValid(typeof process.env.RESTORE_DATABASE_URL === 'string' && process.env.RESTORE_DATABASE_URL.length > 0,
      'RESTORE_DATABASE_URL must explicitly identify the isolated recovery target');

    const details = await stat(process.argv[2]);
    requireValid(details.isFile() && details.size > 0 && details.size <= MAX_MANIFEST_BYTES,
      'manifest must be a regular file of at most 1 MiB');

    const manifest = validateDeletionManifest(await readFile(process.argv[2]), {
      expectedSha256: process.env.RESTORE_DELETION_MANIFEST_SHA256,
      expectedThrough: process.env.RESTORE_DELETION_JOURNAL_THROUGH,
    });

    const requireDb = createRequire(new URL('../../lib/db/package.json', import.meta.url));
    const { Client } = requireDb('pg');
    client = new Client({ connectionString: process.env.RESTORE_DATABASE_URL, connectionTimeoutMillis: 5000 });
    await client.connect();

    const result = await replayRestoredDeletions(client, manifest, process.env.RESTORE_EXPECTED_DATABASE);
    console.log(JSON.stringify({ status: 'erasure-replay-complete', ...result }));
  } catch (error) {
    const reason = error instanceof DeletionReplayError || error instanceof DeletionVerificationError
      ? error.message
      : 'manifest parsing or erasure replay failed';
    console.error(`Erasure replay failed: ${reason}`);
    process.exitCode = 1;
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) await main();
