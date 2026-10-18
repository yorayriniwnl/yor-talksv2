#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_ACCOUNT_IDS = 10_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UTC_SECOND = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export class DeletionVerificationError extends Error {}

function requireValid(condition, message) {
  if (!condition) throw new DeletionVerificationError(message);
}

/** The digest and journal checkpoint must come from outside the restored backup. */
export function validateDeletionManifest(bytes, { expectedSha256, expectedThrough, now = Date.now() }) {
  requireValid(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= MAX_MANIFEST_BYTES,
    'manifest must be nonempty and at most 1 MiB');
  requireValid(typeof expectedSha256 === 'string' && /^[0-9a-f]{64}$/.test(expectedSha256),
    'an independently obtained lowercase SHA-256 is required');
  requireValid(createHash('sha256').update(bytes).digest('hex') === expectedSha256,
    'manifest digest does not match the independent journal digest');
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new DeletionVerificationError('manifest must be valid UTF-8 JSON');
  }
  requireValid(manifest !== null && typeof manifest === 'object' && !Array.isArray(manifest)
    && Object.keys(manifest).sort().join(',') === 'deletedAccountIds,journalId,schemaVersion,through',
  'manifest must contain only the four supported fields');
  requireValid(manifest.schemaVersion === 1, 'unsupported manifest schema version');
  requireValid(typeof manifest.journalId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(manifest.journalId),
    'manifest requires an opaque journal ID');
  const through = manifest.through;
  const throughMs = typeof through === 'string' ? Date.parse(through) : NaN;
  requireValid(typeof through === 'string' && UTC_SECOND.test(through) && Number.isFinite(throughMs)
    && new Date(throughMs).toISOString().replace('.000Z', 'Z') === through && throughMs <= now,
  'journal checkpoint must be a valid UTC second at or before now');
  requireValid(typeof expectedThrough === 'string' && through === expectedThrough,
    'journal checkpoint does not match the independently required recovery cutoff');
  requireValid(Array.isArray(manifest.deletedAccountIds) && manifest.deletedAccountIds.length <= MAX_ACCOUNT_IDS
    && manifest.deletedAccountIds.every(id => typeof id === 'string' && UUID.test(id))
    && new Set(manifest.deletedAccountIds).size === manifest.deletedAccountIds.length,
  'manifest must contain at most 10000 distinct canonical account UUIDs');
  return manifest;
}

/** Read-only identity check. It neither replays erasure nor verifies provider/shared-record erasure. */
export async function verifyRestoredDeletions(client, manifest, expectedDatabase) {
  requireValid(typeof expectedDatabase === 'string' && /^[A-Za-z0-9_-]{1,63}$/.test(expectedDatabase),
    'an explicit recovery database name is required');
  let transactionStarted = false;
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    transactionStarted = true;
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '30s'");
    const current = await client.query('SELECT current_database() AS database_name');
    requireValid(current.rows[0]?.database_name === expectedDatabase,
      'connected database does not match the explicit recovery target');
    const result = await client.query('SELECT count(*)::integer AS remaining FROM public.users WHERE id = ANY($1::uuid[])',
      [manifest.deletedAccountIds]);
    const remaining = result.rows[0]?.remaining;
    requireValid(Number.isSafeInteger(remaining) && remaining >= 0, 'database returned an invalid reconciliation count');
    requireValid(remaining === 0, 'restored database still contains accounts listed as erased; keep it isolated and replay erasure');
    await client.query('COMMIT');
    transactionStarted = false;
    return { journalId: manifest.journalId, through: manifest.through, checkedAccounts: manifest.deletedAccountIds.length,
      remainingAccounts: 0 };
  } catch (error) {
    if (transactionStarted) await client.query('ROLLBACK').catch(() => {});
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
    const result = await verifyRestoredDeletions(client, manifest, process.env.RESTORE_EXPECTED_DATABASE);
    console.log(JSON.stringify({ status: 'listed-erased-accounts-absent', ...result }));
  } catch (error) {
    const reason = error instanceof DeletionVerificationError ? error.message : 'manifest or database verification failed';
    console.error(`Restored account verification failed: ${reason}`);
    process.exitCode = 1;
  } finally {
    if (client) await client.end().catch(() => {});
  }
}

// Resolve Windows junctions so direct execution cannot silently skip the CLI.
if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) await main();
