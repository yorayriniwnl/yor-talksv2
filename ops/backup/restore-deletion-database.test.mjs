import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { verifyRestoredDeletions } from './verify-restored-deletions.mjs';

const run = promisify(execFile);

test('isolated PostgreSQL and the actual CLI refuse a historical erased account until identity reconciliation', async () => {
  const adminUrl = new URL(process.env.RESTORE_VERIFICATION_TEST_ADMIN_URL ?? 'invalid:');
  assert.ok(['postgres:', 'postgresql:'].includes(adminUrl.protocol)
    && ['127.0.0.1', 'localhost', '[::1]'].includes(adminUrl.hostname) && adminUrl.pathname === '/postgres',
  'set RESTORE_VERIFICATION_TEST_ADMIN_URL to an explicit loopback disposable PostgreSQL admin URL');
  const requireDb = createRequire(new URL('../../lib/db/package.json', import.meta.url));
  const { Client } = requireDb('pg');
  const admin = new Client({ connectionString: adminUrl.href, connectionTimeoutMillis: 5000 });
  const database = `yor_restore_verifier_${randomUUID().replaceAll('-', '')}`;
  const targetUrl = new URL(adminUrl);
  targetUrl.pathname = `/${database}`;
  const target = new Client({ connectionString: targetUrl.href, connectionTimeoutMillis: 5000 });
  const directory = await mkdtemp(join(tmpdir(), 'yor-restore-verifier-'));
  let databaseCreated = false;
  try {
    await admin.connect();
    await admin.query(`CREATE DATABASE "${database}"`);
    databaseCreated = true;
    await target.connect();
    await target.query('CREATE TABLE public.users(id uuid PRIMARY KEY, marker text NOT NULL)');
    const erasedId = randomUUID();
    const survivingId = randomUUID();
    await target.query("INSERT INTO public.users VALUES ($1, 'historical-erased-identity'),($2, 'retained-identity')", [erasedId, survivingId]);
    const through = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString().replace('.000Z', 'Z');
    const manifest = { schemaVersion: 1, journalId: 'isolated-database-proof', through, deletedAccountIds: [erasedId] };
    const bytes = Buffer.from(JSON.stringify(manifest));
    const manifestFile = join(directory, 'independent-journal.json');
    await writeFile(manifestFile, bytes, { mode: 0o600 });
    const cliEnv = { ...process.env, RESTORE_DATABASE_URL: targetUrl.href, RESTORE_EXPECTED_DATABASE: database,
      RESTORE_DELETION_MANIFEST_SHA256: createHash('sha256').update(bytes).digest('hex'),
      RESTORE_DELETION_JOURNAL_THROUGH: through };
    const cliFile = fileURLToPath(new URL('./verify-restored-deletions.mjs', import.meta.url));
    await assert.rejects(run(process.execPath, [cliFile, manifestFile], { env: cliEnv }), error => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /still contains accounts listed as erased/);
      assert.doesNotMatch(error.stderr, new RegExp(erasedId));
      assert.ok(!error.stderr.includes(targetUrl.href));
      return true;
    });
    assert.equal((await target.query('SELECT count(*)::integer AS count FROM public.users')).rows[0].count, 2);
    await assert.rejects(verifyRestoredDeletions(target, manifest, 'wrong_recovery_target'), /recovery target/);

    // Probe the same real transaction to prove the checker is unable to write.
    const readOnlyProbe = { async query(sql, parameters) {
      if (sql.startsWith('SELECT count')) {
        await assert.rejects(target.query("DELETE FROM public.users WHERE marker='retained-identity'"), { code: '25006' });
        throw new Error('expected read-only transaction probe');
      }
      return target.query(sql, parameters);
    } };
    await assert.rejects(verifyRestoredDeletions(readOnlyProbe, manifest, database), /read-only transaction probe/);
    assert.equal((await target.query('SHOW transaction_read_only')).rows[0].transaction_read_only, 'off');
    assert.equal((await target.query('SELECT count(*)::integer AS count FROM public.users')).rows[0].count, 2);

    // Only this synthetic fixture is reconciled. No production erasure service is invoked.
    await target.query('DELETE FROM public.users WHERE id=$1', [erasedId]);
    const success = await run(process.execPath, [cliFile, manifestFile], { env: cliEnv });
    assert.deepEqual(JSON.parse(success.stdout), { status: 'listed-erased-accounts-absent', journalId: manifest.journalId,
      through, checkedAccounts: 1, remainingAccounts: 0 });
    assert.deepEqual((await target.query('SELECT id,marker FROM public.users')).rows,
      [{ id: survivingId, marker: 'retained-identity' }]);
    await assert.rejects(run(process.execPath, [cliFile, manifestFile], {
      env: { ...cliEnv, RESTORE_DELETION_JOURNAL_THROUGH: '2000-01-01T00:00:00Z' },
    }), error => error.code === 1 && /recovery cutoff/.test(error.stderr));
  } finally {
    await target.end().catch(() => {});
    if (databaseCreated) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    await admin.end().catch(() => {});
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith('yor-restore-verifier-'));
    await rm(directory, { recursive: true, force: true });
  }
});
