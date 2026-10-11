import test from 'node:test';
import assert from 'node:assert/strict';
import { assertReadiness } from '../ops/check-readiness.mjs';

const report = () => ({ status: 'healthy', services: { database: 'up', redis: 'up', worker: 'up', lifecycle: 'up' }, details: { lifecycle: { ready: true }, media: { decoder: true, ready: true } } });

test('deployment smoke requires core media and lifecycle progress', () => {
  assert.doesNotThrow(() => assertReadiness(report()));
  const unavailable = report(); unavailable.details.media.ready = false;
  assert.throws(() => assertReadiness(unavailable), /Core media provider/);
  assert.doesNotThrow(() => assertReadiness(unavailable, { syntheticProviders: true }));
  assert.throws(() => assertReadiness(report(), { syntheticProviders: true }), /Synthetic CI/);
  for (const service of ['database', 'redis', 'worker', 'lifecycle']) {
    const down = report(); delete down.services[service];
    assert.throws(() => assertReadiness(down), new RegExp(service));
  }
  const stalled = report(); stalled.details.lifecycle.ready = false;
  assert.throws(() => assertReadiness(stalled), /Lifecycle progress/);
  const noDecoder = report(); noDecoder.details.media.decoder = false;
  assert.throws(() => assertReadiness(noDecoder), /Media decoder/);
});
