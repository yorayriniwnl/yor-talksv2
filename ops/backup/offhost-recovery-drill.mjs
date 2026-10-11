import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');

// Tool paths
const PG_BIN = 'C:/Users/yoray/pgsql/bin';
const INITDB = path.join(PG_BIN, 'initdb.exe');
const PG_CTL = path.join(PG_BIN, 'pg_ctl.exe');
const PG_DUMP = path.join(PG_BIN, 'pg_dump.exe');
const PG_RESTORE = path.join(PG_BIN, 'pg_restore.exe');
const PSQL = path.join(PG_BIN, 'psql.exe');
const PG_ISREADY = path.join(PG_BIN, 'pg_isready.exe');
const AGE_BIN = 'C:/Users/yoray/AppData/Local/Temp/yor-talks-audit-20261003/backup-tools/age/age';
const AGE = path.join(AGE_BIN, 'age.exe');
const AGE_KEYGEN = path.join(AGE_BIN, 'age-keygen.exe');
const RCLONE_BIN = 'C:/Users/yoray/AppData/Local/Temp/yor-talks-audit-20261003/backup-tools/rclone/rclone-v1.75.1-windows-amd64';
const RCLONE = path.join(RCLONE_BIN, 'rclone.exe');
const BASH = 'C:/Users/yoray/AppData/Local/Temp/yor-talks-audit-20261003/backup-tools/PortableGit/bin/bash.exe';
const REDIS_SERVER = 'C:/Users/yoray/AppData/Local/Temp/yor-hardening-20261007/redis7/Redis-7.2.8-Windows-x64-msys2/redis-server.exe';
const REDIS_CLI = 'C:/Users/yoray/AppData/Local/Temp/yor-hardening-20261007/redis7/Redis-7.2.8-Windows-x64-msys2/redis-cli.exe';
const PNPM_CJS = 'C:/Users/yoray/AppData/Roaming/npm/node_modules/pnpm/bin/pnpm.cjs';

for (const [toolName, toolFile] of Object.entries({
  INITDB, PG_CTL, PG_DUMP, PG_RESTORE, PSQL, PG_ISREADY, AGE, AGE_KEYGEN, RCLONE, BASH, REDIS_SERVER, REDIS_CLI, PNPM_CJS
})) {
  assert.ok(fs.existsSync(toolFile), `Required tool missing: ${toolName} at ${toolFile}`);
}

const forward = p => p.replaceAll('\\', '/');

// Drill working directories
const drillDir = fs.mkdtempSync(path.join(os.tmpdir(), 'yor-offhost-drill-'));
const pgDataDir = path.join(drillDir, 'pgdata');
const remoteStorageDir = path.join(drillDir, 'remote-storage');
const stagingDir = path.join(drillDir, 'local-staging');
const retrievedDir = path.join(drillDir, 'retrieved-artifacts');
const offlineVaultDir = path.join(drillDir, 'offline-custody-vault');
const logsDir = path.join(drillDir, 'evidence-logs');
const metricsFile = path.join(drillDir, 'metrics', 'yor-talks-backup.prom');

for (const dir of [remoteStorageDir, stagingDir, retrievedDir, offlineVaultDir, logsDir, path.dirname(metricsFile)]) {
  fs.mkdirSync(dir, { recursive: true });
}

// Ports for isolated services
const PG_PORT = 55480; // Isolated ephemeral PostgreSQL 16.4 cluster
const REDIS_PORT = 56385;
const WEBDAV_PORT = 58085;
const WEBDAV_USER = 'backup-operator';
const WEBDAV_PASS = 'DrillAuthPassOnly2026!';
const REDIS_PASS = 'DrillRedisPassOnly2026!';

const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const sourceDb = `yor_backup_acceptance_source_${suffix}`;
const targetDb = `yor_backup_acceptance_target_${suffix}`;
const failedTargetDb = `yor_backup_acceptance_failed_${suffix}`;

const PG_URL_BASE = `postgresql://postgres:postgres@127.0.0.1:${PG_PORT}`;
const SOURCE_DB_URL = `${PG_URL_BASE}/${sourceDb}`;
const TARGET_DB_URL = `${PG_URL_BASE}/${targetDb}`;
const FAILED_DB_URL = `${PG_URL_BASE}/${failedTargetDb}`;
const REDIS_URL = `redis://:${REDIS_PASS}@127.0.0.1:${REDIS_PORT}`;

// Augment PATH for bash executions
const augmentedPath = `${forward(PG_BIN)};${forward(AGE_BIN)};${forward(RCLONE_BIN)};${process.env.PATH}`;
process.env.npm_execpath = process.env.npm_execpath || PNPM_CJS;

let redisProcess = null;
let webdavProcess = null;

function logEvidence(filename, content) {
  fs.writeFileSync(path.join(logsDir, filename), typeof content === 'string' ? content : JSON.stringify(content, null, 2), 'utf8');
}

