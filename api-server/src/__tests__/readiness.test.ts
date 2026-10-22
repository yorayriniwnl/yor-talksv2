import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Request, Response } from 'express';
import { createReadinessHandler } from '../routes/health.js';
import { createMediaReadinessMonitor, type MediaReadiness } from '../services/media-readiness.js';

const readyMedia: MediaReadiness = {
  storage: true, presets: true, direct: true, decoder: true, moderation: true, ready: true, errorCodes: [],
};
const healthyDependencies = (media: () => MediaReadiness) => ({
  media,
  database: async () => {},
  recoveryReplay: async () => {},
  redis: async () => ({ compatible: true, version: '7.0.0' }),
  notificationWorker: async () => true,
  lifecycle: async () => ({ workerUp: true, overdueCleanupJobs: 0, deadCleanupJobs: 0 }),
});

async function runReadiness(dependencies: Parameters<typeof createReadinessHandler>[0]) {
  let status = 0;
  let body: any;
  const response = {
    status(code: number) { status = code; return this; },
    json(value: unknown) { body = value; return this; },
  } as Response;
  await createReadinessHandler(dependencies)({} as Request, response);
  return { status, body };
}

test('an optional media probe that never settles cannot delay core readiness or launch duplicate probes', async () => {
  let calls = 0;
  let now = 0;
  const monitor = createMediaReadinessMonitor(() => { calls++; return new Promise(() => {}); }, () => now);
  const dependencies = healthyDependencies(monitor.snapshot);
  const response = await runReadiness(dependencies);
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'healthy');
  assert.equal(response.body.details.media.ready, false);
  assert.deepEqual(response.body.details.media.errorCodes, ['media_readiness_pending']);
  assert.deepEqual(response.body.services, { database: 'up', redis: 'up', api: 'up', worker: 'up', lifecycleWorker: 'up' });
  now = 120_000;
  assert.equal((await runReadiness(dependencies)).status, 200);
  assert.equal(calls, 1);
});

test('mandatory dependency failures still fail readiness while media is pending', async () => {
  const monitor = createMediaReadinessMonitor(() => new Promise(() => {}));
  for (const [service, overrides] of [
    ['database', { database: async () => { throw new Error('Database unavailable'); } }],
    ['redis', { redis: async () => ({ compatible: false }) }],
    ['worker', { notificationWorker: async () => false }],
    ['lifecycleWorker', { lifecycle: async () => ({ workerUp: false, overdueCleanupJobs: 0, deadCleanupJobs: 0 }) }],
  ] as const) {
    const response = await runReadiness({ ...healthyDependencies(monitor.snapshot), ...overrides });
    assert.equal(response.status, 503, service);
    assert.equal(response.body.services[service], 'down', service);
    assert.equal(response.body.details.media.ready, false);
  }
});

test('public readiness failures omit internal dependency error messages', async () => {
  const privateDetail = 'synthetic database connection failed at private-host:5432 with credential fixture';
  const response = await runReadiness({
    ...healthyDependencies(() => readyMedia),
    database: async () => { throw new Error(privateDetail); },
  });
  assert.equal(response.status, 503);
  assert.equal(response.body.services.database, 'down');
  assert.equal(response.body.error, 'One or more dependencies are unavailable');
  assert.ok(!JSON.stringify(response.body).includes(privateDetail));
});

test('media diagnostics expire from completion and fail closed while refreshing', async () => {
  let now = 0;
  let resolveProbe!: (value: MediaReadiness) => void;
  let calls = 0;
  const monitor = createMediaReadinessMonitor(() => {
    calls++;
    return new Promise(resolve => { resolveProbe = resolve; });
  }, () => now);
  assert.equal(monitor.snapshot().ready, false);
  const firstProbe = monitor.inspect();
  await Promise.resolve();
  now = 120_000;
  resolveProbe(readyMedia);
  await firstProbe;
  assert.equal(monitor.snapshot().ready, true);
  now = 179_999;
  assert.equal(monitor.snapshot().ready, true);
  assert.equal(calls, 1);
  now = 180_000;
  assert.equal(monitor.snapshot().ready, false);
  const secondProbe = monitor.inspect();
  await Promise.resolve();
  assert.equal(calls, 2);
  resolveProbe({ ...readyMedia, ready: false, moderation: false, errorCodes: ['media_moderation_unavailable'] });
  await secondProbe;
  assert.deepEqual(monitor.snapshot().errorCodes, ['media_moderation_unavailable']);
});

test('an optional probe exception is a conservative diagnostic and does not become an unhandled rejection', async () => {
  const monitor = createMediaReadinessMonitor(async () => { throw new Error('Provider failure'); });
  assert.equal(monitor.snapshot().ready, false);
  await monitor.inspect();
  assert.deepEqual(monitor.snapshot().errorCodes, ['media_readiness_unavailable']);
  assert.equal((await runReadiness(healthyDependencies(monitor.snapshot))).status, 200);
});
