import assert from 'node:assert/strict';
import test from 'node:test';
import { runtimeRoleConfiguration } from '../lib/db/scripts/configure-runtime-role.mjs';

const secret = 'a'.repeat(64);
const base = { APP_DB_USER: 'yor_runtime', APP_DB_PASSWORD: secret,
  DATABASE_URL: `postgresql://migration:${'b'.repeat(64)}@database:5432/yor_talks`,
  APP_DATABASE_URL: `postgresql://yor_runtime:${secret}@database:5432/yor_talks` };

test('runtime database provisioning validates distinct owner/runtime identities and exact target database', () => {
  assert.deepEqual(runtimeRoleConfiguration(base), { name: 'yor_runtime', password: secret });
  for (const override of [
    { APP_DB_USER: 'pg_runtime' }, { APP_DB_USER: 'runtime;DROP ROLE postgres' }, { APP_DB_USER: 'Runtime' },
    { APP_DB_PASSWORD: 'short' }, { APP_DB_PASSWORD: "a'.repeat(64)--" },
    { APP_DATABASE_URL: `postgresql://other:${secret}@database:5432/yor_talks` },
    { APP_DATABASE_URL: `postgresql://yor_runtime:${secret}@other-host:5432/yor_talks` },
    { APP_DATABASE_URL: `postgresql://yor_runtime:${secret}@database:5432/another_db` },
    { APP_DATABASE_URL: `postgresql://yor_runtime:${secret}@database:5432/yor_talks?sslmode=disable` },
    { DATABASE_URL: `postgresql://yor_runtime:${'b'.repeat(64)}@database:5432/yor_talks` },
    { DATABASE_URL: `postgresql://migration:${secret}@database:5432/yor_talks` },
    { DATABASE_URL: '' }, { APP_DATABASE_URL: '' },
  ]) assert.throws(() => runtimeRoleConfiguration({ ...base, ...override }), /database role/);
});
