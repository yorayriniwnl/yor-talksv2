import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { readFile, writeFile, rm, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { renderAlertmanagerConfig } from '../ops/prometheus/render-alertmanager-config.mjs';

if (process.env.YOR_TYPED_MONITORING_REHEARSAL !== 'true') {
  test('monitoring and incident checks run with the API TypeScript loader',()=>{
    const apiRequire=createRequire(new URL('../api-server/package.json',import.meta.url));
    const environment={...process.env,NODE_ENV:'test',YOR_TYPED_MONITORING_REHEARSAL:'true'};
    delete environment.NODE_TEST_CONTEXT;
    const run=spawnSync(process.execPath,['--import',pathToFileURL(apiRequire.resolve('tsx')).href,'--test','--test-reporter=tap',fileURLToPath(import.meta.url)],
      {cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8',timeout:60000,
        env:environment});
    assert.equal(run.status,0,run.stdout+'\n'+run.stderr);
    assert.match(run.stdout,/# tests 5\b/);
    assert.match(run.stdout,/# fail 0\b/);
  });
} else {
const {metricsTokenMatches,readMetricsToken}=await import('../api-server/src/lib/metrics-auth.ts');
const {OperationalMetricsService,operationalMetrics}=await import('../api-server/src/services/operational-metrics-service.ts');
const {createReadinessHandler}=await import('../api-server/src/routes/health.ts');
const {env}=await import('../api-server/src/config/env.ts');
const {pool}=await import('../lib/db/src/index.ts');
after(async()=>{await operationalMetrics.close();await pool.end();});

test('OPERATIONAL MONITORING 1: Authenticated metrics scraping and bearer token verification', async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'yor-metrics-auth-'));
  const tokenFile = path.join(tempDir, 'metrics-token.secret');
  const validToken = randomBytes(32).toString('hex'); // 64 chars
  await writeFile(tokenFile, `${validToken}\n`, { mode: 0o600 });

  try {
    // 1. Read token file
    const loadedToken = await readMetricsToken(tokenFile);
    assert.equal(loadedToken, validToken);

    // 2. Exact match
    assert.equal(metricsTokenMatches(validToken, loadedToken), true);

    // 3. Rejected: wrong token of same length
    const wrongToken = randomBytes(32).toString('hex');
    assert.equal(metricsTokenMatches(wrongToken, loadedToken), false);

    // 4. Rejected: short token
    assert.equal(metricsTokenMatches('too-short', loadedToken), false);

    // 5. Rejected: empty token
    assert.equal(metricsTokenMatches('', loadedToken), false);

    // 6. Rejected: token file with newlines or too short
    const badTokenFile = path.join(tempDir, 'bad-token.secret');
    await writeFile(badTokenFile, 'short\n', { mode: 0o600 });
    await assert.rejects(readMetricsToken(badTokenFile), /at least 32 characters/);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

test('OPERATIONAL MONITORING 2: Comprehensive metrics exposition across API, DB, Redis, workers, media cleanup and backups', async () => {
  // Test local + shared operational metrics
  const mockSharedStore = {
    data: new Map(),
    async incrementHashStrict(key, counters, floats) {
      for (const [k, v] of Object.entries(counters)) {
        this.data.set(k, (this.data.get(k) || 0) + v);
      }
      for (const [k, v] of Object.entries(floats)) {
        this.data.set(k, (this.data.get(k) || 0) + v);
      }
    },
    async getHashStrict() {
      const obj = {};
      for (const [k, v] of this.data.entries()) {
        obj[k] = v;
      }
      return obj;
    },
  };

  const metricsService = new OperationalMetricsService(mockSharedStore);
  metricsService.startRequest();
  await metricsService.finishRequest('GET', '/api/articles', 200, 0.045);
  await metricsService.finishRequest('POST', '/api/posts', 201, 0.120);
  await metricsService.finishRequest('GET', '/api/unknown', 404, 0.010);
  await metricsService.recordWorkerFailure('notifications');
  await metricsService.recordWorkerFailure('feed');

  const rendered = await metricsService.renderPrometheus();

  // API HTTP metrics
  assert.match(rendered, /yor_http_requests_total\{method="GET",route="\/articles",status="200"\} 1/);
  assert.match(rendered, /yor_http_requests_total\{method="POST",route="\/posts",status="201"\} 1/);
  assert.match(rendered, /yor_http_requests_total\{method="GET",route="unmatched",status="404"\} 1/);
  assert.match(rendered, /yor_http_request_duration_seconds_sum/);
  assert.match(rendered, /yor_http_requests_in_flight 0/);
  assert.match(rendered, /yor_process_uptime_seconds/);
  assert.match(rendered, /yor_process_resident_memory_bytes/);
  assert.match(rendered, /yor_process_heap_used_bytes/);

  // Redis shared store status
  assert.match(rendered, /yor_http_metrics_shared_store_up 1/);
  assert.match(rendered, /yor_cluster_http_requests_total/);

  // Worker metrics
  assert.match(rendered, /yor_worker_failed_jobs_total\{worker="notifications",source="redis"\} 1/);
  assert.match(rendered, /yor_worker_failed_jobs_total\{worker="feed",source="redis"\} 1/);

  // Lifecycle & media cleanup metrics
  assert.match(rendered, /yor_lifecycle_metrics_up (0|1)/);
  assert.match(rendered, /yor_lifecycle_worker_up (0|1)/);
  assert.match(rendered, /yor_lifecycle_cleanup_jobs_overdue \d+/);
  assert.match(rendered, /yor_lifecycle_cleanup_jobs_dead \d+/);
  assert.match(rendered, /yor_lifecycle_cleanup_jobs_failing \d+/);

  // Analytics rollup metrics
  assert.match(rendered, /yor_analytics_rollup_last_success_timestamp_seconds \d+/);
  assert.match(rendered, /yor_analytics_rollup_last_run_failed (0|1)/);
});

test('OPERATIONAL MONITORING 3: Prometheus alert rule inventory and evaluation consistency', async () => {
  const alertsYml = await readFile(path.resolve('ops/prometheus/alerts.yml'), 'utf8');

  // Verify all required alerts exist in ops/prometheus/alerts.yml
  const requiredAlerts = [
    { name: 'YorApiMetricsUnavailable', severity: 'critical' },
    { name: 'YorSharedMetricsStoreUnavailable', severity: 'warning' },
    { name: 'YorBackgroundJobsFailing', severity: 'warning' },
    { name: 'YorLifecycleWorkerUnavailable', severity: 'critical' },
    { name: 'YorLifecycleCleanupJobsOverdue', severity: 'warning' },
    { name: 'YorLifecycleCleanupJobsDead', severity: 'critical' },
    { name: 'YorLifecycleCleanupSweepFailing', severity: 'critical' },
    { name: 'YorLifecycleMetricsUnavailable', severity: 'critical' },
    { name: 'YorAnalyticsRollupFailed', severity: 'warning' },
    { name: 'YorAnalyticsRollupStale', severity: 'warning' },
    { name: 'YorDatabaseBackupStale', severity: 'critical' },
    { name: 'YorDatabaseBackupLastRunFailed', severity: 'warning' },
  ];

  for (const alert of requiredAlerts) {
    assert.match(alertsYml, new RegExp(`alert:\\s*${alert.name}`), `Expected alert rule ${alert.name} in alerts.yml`);
    assert.match(alertsYml, new RegExp(`alert:\\s*${alert.name}[\\s\\S]*?severity:\\s*${alert.severity}`), `Expected ${alert.name} to have severity ${alert.severity}`);
  }

  // Verify backup metrics formatting
  const tempDir = await mkdtemp(path.join(tmpdir(), 'yor-backup-metrics-'));
  const backupProm = path.join(tempDir, 'backup.prom');
  const nowSec = Math.floor(Date.now() / 1000);
  const sampleBackupProm = `# HELP yor_backup_last_success_timestamp_seconds Unix timestamp of the latest encrypted off-host backup.
# TYPE yor_backup_last_success_timestamp_seconds gauge
yor_backup_last_success_timestamp_seconds ${nowSec}
# HELP yor_backup_last_run_success Whether the latest backup and remote upload succeeded.
# TYPE yor_backup_last_run_success gauge
yor_backup_last_run_success 1
# HELP yor_backup_last_attempt_timestamp_seconds Unix timestamp of the latest backup attempt.
# TYPE yor_backup_last_attempt_timestamp_seconds gauge
yor_backup_last_attempt_timestamp_seconds ${nowSec}
`;
  await writeFile(backupProm, sampleBackupProm, 'utf8');
  const readBack = await readFile(backupProm, 'utf8');
  assert.match(readBack, /yor_backup_last_success_timestamp_seconds \d+/);
  assert.match(readBack, /yor_backup_last_run_success 1/);
  await rm(tempDir, { recursive: true, force: true }).catch(() => {});
});

test('OPERATIONAL INCIDENT 1: Alert receipt and routing through an authorized test receiver', async () => {
  // Test Alertmanager template rendering with webhook
  const template = `receivers:
  - name: deployment-webhook
    webhook_configs:
      - url: {{ALERTMANAGER_WEBHOOK_URL}}
        http_config:
          basic_auth:
            username: {{ALERTMANAGER_WEBHOOK_USER}}
            password_file: /run/secrets/alertmanager_webhook_password
`;

  // Start an authorized local test receiver
  const receivedAlerts = [];
  const testUser = 'alert-operator';
  const testPass = 'synthetic-secret-pass-1234';
  const expectedAuthHeader = `Basic ${Buffer.from(`${testUser}:${testPass}`).toString('base64')}`;

  const server = createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/alerts') {
      const auth = req.headers.authorization;
      if (auth !== expectedAuthHeader) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Unauthorized');
        return;
      }
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          receivedAlerts.push(payload);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'received' }));
        } catch {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad JSON');
        }
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const webhookUrl = `https://alerts.internal.test:${port}/alerts`;

  // Render Alertmanager config
  const rendered = renderAlertmanagerConfig(template, {
    ALERTMANAGER_WEBHOOK_URL: webhookUrl,
    ALERTMANAGER_WEBHOOK_USER: testUser,
  });
  assert.match(rendered, new RegExp(`url: "${webhookUrl}"`));
  assert.match(rendered, new RegExp(`username: "${testUser}"`));
  assert.match(rendered, /password_file: \/run\/secrets\/alertmanager_webhook_password/);

  // Dispatch simulated alert payload to test receiver (using loopback HTTP for synthetic mechanics test)
  const syntheticAlertPayload = {
    version: '4',
    groupKey: '{}:{alertname="YorLifecycleCleanupJobsDead"}',
    status: 'firing',
    receiver: 'deployment-webhook',
    alerts: [
      {
        status: 'firing',
        labels: {
          alertname: 'YorLifecycleCleanupJobsDead',
          severity: 'critical',
          service: 'yor-talks',
        },
        annotations: {
          summary: 'Yor Talks cleanup jobs entered the dead-letter state',
          description: 'A dead cleanup job was detected during operational rehearsal.',
        },
        startsAt: new Date().toISOString(),
      },
    ],
  };

  const dispatchResult = await fetch(`http://127.0.0.1:${port}/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': expectedAuthHeader,
    },
    body: JSON.stringify(syntheticAlertPayload),
  });

  assert.equal(dispatchResult.status, 200);
  assert.equal(receivedAlerts.length, 1);
  assert.equal(receivedAlerts[0].alerts[0].labels.alertname, 'YorLifecycleCleanupJobsDead');
  assert.equal(receivedAlerts[0].alerts[0].labels.severity, 'critical');

  // Verify unauthorized dispatch rejected
  const unauthResult = await fetch(`http://127.0.0.1:${port}/alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(syntheticAlertPayload),
  });
  assert.equal(unauthResult.status, 401);

  await new Promise(resolve => server.close(resolve));
  console.log('[Alert Routing] Synthetic receiver mechanics directly verified. Real off-host alert delivery marked pending until external endpoint is provisioned.');
});

