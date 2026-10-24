#!/usr/bin/env node
import { createHash, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { validateDeletionManifest } from './verify-restored-deletions.mjs';

/** Export from the independent source of truth with application writes quiescent. */
export async function exportPrivacyManifest(client, expectedDatabase) {
  if (typeof expectedDatabase !== 'string' || !/^[A-Za-z0-9_-]{1,63}$/.test(expectedDatabase)) throw new Error('An explicit source database is required');
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout='30s'");
    const current = (await client.query(`SELECT current_database() AS name,
      date_trunc('second',transaction_timestamp()) AS cutoff`)).rows[0];
    if (current.name !== expectedDatabase) throw new Error('Source database does not match the expected database');
    const through = current.cutoff.toISOString().replace('.000Z','Z');
    const recent = await client.query(`SELECT
      EXISTS(SELECT 1 FROM deletion_journal WHERE erased_at>$1::timestamptz)
      OR EXISTS(SELECT 1 FROM email_suppressions WHERE suppressed_at>$1::timestamptz) AS pending`,[through]);
    // Never silently omit writes from the checkpoint's fractional second.
    // With writes quiescent, retry after the next UTC second has begun.
    if (recent.rows[0].pending) throw new Error('Privacy events exceed the whole-second checkpoint; retry after quiescence');
    const erasures = (await client.query(`SELECT id,account_id AS "accountId",stable_identity_digest AS "emailHash",erased_at AS "erasedAt"
      FROM deletion_journal WHERE erased_at<=$1::timestamptz ORDER BY erased_at,id LIMIT 10001`,[through])).rows;
    const suppressions = (await client.query(`SELECT email_hash AS "emailHash",purpose,suppressed_at AS "suppressedAt"
      FROM email_suppressions WHERE suppressed_at<=$1::timestamptz ORDER BY email_hash,purpose LIMIT 10001`,[through])).rows;
    const restricted = (await client.query('SELECT id FROM users WHERE processing_restricted=true ORDER BY id LIMIT 10001')).rows;
    const manifest = { schemaVersion:2,journalId:randomUUID(),through,erasures,suppressions,restrictedAccountIds:restricted.map(row=>row.id) };
    const bytes = Buffer.from(JSON.stringify(manifest));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    validateDeletionManifest(bytes,{expectedSha256:sha256,expectedThrough:through});
    await client.query('COMMIT');
    return { bytes,sha256,through,journalId:manifest.journalId };
  } catch (error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
}

async function main() {
  let client;
  try {
    if (process.argv.length !== 3 || !process.env.PRIVACY_JOURNAL_DATABASE_URL) throw new Error('Explicit source and new output file required');
    const require = createRequire(new URL('../../lib/db/package.json',import.meta.url));
    const { Client } = require('pg');
    client = new Client({ connectionString:process.env.PRIVACY_JOURNAL_DATABASE_URL,connectionTimeoutMillis:5000 });
    await client.connect();
    const result = await exportPrivacyManifest(client,process.env.PRIVACY_JOURNAL_EXPECTED_DATABASE);
    await writeFile(process.argv[2],result.bytes,{flag:'wx',mode:0o600});
    console.log(JSON.stringify({status:'privacy-manifest-exported',journalId:result.journalId,through:result.through,sha256:result.sha256}));
  } catch {
    console.error('Privacy manifest export failed; verify the source, schema, manifest limits and new output path.'); process.exitCode=1;
  } finally { if (client) await client.end().catch(()=>{}); }
}
if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) await main();
