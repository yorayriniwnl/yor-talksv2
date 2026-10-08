import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { assertIsolatedPostgres } from '../test-infrastructure-guard.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const require = createRequire(path.join(root, 'lib/db/package.json'));
const { Client } = require('pg');
assert.equal(process.env.NODE_ENV, 'test');
assert.ok(process.env.DATABASE_URL && process.env.REDIS_URL, 'explicit isolated PostgreSQL and Redis required');
const base = assertIsolatedPostgres(process.env);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yor-backup-'));
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const source = `yor_backup_acceptance_source_${suffix}`, target = `yor_backup_acceptance_target_${suffix}`, failedTarget = `yor_backup_acceptance_failed_${suffix}`;
const client = new Client({ connectionString: base.href });
const auxiliaryClients = [];
const docker = process.env.BACKUP_USE_DOCKER === 'true';
const image = process.env.BACKUP_IMAGE || 'yor-talks-ci-release-backup';
const env = { ...process.env, NODE_ENV: 'test', DB_SSL: 'false', LOG_LEVEL: 'silent', BACKUP_DIR: path.join(temp, 'staging'), BACKUP_METRICS_FILE: path.join(temp, 'status.prom'),
  RCLONE_CONFIG: path.join(temp, 'rclone.conf'), BACKUP_REMOTE: `local:${temp.replaceAll('\\', '/')}/remote`, BACKUP_AGE_IDENTITY: path.join(temp, 'identity') };