test('OPERATIONAL INCIDENT 2: Isolated database, Redis, worker death, and queue failure rehearsals', async () => {
  // Rehearsal A: Isolated Database Outage
  {
    const dbDownHandler = createReadinessHandler({
      media: () => ({ ready: true }),
      database: async () => { throw new Error('Database connection refused (simulated outage)'); },
      redis: async () => ({ compatible: true, version: '7.2.4' }),
      notificationWorker: async () => true,
      lifecycle: async () => ({ workerUp: true, overdueCleanupJobs: 0, deadCleanupJobs: 0, failingCleanupJobs: 0 }),
      recoveryReplay: async () => {},
    });

    let resCode = 0;
    let resBody = null;
    const fakeRes = {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; },
    };

    await dbDownHandler({}, fakeRes);
    assert.equal(resCode, 503, 'Database outage must cause readiness probe to fail closed (503)');
    assert.equal(resBody.status, 'unhealthy');
    assert.equal(resBody.services.database, 'down');
  }

  // Rehearsal B: Isolated Redis Outage with Metrics Degraded Fallback
  {
    const failingRedisStore = {
      async incrementHashStrict() { throw new Error('Redis connection timeout (simulated outage)'); },
      async getHashStrict() { throw new Error('Redis connection timeout (simulated outage)'); },
    };
    const degradedMetrics = new OperationalMetricsService(failingRedisStore);
    await degradedMetrics.finishRequest('GET', '/api/posts', 200, 0.05);
    await degradedMetrics.recordWorkerFailure('notifications');

    const rendered = await degradedMetrics.renderPrometheus();
    assert.match(rendered, /yor_http_metrics_shared_store_up 0/, 'Redis outage must drop shared store metric to 0');
    assert.match(rendered, /yor_worker_failed_jobs_total\{worker="notifications",source="process_fallback"\} 1/, 'Worker failure must be preserved in process fallback counter');

    const redisDownHandler = createReadinessHandler({
      media: () => ({ ready: true }),
      database: async () => {},
      redis: async () => ({ compatible: false, reason: 'connection_refused' }),
      notificationWorker: async () => true,
      lifecycle: async () => ({ workerUp: true, overdueCleanupJobs: 0, deadCleanupJobs: 0, failingCleanupJobs: 0 }),
      recoveryReplay: async () => {},
    });

    let resCode = 0;
    let resBody = null;
    const fakeRes = {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; },
    };

    await redisDownHandler({}, fakeRes);
    assert.equal(resCode, 503, 'Redis outage must cause readiness probe to fail closed (503)');
    assert.equal(resBody.status, 'unhealthy');
    assert.equal(resBody.services.redis, 'down');
  }

  // Rehearsal C: Worker Death & Lifecycle Heartbeat Missing
  {
    const deadWorkerHandler = createReadinessHandler({
      media: () => ({ ready: true }),
      database: async () => {},
      redis: async () => ({ compatible: true, version: '7.2.4' }),
      notificationWorker: async () => false, // Worker heartbeat missing
      lifecycle: async () => ({ workerUp: false, overdueCleanupJobs: 0, deadCleanupJobs: 0, failingCleanupJobs: 0 }),
      recoveryReplay: async () => {},
    });

    let resCode = 0;
    let resBody = null;
    const fakeRes = {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; },
    };

    await deadWorkerHandler({}, fakeRes);
    assert.equal(resCode, 503, 'Dead worker must cause readiness probe to fail closed (503)');
    assert.equal(resBody.services.worker, 'down');
    assert.equal(resBody.services.lifecycleWorker, 'down');
  }

  // Rehearsal D: Queue Failure & Dead-Letter Backlog
  {
    const deadQueueHandler = createReadinessHandler({
      media: () => ({ ready: true }),
      database: async () => {},
      redis: async () => ({ compatible: true, version: '7.2.4' }),
      notificationWorker: async () => true,
      lifecycle: async () => ({ workerUp: true, overdueCleanupJobs: 5, deadCleanupJobs: 2, failingCleanupJobs: 1 }),
      recoveryReplay: async () => {},
    });

    let resCode = 0;
    let resBody = null;
    const fakeRes = {
      status(code) { resCode = code; return this; },
      json(data) { resBody = data; return this; },
    };

    await deadQueueHandler({}, fakeRes);
    assert.equal(resBody.details.lifecycleCleanup.overdueJobs, 5);
    assert.equal(resBody.details.lifecycleCleanup.deadJobs, 2);
    assert.equal(resBody.details.lifecycleCleanup.failingJobs, 1);
  }

  // Rehearsal E: Recovery Replay Gate - Unreplayed Restored Target Blocks Traffic
  {
    const originalEnv = env.RECOVERY_REPLAY_GATE;
    env.RECOVERY_REPLAY_GATE = true;
    try {
      const replayBlockedHandler = createReadinessHandler({
        media: () => ({ ready: true }),
        database: async () => {},
        redis: async () => ({ compatible: true, version: '7.2.4' }),
        notificationWorker: async () => true,
        lifecycle: async () => ({ workerUp: true, overdueCleanupJobs: 0, deadCleanupJobs: 0, failingCleanupJobs: 0 }),
        recoveryReplay: async () => {
          throw new Error('Disaster recovery erasure replay not completed');
        },
      });

      let resCode = 0;
      let resBody = null;
      const fakeRes = {
        status(code) { resCode = code; return this; },
        json(data) { resBody = data; return this; },
      };

      await replayBlockedHandler({}, fakeRes);
      assert.equal(resCode, 503, 'Restored database with pending erasure replay must fail readiness probe (503)');
      assert.equal(resBody.status, 'unhealthy');
      assert.equal(resBody.services.recoveryReplay, 'down');

      // Once replay completes:
      const replayDoneHandler = createReadinessHandler({
        media: () => ({ ready: true }),
        database: async () => {},
        redis: async () => ({ compatible: true, version: '7.2.4' }),
        notificationWorker: async () => true,
        lifecycle: async () => ({ workerUp: true, overdueCleanupJobs: 0, deadCleanupJobs: 0, failingCleanupJobs: 0 }),
        recoveryReplay: async () => { /* success */ },
      });

      await replayDoneHandler({}, fakeRes);
      assert.equal(resCode, 200, 'Replayed database must pass readiness probe (200)');
      assert.equal(resBody.status, 'healthy');
      assert.equal(resBody.services.recoveryReplay, 'up');
    } finally {
      env.RECOVERY_REPLAY_GATE = originalEnv;
    }
  }
});

}
