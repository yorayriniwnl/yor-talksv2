import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { closeSync, openSync, realpathSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyDeploymentBoundary } from './verify-deployment-boundary.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { Client } = createRequire(new URL('../lib/db/package.json', import.meta.url))('pg');
const Redis = createRequire(new URL('../api-server/package.json', import.meta.url))('ioredis');

function localUrl(value, protocols) {
  const url = new URL(value);
  assert.ok(protocols.includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname),
    'Artifact smoke requires explicit loopback services');
  return url;
}

/** Starts the compiled entry point against a disposable schema copy and empty
 * isolated Redis database. No provider credentials or application rows are copied.
 */
export async function smokeBackendArtifact(environment = process.env) {
  const adminUrl = localUrl(environment.ARTIFACT_SMOKE_ADMIN_URL, ['postgres:', 'postgresql:']);
  const sourceUrl = localUrl(environment.ARTIFACT_SMOKE_SCHEMA_URL, ['postgres:', 'postgresql:']);
  const redisUrl = localUrl(environment.ARTIFACT_SMOKE_REDIS_URL, ['redis:']);
  assert.match(redisUrl.pathname, /^\/(?:[1-9]|1[0-5])$/, 'Use a dedicated nonzero Redis database');
  const name = `yor_artifact_${randomUUID().replaceAll('-', '')}`, targetUrl = new URL(adminUrl);
  targetUrl.pathname = `/${name}`;
  const directory = await mkdtemp(path.join(tmpdir(), 'yor-artifact-smoke-'));
  const admin = new Client({ connectionString: adminUrl.href });
  const redis = new Redis(redisUrl.href, { lazyConnect: true, connectTimeout: 2000, maxRetriesPerRequest: 1, retryStrategy: () => null });
  redis.on('error', () => {});
  let child, childExit, log, databaseCreated = false, redisReserved = false;
  const postgres = (binary, url, args) => execFileSync(
    path.join(environment.ARTIFACT_SMOKE_PG_BIN ?? '', `${binary}${process.platform === 'win32' ? '.exe' : ''}`), args,
    { windowsHide: true, timeout: 60_000, stdio: 'pipe', env: { ...process.env,
      PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: url.pathname.slice(1),
      PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password) } });
  try {
    await admin.connect(); await redis.connect();
    assert.equal(await redis.dbsize(), 0, 'The dedicated smoke Redis database must be empty');
    redisReserved = true;
    await admin.query(`CREATE DATABASE "${name}"`); databaseCreated = true;
    const schemaFile = path.join(directory, 'schema.dump');
    postgres('pg_dump', sourceUrl, ['--schema-only', '--format=custom', '--no-owner', '--no-privileges', `--file=${schemaFile}`]);
    postgres('pg_restore', targetUrl, ['--dbname', name, '--single-transaction', '--no-owner', '--no-privileges', schemaFile]);
    const source = new Client({ connectionString: sourceUrl.href }), target = new Client({ connectionString: targetUrl.href });
    try {
      await source.connect(); await target.connect();
      // Versions certify the copied schema; no users, sessions or provider jobs
      // cross this boundary. Readiness still verifies required columns/indexes.
      const versions = (await source.query('SELECT version FROM release_schema_versions')).rows.map(row => row.version);
      await target.query('INSERT INTO release_schema_versions(version) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING', [versions]);
    } finally { await Promise.all([source.end(), target.end()]); }
    const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
    const port = socket.address().port; await new Promise((resolve, reject) => socket.close(error => error ? reject(error) : resolve()));
    const baseUrl = `http://127.0.0.1:${port}`, browserOrigin = 'http://localhost:5173';
    const childEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      ['PATH', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'PATHEXT'].includes(key.toUpperCase())));
    Object.assign(childEnvironment, { NODE_ENV: 'test', PORT: String(port), DATABASE_URL: targetUrl.href, REDIS_URL: redisUrl.href,
      JWT_SECRET: randomUUID() + randomUUID(), JWT_REFRESH_SECRET: randomUUID() + randomUUID(),
      CONTACT_SHIELD_SECRET: randomUUID() + randomUUID(), TOTP_ENCRYPTION_KEY: randomUUID() + randomUUID(),
      CLIENT_ORIGIN: browserOrigin, CORS_ORIGINS: browserOrigin,
      MEDIA_FFMPEG_PATH: environment.ARTIFACT_SMOKE_FFMPEG || 'ffmpeg',
      MEDIA_FFPROBE_PATH: environment.ARTIFACT_SMOKE_FFPROBE || 'ffprobe' });
    log = openSync(path.join(directory, 'server.log'), 'wx', 0o600);
    child = spawn(process.execPath, ['api-server/dist/index.cjs'], { cwd: root, env: childEnvironment,
      windowsHide: true, stdio: ['ignore', log, log] });
    childExit = once(child, 'exit');
    child.on('error', () => {});
    const deadline = Date.now() + 30_000;
    while (true) {
      assert.equal(child.exitCode, null, 'Compiled API exited before readiness');
      const ready = await fetch(`${baseUrl}/api/readyz`, { signal: AbortSignal.timeout(1000) }).then(r => r.status === 200).catch(() => false);
      if (ready) break;
      assert.ok(Date.now() < deadline, 'Compiled API failed to become ready');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    const report = await verifyDeploymentBoundary({ baseUrl, browserOrigin });
    assert.equal(report.summary.failed, 0, `Compiled API boundaries failed: ${report.checks.filter(c => c.status === 'failed').map(c => c.name).join(', ')}`);
    return { ...report, scope: 'Compiled backend, synthetic empty stores, NODE_ENV=test; no provider, TLS, frontend or load acceptance.' };
  } finally {
    if (child && child.exitCode === null) child.kill();
    if (childExit) await childExit.catch(() => {});
    if (log !== undefined) closeSync(log);
    if (databaseCreated) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    if (redisReserved) await redis.flushdb();
    redis.disconnect(); await admin.end();
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
    assert.ok(path.basename(resolved).startsWith('yor-artifact-smoke-'));
    await rm(resolved, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(realpathSync(process.argv[1])).href === import.meta.url) {
  try { console.log(JSON.stringify(await smokeBackendArtifact(), null, 2)); }
  catch { console.error('Compiled backend smoke failed. Check explicit isolated service URLs, PostgreSQL client tools, schema and build.'); process.exitCode = 1; }
}
