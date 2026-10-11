import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertIsolatedPostgres } from '../ops/test-infrastructure-guard.mjs';

const local = { NODE_ENV: 'test', DATABASE_URL: 'postgresql://postgres@127.0.0.1:55447/yor_hardening_guard' };
test('isolated PostgreSQL guard accepts local and Docker-published interface identities', () => {
  assert.equal(assertIsolatedPostgres(local, { database: 'yor_hardening_guard', port: 55447 }).hostname, '127.0.0.1');
  const ci = { NODE_ENV: 'test', CI: 'true', DATABASE_URL: 'postgresql://postgres@localhost:5432/yor_talks' };
  // The connection is loopback even though Docker PostgreSQL reports eth0.
  assert.equal(assertIsolatedPostgres(ci, { database: 'yor_talks', port: 5432, address: '172.18.0.2' }).pathname, '/yor_talks');
  assert.equal(assertIsolatedPostgres(local, { database: 'yor_hardening_guard', port: 5432, address: '172.18.0.2' }).port, '55447');
  assert.equal(assertIsolatedPostgres({ ...local, DATABASE_URL: 'postgresql://postgres@[::1]:55447/yor_hardening_guard' }).hostname, '[::1]');
});
test('isolated PostgreSQL guard refuses remote callers, default development DBs and identity mismatches', () => {
  for (const DATABASE_URL of ['postgresql://db.example.invalid/yor_hardening_guard', 'postgresql://172.18.0.2/yor_hardening_guard',
    'postgresql://localhost.example.invalid/yor_hardening_guard', 'https://localhost/yor_hardening_guard',
    'postgresql://localhost/yor_talks', 'postgresql://localhost/production']) {
    assert.throws(() => assertIsolatedPostgres({ ...local, DATABASE_URL }));
  }
  assert.throws(() => assertIsolatedPostgres({ ...local, NODE_ENV: 'production' }));
  assert.throws(() => assertIsolatedPostgres({ NODE_ENV: 'test' }));
  assert.throws(() => assertIsolatedPostgres(local, { database: 'production', port: 55447 }), /identity mismatch/);
  assert.throws(() => assertIsolatedPostgres({ ...local, DATABASE_URL: 'postgresql://localhost:0/yor_hardening_guard' }), /port required/);
});
test('backup fixture guard permits only its generated drill database names', () => {
  const pattern = /^yor_backup_acceptance_(?:source|target|failed)_[a-f0-9]{12}$/;
  const DATABASE_URL = 'postgresql://localhost:5432/yor_backup_acceptance_target_012345abcdef';
  assert.equal(assertIsolatedPostgres({ NODE_ENV: 'test', DATABASE_URL },
    { database: 'yor_backup_acceptance_target_012345abcdef', port: 5432 }, pattern).pathname, '/yor_backup_acceptance_target_012345abcdef');
  assert.throws(() => assertIsolatedPostgres(local, undefined, pattern));
});
test('loopback test URLs reject routing query overrides while retaining safe connection options', () => {
  for (const key of ['host', 'HOST', 'hOsT', 'hostaddr', 'port', 'database', 'dbname']) {
    assert.throws(() => assertIsolatedPostgres({ ...local, DATABASE_URL: `${local.DATABASE_URL}?${key}=outside` }), /routing query overrides/);
  }
  assert.equal(assertIsolatedPostgres({ ...local, DATABASE_URL: `${local.DATABASE_URL}?sslmode=require&application_name=synthetic_guard` }).hostname, '127.0.0.1');
});