const urlFor = name => { const url = new URL(base.href); url.pathname = `/${name}`; return url.href; };
const auxiliaryClient = name => {
  const connection = new Client({ connectionString: urlFor(name) });
  auxiliaryClients.push(connection);
  return connection;
};
const forward = value => value.replaceAll('\\', '/');
function execute(executable, args, environment = env, success = true, input) {
  let command = executable, commandArgs = args;
  if (docker && executable !== process.execPath) {
    // Bind-mounted private files must belong to the host runner, not root.
    // Keep the backup's restrictive modes; Linux Docker can use numeric IDs.
    const user = process.platform === 'linux' ? ['--user', `${process.getuid()}:${process.getgid()}`] : [];
    command = 'docker'; commandArgs = ['run', '--rm', ...user, ...(input === undefined ? [] : ['-i']), '--network', 'host', '-v', `${temp}:${temp}`, '--entrypoint', executable];
    for (const key of ['DATABASE_URL', 'BACKUP_DIR', 'BACKUP_METRICS_FILE', 'BACKUP_REMOTE', 'BACKUP_AGE_IDENTITY', 'BACKUP_AGE_RECIPIENT', 'RCLONE_CONFIG', 'RESTORE_TARGET_DATABASE']) {
      if (environment[key]) commandArgs.push('-e', `${key}=${environment[key]}`);
    }
    commandArgs.push(image, ...args);
  }
  const result = spawnSync(command, commandArgs, { cwd: root, env: environment, input, encoding: 'utf8', windowsHide: true, timeout: 60000 });
  fs.writeFileSync(path.join(temp, `command-${execute.sequence++}.log`), `${result.stdout || ''}${result.stderr || ''}`, { mode: 0o600 });
  execute.lastOutput = `${result.stdout || ''}${result.stderr || ''}`;
  assert.equal(Boolean(result.error), false, `${path.basename(executable)} unavailable or timed out`);
  assert.equal(result.status === 0, success, `${path.basename(executable)} expected ${success ? 'success' : 'rejection'}; exit ${result.status}`);
  return result.stdout;
}
execute.sequence = 0;
const script = docker ? '/usr/local/bin/backup-database.sh' : path.join(root, 'lib/db/scripts/backup-database.sh');
const bash = docker ? '/bin/bash' : (process.env.BASH_BIN || 'bash');
const backup = (action, file, changes = {}, success = true) => execute(bash, [script, action, ...(file ? [file] : [])], { ...env, ...changes }, success, action === 'restore' ? 'restore\n' : undefined);
try {
  await client.connect();
  const identity = (await client.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
  assertIsolatedPostgres(process.env, identity);
  for (const name of [source, target, failedTarget]) await client.query(`CREATE DATABASE "${name}"`);
  env.DATABASE_URL = urlFor(source);
  execute(process.execPath, ['lib/db/scripts/migrate-production.mjs']);
  const loader = path.join(root, 'api-server/node_modules/tsx/dist/loader.mjs');
  execute(process.execPath, ['--import', pathToFileURL(loader).href, 'api-server/src/scripts/backup-fixture.ts', 'seed']);
  fs.writeFileSync(env.RCLONE_CONFIG, '[local]\ntype = local\n', { mode: 0o600 });
  execute('age-keygen', ['-o', forward(env.BACKUP_AGE_IDENTITY)]);
  env.BACKUP_AGE_RECIPIENT = execute('age-keygen', ['-y', forward(env.BACKUP_AGE_IDENTITY)]).trim();
  backup('backup');
  const archive = fs.readdirSync(env.BACKUP_DIR).find(name => name.endsWith('.dump.age')); assert.ok(archive);
  const uploaded = path.join(temp, 'remote', archive), retrieved = path.join(temp, 'retrieved.dump.age');
  assert.ok(fs.existsSync(uploaded));
  execute('rclone', ['copyto', `${env.BACKUP_REMOTE}/${archive}`, forward(retrieved)]);
  assert.equal(createHash('sha256').update(fs.readFileSync(retrieved)).digest('hex'), createHash('sha256').update(fs.readFileSync(uploaded)).digest('hex'));
  backup('verify', retrieved);
  assert.match(fs.readFileSync(env.BACKUP_METRICS_FILE, 'utf8'), /yor_backup_last_run_success 1/);
  const corrupt = path.join(temp, 'corrupt.dump.age'); fs.writeFileSync(corrupt, fs.readFileSync(retrieved).subarray(0, 64)); backup('verify', corrupt, {}, false);
  const wrongIdentity = path.join(temp, 'wrong-identity'); execute('age-keygen', ['-o', forward(wrongIdentity)]); backup('verify', retrieved, { BACKUP_AGE_IDENTITY: wrongIdentity }, false);
  backup('restore', corrupt, { DATABASE_URL: urlFor(target), RESTORE_TARGET_DATABASE: target }, false);
  backup('restore', retrieved, { DATABASE_URL: urlFor(target), RESTORE_TARGET_DATABASE: target, BACKUP_AGE_IDENTITY: wrongIdentity }, false);
  backup('backup', undefined, { BACKUP_REMOTE: 'missing-remote:failure' }, false);
  assert.match(fs.readFileSync(env.BACKUP_METRICS_FILE, 'utf8'), /yor_backup_last_run_success 0/);
  backup('restore', retrieved, { DATABASE_URL: urlFor(target), RESTORE_TARGET_DATABASE: 'wrong_database' }, false);
  backup('restore', retrieved, { DATABASE_URL: urlFor(source), RESTORE_TARGET_DATABASE: source }, false);
  const nonempty = auxiliaryClient(failedTarget); await nonempty.connect();
  await nonempty.query('CREATE SCHEMA drill_extra; CREATE TABLE drill_extra.retained(id integer)');
  backup('restore', retrieved, { DATABASE_URL: urlFor(failedTarget), RESTORE_TARGET_DATABASE: failedTarget }, false);
  assert.match(execute.lastOutput,/restore target is not empty/);
  await nonempty.query('DROP TABLE drill_extra.retained; DROP SCHEMA drill_extra');
  const nonemptyCases=[
    {create:"CREATE FUNCTION public.retained_function() RETURNS text LANGUAGE sql AS 'SELECT ''preserved''::text'",drop:'DROP FUNCTION public.retained_function()',verify:'SELECT public.retained_function() value',value:'preserved'},
    {create:"CREATE TYPE public.retained_type AS ENUM ('preserved')",drop:'DROP TYPE public.retained_type',verify:"SELECT 'preserved'::public.retained_type value",value:'preserved'},
    {create:'CREATE SCHEMA drill_extra',drop:'DROP SCHEMA drill_extra',verify:"SELECT nspname value FROM pg_namespace WHERE nspname='drill_extra'",value:'drill_extra'},
    {create:'CREATE EXTENSION pgcrypto WITH SCHEMA public',drop:'DROP EXTENSION pgcrypto',verify:"SELECT extname value FROM pg_extension WHERE extname='pgcrypto'",value:'pgcrypto'},
    {create:"CREATE FUNCTION pg_catalog.retained_function() RETURNS text LANGUAGE sql AS 'SELECT ''preserved''::text'",drop:'DROP FUNCTION pg_catalog.retained_function()',verify:'SELECT pg_catalog.retained_function() value',value:'preserved'},
  ];
  for(const scenario of nonemptyCases){
    await nonempty.query(scenario.create);
    backup('restore',retrieved,{DATABASE_URL:urlFor(failedTarget),RESTORE_TARGET_DATABASE:failedTarget},false);
    assert.match(execute.lastOutput,/restore target is not empty/,'custom objects must be refused before decryption or pg_restore');
    assert.equal((await nonempty.query(scenario.verify)).rows[0].value,scenario.value,'the original object must survive refusal');
    assert.equal((await nonempty.query("SELECT count(*)::integer count FROM information_schema.tables WHERE table_schema='public'")).rows[0].count,0,'no application rows were restored');
    await nonempty.query(scenario.drop);
  }
  await nonempty.end();
  const restoreStarted = Date.now();
  backup('restore', retrieved, { DATABASE_URL: urlFor(target), RESTORE_TARGET_DATABASE: target });
  const restoreMilliseconds = Date.now() - restoreStarted;
  execute(process.execPath, ['--import', pathToFileURL(loader).href, 'api-server/src/scripts/backup-fixture.ts', 'verify'], { ...env, DATABASE_URL: urlFor(target) });
  backup('restore', retrieved, { DATABASE_URL: urlFor(target), RESTORE_TARGET_DATABASE: target }, false);
  // Revoking target CREATE privilege forces pg_restore to fail within its single
  // transaction; use a non-superuser and confirm no partial application rows.
  const role = `backup_restore_${suffix}`;
  await client.query(`CREATE ROLE "${role}" LOGIN PASSWORD 'SyntheticRestoreFailureOnly123!'`);
  const failedClient = auxiliaryClient(failedTarget); await failedClient.connect();
  await failedClient.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC'); await failedClient.end();
  const failedUrl = new URL(urlFor(failedTarget)); failedUrl.username = role; failedUrl.password = 'SyntheticRestoreFailureOnly123!';
  backup('restore', retrieved, { DATABASE_URL: failedUrl.href, RESTORE_TARGET_DATABASE: failedTarget }, false);
  assert.match(execute.lastOutput, /pg_restore:[\s\S]*permission denied/, 'failure must reach pg_restore rather than fail an earlier guard');
  const check = auxiliaryClient(failedTarget); await check.connect();
  assert.equal((await check.query("SELECT count(*)::integer AS count FROM information_schema.tables WHERE table_schema='public'")).rows[0].count, 0); await check.end();
  console.log(JSON.stringify({ encryptedUploadRetrieval: 'passed using isolated local rclone transport', corruption: 'rejected', wrongKey: 'rejected', failedUpload: 'recorded', wrongTarget: 'rejected', nonemptyTarget: 'rejected including user functions in public/system schemas, type-only, empty custom schema and public extension', failedRestore: 'rolled back', restoredApplication: 'passed', restoreMilliseconds, container: docker, productionOffHostAcceptance: 'not exercised', evidenceDirectory: temp, retainedSyntheticDatabases:[source,target,failedTarget],retainedSyntheticRole:role }));
} finally {
  const closed = await Promise.allSettled([...auxiliaryClients, client].map(connection => connection.end()));
  if (closed.some(result => result.status === 'rejected')) throw new Error('Backup drill database connection cleanup failed');
}