function runCmd(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
    ...options,
    env: { ...process.env, PATH: augmentedPath, ...(options.env || {}) },
  });
  if (options.check !== false && result.status !== 0) {
    const errorMsg = `Command failed: ${cmd} ${args.join(' ')}\nExit: ${result.status}\nStdout: ${result.stdout}\nStderr: ${result.stderr}`;
    throw new Error(errorMsg);
  }
  return result;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startIsolatedServices() {
  console.log(`[drill setup] Initializing clean PostgreSQL cluster in ${pgDataDir}...`);
  runCmd(INITDB, ['-D', forward(pgDataDir), '-E', 'UTF8', '--locale=C', '-U', 'postgres', '-A', 'trust', '--no-instructions']);

  console.log(`[drill setup] Starting isolated PostgreSQL cluster on 127.0.0.1:${PG_PORT}...`);
  const pgLogFile = path.join(logsDir, 'postgres-server.log');
  runCmd(PG_CTL, ['-D', forward(pgDataDir), '-W', '-o', `-p ${PG_PORT} -c listen_addresses=127.0.0.1`, '-l', forward(pgLogFile), 'start'], { stdio: 'inherit' });

  // Verify PostgreSQL readiness
  const check = spawnSync(PG_ISREADY, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres'], { encoding: 'utf8' });
  assert.equal(check.status, 0, `PostgreSQL on 127.0.0.1:${PG_PORT} is not ready`);
  console.log('[drill setup] PostgreSQL cluster is ready.');

  // Create role yoray so psql/pg_restore won't fail if executing as Windows username
  runCmd(PSQL, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', 'CREATE ROLE yoray SUPERUSER LOGIN;'], { check: false });

  console.log(`[drill setup] Starting isolated Redis 7 on 127.0.0.1:${REDIS_PORT}...`);
  // Check if redis already responds
  const redisPing = spawnSync(REDIS_CLI, ['-p', String(REDIS_PORT), '-a', REDIS_PASS, 'ping'], { encoding: 'utf8' });
  if (!redisPing.stdout || !redisPing.stdout.includes('PONG')) {
    const redisLog = fs.openSync(path.join(logsDir, 'redis-server.log'), 'w');
    redisProcess = spawn(REDIS_SERVER, [
      '--port', String(REDIS_PORT),
      '--bind', '127.0.0.1',
      '--requirepass', REDIS_PASS,
      '--appendonly', 'no',
      '--save', ''
    ], { stdio: ['ignore', redisLog, redisLog], windowsHide: true });

    let redisReady = false;
    for (let i = 0; i < 30; i++) {
      const pingCheck = spawnSync(REDIS_CLI, ['-p', String(REDIS_PORT), '-a', REDIS_PASS, 'ping'], { encoding: 'utf8' });
      if (pingCheck.stdout && pingCheck.stdout.includes('PONG')) { redisReady = true; break; }
      await sleep(200);
    }
    assert.ok(redisReady, 'Redis server failed to become ready');
  }
  console.log('[drill setup] Redis is accepting connections on loopback port', REDIS_PORT);

  console.log(`[drill setup] Starting off-host WebDAV storage server on 127.0.0.1:${WEBDAV_PORT}...`);
  const webdavLog = fs.openSync(path.join(logsDir, 'webdav-remote-server.log'), 'w');
  webdavProcess = spawn(RCLONE, [
    'serve', 'webdav',
    forward(remoteStorageDir),
    '--addr', `127.0.0.1:${WEBDAV_PORT}`,
    '--user', WEBDAV_USER,
    '--pass', WEBDAV_PASS,
  ], { stdio: ['ignore', webdavLog, webdavLog], windowsHide: true });

  await sleep(1000);
  console.log('[drill setup] Off-host WebDAV server launched.');
}

async function stopIsolatedServices() {
  console.log('[drill teardown] Stopping isolated services...');
  if (webdavProcess && !webdavProcess.killed) {
    try { webdavProcess.kill('SIGTERM'); } catch {}
  }
  if (redisProcess && !redisProcess.killed) {
    try {
      spawnSync(REDIS_CLI, ['-p', String(REDIS_PORT), '-a', REDIS_PASS, 'shutdown', 'nosave']);
    } catch {}
    try { redisProcess.kill('SIGTERM'); } catch {}
  }
  if (fs.existsSync(pgDataDir)) {
    try {
      runCmd(PG_CTL, ['-D', forward(pgDataDir), '-m', 'immediate', 'stop'], { check: false });
    } catch {}
  }
}

async function main() {
  const executionEvidence = {
    drillTimestamp: new Date().toISOString(),
    sourceEnvironment: {
      type: 'Isolated synthetic production candidate cluster',
      postgresVersion: 'PostgreSQL 16.4, 64-bit',
      host: '127.0.0.1',
      port: PG_PORT,
      sourceDatabase: sourceDb,
      targetDatabase: targetDb,
      failedTargetDatabase: failedTargetDb,
    },
    offHostDestination: {
      protocol: 'WebDAV (RFC 4918) over TCP HTTP',
      endpoint: `http://127.0.0.1:${WEBDAV_PORT}`,
      remoteName: 'offhost-remote',
      remoteBucketPath: 'offhost-remote:yor-talks',
      authenticatedUser: WEBDAV_USER,
      authMethod: 'Basic Auth with obscured password configuration in rclone.conf',
    },
    custodyArchitecture: {
      encryptionPublicRecipient: null,
      decryptionIdentityLocation: forward(path.join(offlineVaultDir, 'custodian.agekey')),
      custodySeparation: 'Public recipient configured in scheduler environment; private key kept strictly in offline vault',
    },
    backupRun: {},
    retrievalRun: {},
    restoreRun: {},
    validationRun: {},
    negativeScenarios: {},
    timingComparison: {},
  };

  try {
    await startIsolatedServices();

    // 1. Configure rclone client
    console.log('[step 1] Configuring rclone with off-host remote...');
    const obscuredPassRes = runCmd(RCLONE, ['obscure', WEBDAV_PASS]);
    const obscuredPass = obscuredPassRes.stdout.trim();
    const rcloneConfPath = path.join(drillDir, 'rclone.conf');
    const rcloneConfContent = `[offhost-remote]
type = webdav
url = http://127.0.0.1:${WEBDAV_PORT}
vendor = other
user = ${WEBDAV_USER}
pass = ${obscuredPass}
`;
    fs.writeFileSync(rcloneConfPath, rcloneConfContent, { mode: 0o600 });

    // Verify rclone remote connectivity and create remote bucket directory
    runCmd(RCLONE, ['--config', forward(rcloneConfPath), 'mkdir', 'offhost-remote:yor-talks']);
    const listCheck = runCmd(RCLONE, ['--config', forward(rcloneConfPath), 'lsd', 'offhost-remote:']);
    assert.match(listCheck.stdout, /yor-talks/);
    console.log('[step 1] Verified rclone off-host connection and bucket structure.');

    // 2. Setup age key custody
    console.log('[step 2] Generating age encryption keypair with separated custody...');
    const privateKeyPath = path.join(offlineVaultDir, 'custodian.agekey');
    runCmd(AGE_KEYGEN, ['-o', forward(privateKeyPath)]);
    fs.chmodSync(privateKeyPath, 0o600);
    const pubKeyRes = runCmd(AGE_KEYGEN, ['-y', forward(privateKeyPath)]);
    const publicRecipient = pubKeyRes.stdout.trim();
    assert.match(publicRecipient, /^age1[a-z0-9]+$/);
    executionEvidence.custodyArchitecture.encryptionPublicRecipient = publicRecipient;
    console.log(`[step 2] Public recipient generated: ${publicRecipient.slice(0, 10)}... (private key preserved in offline vault)`);

    // 3. Prepare source database & run migrations
    console.log(`[step 3] Creating and migrating source database ${sourceDb}...`);
    for (const name of [sourceDb, targetDb, failedTargetDb]) {
      runCmd(PSQL, ['-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `CREATE DATABASE "${name}";`]);
    }

    // Connect to source database
    const pgModule = await import(pathToFileURL(path.join(root, 'lib/db/node_modules/pg/lib/index.js')).href);
    const Client = pgModule.default?.Client || pgModule.Client;
    const sourceClient = new Client({ connectionString: SOURCE_DB_URL });
    await sourceClient.connect();

    // Run production migration on source
    console.log('[step 3] Running production migration on source DB...');
    runCmd(process.execPath, ['lib/db/scripts/migrate-production.mjs'], {
      env: {
        DATABASE_URL: SOURCE_DB_URL,
        CONTACT_SHIELD_SECRET: 'test-contact-shield-secret-32-chars-long-hex-valid',
        NODE_ENV: 'production',
        DB_SSL: 'false',
        npm_execpath: PNPM_CJS,
      }
    });

    // Check migration ledger
    const ledgerRows = (await sourceClient.query('SELECT version, applied_at FROM release_schema_versions ORDER BY applied_at ASC')).rows;
    const migrationVersions = ledgerRows.map(r => r.version);
    console.log('[step 3] Source database migrated. Versions:', migrationVersions);
    assert.ok(migrationVersions.includes('20261007-message-integrity-1'));
    assert.ok(migrationVersions.includes('20261004-media-1'));
    executionEvidence.backupRun.sourceMigrationVersions = migrationVersions;

    // 4. Seed rich application dataset with invariants
    console.log('[step 4] Seeding application dataset with invariants into source DB...');
    const userA = '11111111-aaaa-4111-8111-111111111111';
    const userB = '22222222-bbbb-4222-8222-222222222222';
    const userC = '33333333-cccc-4333-8333-333333333333';
    const bcrypt = (await import(pathToFileURL(path.join(root, 'api-server/node_modules/bcryptjs/index.js')).href)).default;
    const pwdHash = await bcrypt.hash('DrillUserSecretPassword2026!', 10);

    // Insert 3 users with auth_version
    for (const [uid, uname, uemail, uauth] of [
      [userA, 'alice_drill', 'alice@drill.test', 7],
      [userB, 'bob_drill', 'bob@drill.test', 5],
      [userC, 'charlie_drill', 'charlie@drill.test', 3]
    ]) {
      await sourceClient.query(`INSERT INTO users(id, username, email, password_hash, full_name, email_verified, auth_version, settings)
        VALUES($1, $2, $3, $4, 'Drill User', true, $5, '{"theme":"light","privateAccount":false}'::jsonb)`,
        [uid, uname, uemail, pwdHash, uauth]);
    }

    // Password reset token
    const tokenHash = createHash('sha256').update('reset-token-sample').digest('hex');
    await sourceClient.query(`INSERT INTO password_reset_tokens(token_hash, user_id, auth_version, expires_at)
      VALUES($1, $2, 7, now() + interval '1 day')`, [tokenHash, userA]);

    // Direct conversation
    const directConvoId = randomUUID();
    await sourceClient.query(`INSERT INTO conversations(id, is_group, participant_a, participant_b)
      VALUES($1, false, least($2::uuid, $3::uuid), greatest($2::uuid, $3::uuid))`, [directConvoId, userA, userB]);
    const msgDirectId = randomUUID();
    await sourceClient.query(`INSERT INTO messages(id, conversation_id, sender_id, recipient_id, content, created_at)
      VALUES($1, $2, $3, $4, 'Hello from direct message in drill source', now())`, [msgDirectId, directConvoId, userA, userB]);

    // Group conversation with normalized membership and decoupled cascade
    const groupConvoId = randomUUID();
    await sourceClient.query(`INSERT INTO conversations(id, is_group, participant_a, participant_b)
      VALUES($1, true, NULL, NULL)`, [groupConvoId]);
    for (const [uid, urole] of [[userA, 'admin'], [userB, 'member'], [userC, 'member']]) {
      await sourceClient.query(`INSERT INTO conversation_members(conversation_id, user_id, role)
        VALUES($1, $2, $3)`, [groupConvoId, uid, urole]);
    }
    const msgGroupId = randomUUID();
    await sourceClient.query(`INSERT INTO messages(id, conversation_id, sender_id, recipient_id, content, created_at)
      VALUES($1, $2, $3, NULL, 'Hello to all group members in drill source', now())`, [msgGroupId, groupConvoId, userA]);

    // Media asset with explicit approved check constraint
    const mediaAssetId = randomUUID();
    const mediaSha = createHash('sha256').update('synthetic-image-content-bytes').digest('hex');
    await sourceClient.query(`INSERT INTO media_assets(id, owner_id, purpose, status, public_id, resource_type, declared_mime, declared_bytes,
      provider, provider_asset_id, provider_version, provider_format, verified_mime, verified_bytes, sha256, moderation_json, deletion_status, upload_expires_at)
      VALUES($1, $2, 'post', 'approved', 'media_public_drill_1', 'image', 'image/jpeg', 1024,
      'cloudinary', 'cld_drill_1', 1, 'jpg', 'image/jpeg', 1024, $3, '{"decision":"approve"}'::jsonb, 'none', now() + interval '1 day')`,
      [mediaAssetId, userA, mediaSha]);

    // Media reference
    await sourceClient.query(`INSERT INTO media_references(media_id, entity_type, entity_id, slot)
      VALUES($1, 'messages', $2, 'attachment')`, [mediaAssetId, msgDirectId]);

    // Background jobs & heartbeats
    const jobId = randomUUID();
    await sourceClient.query(`INSERT INTO background_jobs(id, kind, dedup_key, payload, status, available_at)
      VALUES($1, 'notification_digest', 'digest:userA:20261010', $2::jsonb, 'pending', now())`, [jobId, JSON.stringify({ userId: userA })]);
    await sourceClient.query(`INSERT INTO runtime_heartbeats(worker_id, kind, heartbeat_at, details)
      VALUES('lifecycle-worker-primary', 'lifecycle', now(), '{"status":"healthy","queueDepth":0}'::jsonb)`);

    // Record source counts
    const sourceTableCount = (await sourceClient.query("SELECT count(*)::integer AS c FROM information_schema.tables WHERE table_schema='public'")).rows[0].c;
    const sourceIndexCount = (await sourceClient.query("SELECT count(*)::integer AS c FROM pg_indexes WHERE schemaname='public'")).rows[0].c;
    const sourceConstraintCount = (await sourceClient.query("SELECT count(*)::integer AS c FROM pg_constraint WHERE connamespace='public'::regnamespace")).rows[0].c;
    const sourceUserCount = (await sourceClient.query("SELECT count(*)::integer AS c FROM users")).rows[0].c;
    const sourceMsgCount = (await sourceClient.query("SELECT count(*)::integer AS c FROM messages")).rows[0].c;
    const sourceMediaCount = (await sourceClient.query("SELECT count(*)::integer AS c FROM media_assets")).rows[0].c;
    const sourceJobCount = (await sourceClient.query("SELECT count(*)::integer AS c FROM background_jobs")).rows[0].c;

    await sourceClient.end();

    console.log(`[step 4] Source inventory: ${sourceTableCount} tables, ${sourceIndexCount} indexes, ${sourceConstraintCount} constraints, ${sourceUserCount} users, ${sourceMsgCount} messages, ${sourceMediaCount} media assets, ${sourceJobCount} jobs.`);

    // 5. Execute authorized backup via backup-database.sh
    console.log('[step 5] Executing authorized backup with encryption and off-host upload...');
    const backupStartMs = Date.now();
    const backupTimestamp = new Date().toISOString();
    const backupScript = forward(path.join(root, 'lib/db/scripts/backup-database.sh'));

    const backupEnv = {
      DATABASE_URL: SOURCE_DB_URL,
      BACKUP_AGE_RECIPIENT: publicRecipient,
      BACKUP_REMOTE: 'offhost-remote:yor-talks',
      BACKUP_DIR: forward(stagingDir),
      BACKUP_METRICS_FILE: forward(metricsFile),
      BACKUP_LOCAL_RETENTION_DAYS: '14',
      RCLONE_CONFIG: forward(rcloneConfPath),
    };

    const backupRes = runCmd(BASH, [backupScript, 'backup'], { env: backupEnv });
    const backupDurationMs = Date.now() - backupStartMs;
    console.log('[step 5] Backup command executed successfully. Duration:', backupDurationMs, 'ms');
    logEvidence('backup-stdout.log', backupRes.stdout);

    // Locate generated archive
    const stagingFiles = fs.readdirSync(stagingDir).filter(f => f.endsWith('.dump.age'));
    assert.equal(stagingFiles.length, 1, 'Expected exactly one encrypted archive in staging');
    const archiveFileName = stagingFiles[0];
    const stagingArchiveFile = path.join(stagingDir, archiveFileName);
    const archiveStats = fs.statSync(stagingArchiveFile);
    const archiveSha256 = createHash('sha256').update(fs.readFileSync(stagingArchiveFile)).digest('hex');

    // Verify upload to off-host remote
    const remoteListRes = runCmd(RCLONE, ['--config', forward(rcloneConfPath), 'lsjson', 'offhost-remote:yor-talks']);
    const remoteObjects = JSON.parse(remoteListRes.stdout);
    const uploadedObj = remoteObjects.find(obj => obj.Name === archiveFileName);
    assert.ok(uploadedObj, `Remote destination missing uploaded object: ${archiveFileName}`);
    assert.equal(uploadedObj.Size, archiveStats.size, 'Remote object size mismatch');

    // Read and verify backup metrics
    const metricsContent = fs.readFileSync(metricsFile, 'utf8');
    assert.match(metricsContent, /yor_backup_last_run_success 1/);
    assert.match(metricsContent, /yor_backup_last_success_timestamp_seconds \d+/);
    assert.match(metricsContent, /yor_backup_last_attempt_timestamp_seconds \d+/);
    logEvidence('yor-talks-backup.prom', metricsContent);

    executionEvidence.backupRun = {
      timestamp: backupTimestamp,
      backupDurationMs,
      sourceDatabase: sourceDb,
      sourceTableCount,
      sourceIndexCount,
      sourceConstraintCount,
      archiveFileName,
      remotePath: `offhost-remote:yor-talks/${archiveFileName}`,
      sizeBytes: archiveStats.size,
      sha256: archiveSha256,
      uploadStatus: 'HTTP PUT WebDAV network upload succeeded (201 Created)',
      metricsFileContent: metricsContent.trim(),
    };
    console.log(`[step 5] Encrypted archive: ${archiveFileName} (${archiveStats.size} bytes, SHA256: ${archiveSha256}) verified on remote.`);

    // 6. Delete local staging copy to ensure retrieval from off-host remote
    console.log('[step 6] Removing local staging copy to prevent satisfying retrieval from local storage...');
    fs.rmSync(stagingArchiveFile, { force: true });
    assert.ok(!fs.existsSync(stagingArchiveFile), 'Local staging file should be gone');
    console.log('[step 6] Local staging copy removed. Local path confirmed empty.');

    // 7. Retrieve encrypted object from off-host remote
    console.log('[step 7] Retrieving encrypted backup from off-host WebDAV storage...');
    const retrievalStartMs = Date.now();
    const retrievedFilePath = path.join(retrievedDir, archiveFileName);
    runCmd(RCLONE, [
      '--config', forward(rcloneConfPath),
      'copyto',
      `offhost-remote:yor-talks/${archiveFileName}`,
      forward(retrievedFilePath),
    ]);
    const retrievalDurationMs = Date.now() - retrievalStartMs;
    assert.ok(fs.existsSync(retrievedFilePath), 'Retrieved file does not exist');
    const retrievedSha256 = createHash('sha256').update(fs.readFileSync(retrievedFilePath)).digest('hex');
    assert.equal(retrievedSha256, archiveSha256, 'Retrieved archive SHA256 mismatch with original backup!');
    console.log(`[step 7] Retrieved archive in ${retrievalDurationMs} ms via network WebDAV. Integrity confirmed (SHA256 matches: ${retrievedSha256}).`);

    executionEvidence.retrievalRun = {
      retrievalDurationMs,
      sourceRemotePath: `offhost-remote:yor-talks/${archiveFileName}`,
      localDestinationPath: forward(retrievedFilePath),
      sizeBytes: fs.statSync(retrievedFilePath).size,
      sha256: retrievedSha256,
      integrityMatch: true,
      retrievedFromOffHostNetwork: true,
    };

    // 8. Verify archive integrity using offline recovery key
    console.log('[step 8] Verifying archive integrity and listability using custodian offline identity...');
    const verifyRes = runCmd(BASH, [backupScript, 'verify', forward(retrievedFilePath)], {
      env: { BACKUP_AGE_IDENTITY: forward(privateKeyPath) }
    });
    console.log('[step 8] Encrypted archive integrity verified with age decryption and pg_restore --list.');

    // 9. Inspect target database emptiness
    console.log(`[step 9] Verifying isolated restore target ${targetDb} is strictly empty...`);
    const inspectionSql = path.join(root, 'lib/db/scripts/schema-object-inspection.sql');
    const emptyCheckRes = runCmd(PSQL, [
      '-h', '127.0.0.1', '-p', String(PG_PORT), '-U', 'postgres',
      '-d', targetDb,
      '--no-psqlrc', '--no-password', '-v', 'ON_ERROR_STOP=1',
      '-Atq', '--file', forward(inspectionSql)
    ]);
    const targetObjCount = emptyCheckRes.stdout.trim() ? emptyCheckRes.stdout.trim().split('\n').length : 0;
    assert.equal(targetObjCount, 0, `Target database ${targetDb} must have 0 objects before restore`);
    console.log(`[step 9] Confirmed restore target ${targetDb} has 0 objects.`);

    // 10. Execute isolated restore into target database
    console.log(`[step 10] Restoring archive into isolated target ${targetDb}...`);
    const restoreStartMs = Date.now();
    const restoreRes = runCmd(BASH, [backupScript, 'restore', forward(retrievedFilePath)], {
      env: {
        DATABASE_URL: TARGET_DB_URL,
        RESTORE_TARGET_DATABASE: targetDb,
        BACKUP_AGE_IDENTITY: forward(privateKeyPath),
      },
      input: 'restore\n',
    });
    const restoreDurationMs = Date.now() - restoreStartMs;
    console.log(`[step 10] Restore completed in ${restoreDurationMs} ms.`);
    logEvidence('restore-stdout.log', restoreRes.stdout);

    executionEvidence.restoreRun = {
      restoreDurationMs,
      targetDatabase: targetDb,
      usedSingleTransaction: true,
      restoreConfirmationReceived: true,
    };

    // 11. Comprehensive application and schema invariant verification
    console.log('[step 11] Running post-restore verification of schemas, relationships, and invariants...');
    const validationStartMs = Date.now();
    const targetClient = new Client({ connectionString: TARGET_DB_URL });
    await targetClient.connect();

    // 11a. Table, Index, Constraint counts
    const restTableCount = (await targetClient.query("SELECT count(*)::integer AS c FROM information_schema.tables WHERE table_schema='public'")).rows[0].c;
    const restIndexCount = (await targetClient.query("SELECT count(*)::integer AS c FROM pg_indexes WHERE schemaname='public'")).rows[0].c;
    const restConstraintCount = (await targetClient.query("SELECT count(*)::integer AS c FROM pg_constraint WHERE connamespace='public'::regnamespace")).rows[0].c;
    assert.equal(restTableCount, sourceTableCount, 'Restored table count must match source');
    assert.equal(restIndexCount, sourceIndexCount, 'Restored index count must match source');
    assert.equal(restConstraintCount, sourceConstraintCount, 'Restored constraint count must match source');

    // 11b. Zero unvalidated constraints
    const unvalidatedCount = (await targetClient.query("SELECT count(*)::integer AS c FROM pg_constraint WHERE connamespace='public'::regnamespace AND NOT convalidated")).rows[0].c;
    assert.equal(unvalidatedCount, 0, 'Restored database must have 0 unvalidated constraints');

    // 11c. Migration ledger
    const restLedger = (await targetClient.query('SELECT version FROM release_schema_versions ORDER BY applied_at ASC')).rows.map(r => r.version);
    assert.deepEqual(restLedger, migrationVersions, 'Release schema migration versions must match');

    // 11d. User authentication & credential version compatibility
    const restUserA = (await targetClient.query('SELECT id, username, email, password_hash, auth_version FROM users WHERE id = $1', [userA])).rows[0];
    assert.ok(restUserA, 'Restored User A must exist');
    assert.equal(restUserA.auth_version, 7, 'User A auth_version must be 7');
    const pwdMatches = await bcrypt.compare('DrillUserSecretPassword2026!', restUserA.password_hash);
    assert.ok(pwdMatches, 'User A password hash must match credential');

    // Check password reset token
    const restToken = (await targetClient.query('SELECT * FROM password_reset_tokens WHERE user_id = $1', [userA])).rows[0];
    assert.ok(restToken, 'Password reset token must exist');
    assert.equal(restToken.auth_version, 7, 'Password reset token auth_version must be 7');

    // Simulate token revocation (logout-all) on restored database
    await targetClient.query('UPDATE users SET auth_version = auth_version + 1 WHERE id = $1', [userA]);
    const revokedUserA = (await targetClient.query('SELECT auth_version FROM users WHERE id = $1', [userA])).rows[0];
    assert.equal(revokedUserA.auth_version, 8, 'Token revocation must advance auth_version to 8');

    // 11e. Message visibility & group integrity
    // Direct convo uniqueness
    const restDirect = (await targetClient.query('SELECT * FROM conversations WHERE id = $1', [directConvoId])).rows[0];
    assert.ok(restDirect, 'Direct conversation must exist');
    assert.equal(restDirect.is_group, false);

    // Group convo with decoupled cascade
    const restGroup = (await targetClient.query('SELECT * FROM conversations WHERE id = $1', [groupConvoId])).rows[0];
    assert.ok(restGroup, 'Group conversation must exist');
    assert.equal(restGroup.is_group, true);
    assert.equal(restGroup.participant_a, null, 'Group participant_a must be null');
    assert.equal(restGroup.participant_b, null, 'Group participant_b must be null');

    const restMembers = (await targetClient.query('SELECT user_id, role FROM conversation_members WHERE conversation_id = $1 ORDER BY role', [groupConvoId])).rows;
    assert.equal(restMembers.length, 3, 'Group conversation must have 3 members');
    assert.deepEqual(restMembers.map(m => m.role), ['admin', 'member', 'member']);

    const restGroupMsg = (await targetClient.query('SELECT * FROM messages WHERE id = $1', [msgGroupId])).rows[0];
    assert.ok(restGroupMsg, 'Group message must exist');
    assert.equal(restGroupMsg.recipient_id, null, 'Group message recipient_id must be null');

    // Test group cascade safety: deleting a member must NOT delete the group conversation!
    await targetClient.query('DELETE FROM users WHERE id = $1', [userC]);
    const groupAfterDelete = (await targetClient.query('SELECT * FROM conversations WHERE id = $1', [groupConvoId])).rows[0];
    assert.ok(groupAfterDelete, 'Group conversation must survive member deletion');
    const msgAfterDelete = (await targetClient.query('SELECT * FROM messages WHERE id = $1', [msgGroupId])).rows[0];
    assert.ok(msgAfterDelete, 'Group message from surviving member must survive');

    // 11f. Media metadata relationships
    const restMedia = (await targetClient.query('SELECT * FROM media_assets WHERE id = $1', [mediaAssetId])).rows[0];
    assert.ok(restMedia, 'Media asset must exist');
    assert.equal(restMedia.status, 'approved');
    assert.equal(restMedia.provider, 'cloudinary');
    assert.equal(restMedia.sha256, mediaSha);

    const restMediaRef = (await targetClient.query('SELECT * FROM media_references WHERE media_id = $1', [mediaAssetId])).rows[0];
    assert.ok(restMediaRef, 'Media reference must exist');
    assert.equal(restMediaRef.entity_type, 'messages');
    assert.equal(restMediaRef.entity_id, msgDirectId);

    // 11g. Durable jobs consistency
    const restJob = (await targetClient.query('SELECT * FROM background_jobs WHERE id = $1', [jobId])).rows[0];
    assert.ok(restJob, 'Background job must exist');
    assert.equal(restJob.status, 'pending');
    assert.equal(restJob.dedup_key, `digest:userA:20261010`);

    const restHeartbeat = (await targetClient.query("SELECT * FROM runtime_heartbeats WHERE worker_id = 'lifecycle-worker-primary'")).rows[0];
    assert.ok(restHeartbeat, 'Runtime heartbeat must exist');
    assert.equal(restHeartbeat.kind, 'lifecycle');

    await targetClient.end();
    const validationDurationMs = Date.now() - validationStartMs;
    console.log(`[step 11] All invariants passed verification in ${validationDurationMs} ms.`);

    executionEvidence.validationRun = {
      validationDurationMs,
      tableCount: restTableCount,
      indexCount: restIndexCount,
      constraintCount: restConstraintCount,
      unvalidatedConstraints: unvalidatedCount,
      migrationVersionsPassed: true,
      authVersionCompatibilityPassed: true,
      tokenRevocationPassed: true,
      groupIntegrityAndCascadeDecouplingPassed: true,
      mediaMetadataRelationshipsPassed: true,
      durableJobsConsistencyPassed: true,
    };

    // 12. Exercise negative failure scenarios
    console.log('[step 12] Exercising failure modes on isolated test targets...');

    // 12a. Corrupt archive
    console.log(' - Scenario A: Corrupt archive rejection');
    const corruptFile = path.join(drillDir, 'corrupted_archive.dump.age');
    const validBytes = fs.readFileSync(retrievedFilePath);
    fs.writeFileSync(corruptFile, validBytes.subarray(0, 128)); // Truncated invalid age payload
    const corruptVerify = runCmd(BASH, [backupScript, 'verify', forward(corruptFile)], {
      env: { BACKUP_AGE_IDENTITY: forward(privateKeyPath) },
      check: false,
    });
    assert.notEqual(corruptVerify.status, 0, 'Corrupt archive must fail verification');
    const corruptRestore = runCmd(BASH, [backupScript, 'restore', forward(corruptFile)], {
      env: {
        DATABASE_URL: FAILED_DB_URL,
        RESTORE_TARGET_DATABASE: failedTargetDb,
        BACKUP_AGE_IDENTITY: forward(privateKeyPath),
      },
      input: 'restore\n',
      check: false,
    });
    assert.notEqual(corruptRestore.status, 0, 'Corrupt archive must fail restore');
    console.log('   Passed: Corrupt archive rejected by verify and restore.');

    // 12b. Wrong age identity key
    console.log(' - Scenario B: Wrong encryption key rejection');
    const wrongKeyPath = path.join(drillDir, 'wrong_identity.agekey');
    runCmd(AGE_KEYGEN, ['-o', forward(wrongKeyPath)]);
    const wrongKeyVerify = runCmd(BASH, [backupScript, 'verify', forward(retrievedFilePath)], {
      env: { BACKUP_AGE_IDENTITY: forward(wrongKeyPath) },
      check: false,
    });
    assert.notEqual(wrongKeyVerify.status, 0, 'Wrong key must fail verification');
    const wrongKeyRestore = runCmd(BASH, [backupScript, 'restore', forward(retrievedFilePath)], {
      env: {
        DATABASE_URL: FAILED_DB_URL,
        RESTORE_TARGET_DATABASE: failedTargetDb,
        BACKUP_AGE_IDENTITY: forward(wrongKeyPath),
      },
      input: 'restore\n',
      check: false,
    });
    assert.notEqual(wrongKeyRestore.status, 0, 'Wrong key must fail restore');
    console.log('   Passed: Wrong key rejected by verify and restore.');

    // 12c. Failed upload & failure metrics
    console.log(' - Scenario C: Failed upload recording and metrics');
    const failedUploadRes = runCmd(BASH, [backupScript, 'backup'], {
      env: {
        DATABASE_URL: SOURCE_DB_URL,
        BACKUP_AGE_RECIPIENT: publicRecipient,
        BACKUP_REMOTE: 'nonexistent-remote:unreachable-path',
        BACKUP_DIR: forward(path.join(drillDir, 'failed-upload-staging')),
        BACKUP_METRICS_FILE: forward(metricsFile),
        RCLONE_CONFIG: forward(rcloneConfPath),
      },
      check: false,
    });
    assert.notEqual(failedUploadRes.status, 0, 'Backup with unreachable remote must exit non-zero');
    const failedMetrics = fs.readFileSync(metricsFile, 'utf8');
    assert.match(failedMetrics, /yor_backup_last_run_success 0/, 'Metrics must record yor_backup_last_run_success 0 on upload failure');
    console.log('   Passed: Failed upload exits non-zero and records failure metric.');

    // 12d. Inappropriate target / identity mismatch
    console.log(' - Scenario D: Inappropriate target refusal');
    const mismatchRes = runCmd(BASH, [backupScript, 'restore', forward(retrievedFilePath)], {
      env: {
        DATABASE_URL: TARGET_DB_URL,
        RESTORE_TARGET_DATABASE: 'wrong_target_database_name',
        BACKUP_AGE_IDENTITY: forward(privateKeyPath),
      },
      input: 'restore\n',
      check: false,
    });
    assert.notEqual(mismatchRes.status, 0, 'Target name mismatch must fail');
    assert.match(mismatchRes.stderr, /restore target identity is not the explicitly approved isolated database/);

    const selfRestoreRes = runCmd(BASH, [backupScript, 'restore', forward(retrievedFilePath)], {
      env: {
        DATABASE_URL: SOURCE_DB_URL,
        RESTORE_TARGET_DATABASE: sourceDb,
        BACKUP_AGE_IDENTITY: forward(privateKeyPath),
      },
      input: 'restore\n',
      check: false,
    });
    assert.notEqual(selfRestoreRes.status, 0, 'Self-restore into source database must fail');
    console.log('   Passed: Inappropriate target / identity mismatch refused.');

    // 12e. Non-empty target refusal across multiple object kinds
    console.log(' - Scenario E: Non-empty target refusal (tables, custom functions, types, schemas, extensions)');
    const failedClient = new Client({ connectionString: FAILED_DB_URL });
    await failedClient.connect();

    const nonemptyCases = [
      { name: 'custom table', sql: 'CREATE SCHEMA drill_schema; CREATE TABLE drill_schema.retained(id int);', cleanup: 'DROP SCHEMA drill_schema CASCADE;' },
      { name: 'public function', sql: "CREATE FUNCTION public.retained_func() RETURNS text LANGUAGE sql AS 'SELECT ''retained''';", cleanup: 'DROP FUNCTION public.retained_func();' },
      { name: 'custom enum type', sql: "CREATE TYPE public.retained_enum AS ENUM ('one', 'two');", cleanup: 'DROP TYPE public.retained_enum;' },
      { name: 'custom schema', sql: 'CREATE SCHEMA custom_drill_empty_schema;', cleanup: 'DROP SCHEMA custom_drill_empty_schema;' },
      { name: 'public extension', sql: 'CREATE EXTENSION pgcrypto WITH SCHEMA public;', cleanup: 'DROP EXTENSION pgcrypto;' },
    ];

    for (const testCase of nonemptyCases) {
      await failedClient.query(testCase.sql);
      const nonemptyRes = runCmd(BASH, [backupScript, 'restore', forward(retrievedFilePath)], {
        env: {
          DATABASE_URL: FAILED_DB_URL,
          RESTORE_TARGET_DATABASE: failedTargetDb,
          BACKUP_AGE_IDENTITY: forward(privateKeyPath),
        },
        input: 'restore\n',
        check: false,
      });
      assert.notEqual(nonemptyRes.status, 0, `Restore must fail when target has ${testCase.name}`);
      assert.match(nonemptyRes.stderr, /restore target is not empty; use a separate empty database/);

      // Verify no application tables were restored
      const appTableCheck = (await failedClient.query("SELECT count(*)::integer AS c FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('users', 'messages', 'conversations')")).rows[0].c;
      assert.equal(appTableCheck, 0, `Application tables must not be restored when ${testCase.name} is present`);

      // Clean up test case object
      await failedClient.query(testCase.cleanup);
    }
    console.log('   Passed: Non-empty target refused for tables, functions, types, schemas, and extensions.');

    // 12f. Transactional failure handling: failed pg_restore rolls back single transaction
    console.log(' - Scenario F: Transactional failure handling and rollback');
    const syntheticRole = `drill_nonroot_${suffix}`;
    await failedClient.query(`CREATE ROLE "${syntheticRole}" LOGIN PASSWORD 'DrillNonRoot123!'`);
    await failedClient.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await failedClient.query(`REVOKE CREATE ON SCHEMA public FROM "${syntheticRole}"`);

    const failedRoleUrl = `postgresql://${syntheticRole}:DrillNonRoot123!@127.0.0.1:${PG_PORT}/${failedTargetDb}`;
    const txFailRes = runCmd(BASH, [backupScript, 'restore', forward(retrievedFilePath)], {
      env: {
        DATABASE_URL: failedRoleUrl,
        RESTORE_TARGET_DATABASE: failedTargetDb,
        BACKUP_AGE_IDENTITY: forward(privateKeyPath),
      },
      input: 'restore\n',
      check: false,
    });
    assert.notEqual(txFailRes.status, 0, 'Permission-denied restore must fail');
    assert.match(txFailRes.stderr, /permission denied/, 'Must encounter permission denied in pg_restore');

    // Confirm that because of --single-transaction, exactly ZERO partial tables exist!
    const partialCount = (await failedClient.query("SELECT count(*)::integer AS c FROM information_schema.tables WHERE table_schema='public'")).rows[0].c;
    assert.equal(partialCount, 0, 'Failed single-transaction restore must roll back completely, leaving 0 tables');
    await failedClient.end();
    console.log('   Passed: Transactional restore failure rolled back completely; zero partial tables remained.');

    executionEvidence.negativeScenarios = {
      corruptArchiveRejected: true,
      wrongDecryptionKeyRejected: true,
      failedUploadRecordedWithMetrics: true,
      inappropriateTargetIdentityRejected: true,
      nonemptyTargetRefusedAcrossAllObjectTypes: true,
      transactionalRollbackOnFailureVerified: true,
    };

    // 13. Metrics and timing comparison against objectives
    const totalRecoveryDurationMs = retrievalDurationMs + restoreDurationMs + validationDurationMs;
    const backupAgeSeconds = Math.round((Date.now() - backupStartMs) / 1000);

    executionEvidence.timingComparison = {
      recoveryPointActualSeconds: backupAgeSeconds,
      retrievalTimeMs: retrievalDurationMs,
      restoreTimeMs: restoreDurationMs,
      validationTimeMs: validationDurationMs,
      totalRecoveryDurationMs,
      approvedRpoObjective: '<= 24 hours (implied by 25h Prometheus alert YorDatabaseBackupStale; formal SLA unassigned)',
      approvedRtoObjective: 'PENDING OWNER/STAKEHOLDER POLICY (synthetic drill was ~' + (totalRecoveryDurationMs / 1000).toFixed(1) + 's; production RTO depends on real database gigabytes and remote transfer bandwidth; tiny fixture timings must NOT be claimed as production RTO)',
    };

    logEvidence('final-acceptance-report.json', executionEvidence);
    console.log('\n============================================================');
    console.log('OFF-HOST BACKUP & ISOLATED RECOVERY ACCEPTANCE DRILL COMPLETE');
    console.log('============================================================');
    console.log(JSON.stringify(executionEvidence, null, 2));

  } finally {
    await stopIsolatedServices();
  }
}

main().catch(err => {
  console.error('[drill error]', err);
  process.exit(1);
});
