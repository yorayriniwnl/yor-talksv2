#!/usr/bin/env node
import { accountErasureExecutor, eraseAccountData } from '../../lib/db/runtime/account-erasure.mjs';
import { readFile, stat } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { validateDeletionManifest, validateDeletionManifestShape, reconcileRestoredDeletions, DeletionVerificationError } from './verify-restored-deletions.mjs';

const MAX_MANIFEST_BYTES = 1024 * 1024;

export class DeletionReplayError extends Error {}

function requireValid(condition, message) {
  if (!condition) throw new DeletionReplayError(message);
}

/** Replays erasures against an isolated restored database snapshot before serving traffic. */
export async function replayRestoredDeletions(client, manifest, expectedDatabase, options = {}) {
  validateDeletionManifestShape(manifest);
  requireValid(typeof expectedDatabase === 'string' && /^[A-Za-z0-9_-]{1,63}$/.test(expectedDatabase),
    'an explicit recovery database name is required');
  if (manifest.schemaVersion === 2) requireValid(typeof options.manifestSha256 === 'string'
    && /^[a-f0-9]{64}$/.test(options.manifestSha256), 'the validated manifest digest is required');
  let inTransaction = false;
  try {
    await client.query('BEGIN'); inTransaction = true;
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '30s'");
    const current = await client.query('SELECT current_database() AS database_name');
    requireValid(current.rows[0]?.database_name === expectedDatabase, 'connected database does not match the explicit recovery target');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('yor_recovery_replay'))");
    const entries = manifest.schemaVersion === 2 ? manifest.erasures
      : manifest.deletedAccountIds.map(accountId => ({ accountId }));
    let replayedAccounts = 0, replayedUnbound = 0;
    const execute = accountErasureExecutor(client);
    for (const entry of entries) {
      if (entry.accountId) {
        const result = await client.query('SELECT id,email,email_verified AS "emailVerified" FROM users WHERE id=$1 FOR UPDATE', [entry.accountId]);
        if (result.rows[0] || entry.id) {
          // Even an already absent account can have legacy JSON references or
          // restored cleanup jobs. Reapply the same idempotent cleanup by ID.
          await eraseAccountData(execute,result.rows[0] ?? {id:entry.accountId,email:'',emailVerified:false},
            { id:entry.id,erasedAt:entry.erasedAt ?? manifest.through,
            emailHash:entry.emailHash,replay:true });
          if (result.rows[0]) replayedAccounts++;
        }
      } else {
        // The event time protects any later, independently created registration.
        for (const table of ['preregistrations','waitlist']) await client.query(
          `DELETE FROM ${table} WHERE encode(sha256(lower(btrim(email))::bytea),'hex')=$1 AND created_at<=$2::timestamptz`,
          [entry.emailHash,entry.erasedAt]);
        replayedUnbound++;
      }
      if (entry.id) await client.query(`INSERT INTO deletion_journal(id,account_id,stable_identity_digest,reason,status,erased_at,replayed_at)
        VALUES($1,$2,$3,'disaster_recovery_replay','replayed',$4,clock_timestamp())
        ON CONFLICT(id) DO UPDATE SET status='replayed',replayed_at=clock_timestamp()`,
      [entry.id,entry.accountId,entry.emailHash,entry.erasedAt]);
    }
    if (manifest.schemaVersion === 2) {
      for (const item of manifest.suppressions) {
        await client.query(`INSERT INTO email_suppressions(email_hash,purpose,reason,suppressed_at)
          VALUES($1,$2,'disaster_recovery_replay',$3) ON CONFLICT(email_hash,purpose) DO NOTHING`,
        [item.emailHash,item.purpose,item.suppressedAt]);
        await client.query(`UPDATE consent_records SET granted=false,withdrawn_at=$3::timestamptz
          WHERE subject_digest=$1 AND granted=true AND ($2='all_promotional' OR purpose=$2)`,
        [item.emailHash,item.purpose,item.suppressedAt]);
        if (['all_promotional','launch_updates'].includes(item.purpose)) await client.query(
          `UPDATE preregistrations SET unsubscribed_at=COALESCE(unsubscribed_at,$2::timestamptz)
           WHERE encode(sha256(lower(btrim(email))::bytea),'hex')=$1`, [item.emailHash,item.suppressedAt]);
      }
      await client.query(`UPDATE users SET processing_restricted=true,restriction_reason='recovery_of_verified_restriction',
        restricted_at=COALESCE(restricted_at,$2::timestamptz) WHERE id=ANY($1::uuid[])`,[manifest.restrictedAccountIds,manifest.through]);
    }
    await reconcileRestoredDeletions(client,manifest,expectedDatabase);
    // Legacy identity-only manifests cannot satisfy the production recovery gate.
    await client.query(`INSERT INTO recovery_replay_log(journal_id,through,replayed_accounts,replayed_unbound,manifest_sha256)
      VALUES($1,$2,$3,$4,$5)`, [manifest.journalId,manifest.through,replayedAccounts,replayedUnbound,
        manifest.schemaVersion === 2 ? options.manifestSha256 : null]);
    await client.query('COMMIT'); inTransaction = false;
    return { journalId:manifest.journalId,through:manifest.through,
      requestedAccounts:entries.filter(e=>e.accountId).length,replayedAccounts,replayedUnbound };
  } catch (error) {
    if (inTransaction) await client.query('ROLLBACK').catch(()=>{});
    throw error;
  }
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

    const result = await replayRestoredDeletions(client, manifest, process.env.RESTORE_EXPECTED_DATABASE,
      { manifestSha256: process.env.RESTORE_DELETION_MANIFEST_SHA256 });
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
