import assert from 'node:assert/strict';

/** Test/drill targets are selected by the caller URL and verified database name.
 * PostgreSQL's server-side interface can be a container IP after local Docker
 * port publishing; it is not the address the caller chose to connect to. */
export function assertIsolatedPostgres(environment, identity, databasePattern) {
  assert.equal(environment.NODE_ENV, 'test', 'Explicit test environment required');
  assert.ok(environment.DATABASE_URL, 'Explicit isolated DATABASE_URL required');
  const target = new URL(environment.DATABASE_URL);
  assert.ok(['postgres:', 'postgresql:'].includes(target.protocol), 'PostgreSQL URL required');
  const routingOverrides = new Set(['host', 'hostaddr', 'port', 'database', 'dbname']);
  for (const key of target.searchParams.keys()) {
    assert.ok(!routingOverrides.has(key.toLowerCase()), 'PostgreSQL routing query overrides are forbidden in test URLs');
  }
  assert.ok(['127.0.0.1', 'localhost', '[::1]', '::1'].includes(target.hostname), 'Test database caller must use loopback');
  const name = decodeURIComponent(target.pathname.slice(1));
  const isolated = databasePattern ? databasePattern.test(name)
    : /^yor_hardening_[a-z0-9_]+$/i.test(name) || (environment.CI === 'true' && name === 'yor_talks');
  assert.ok(isolated, 'Explicit isolated database name required');
  const port = Number(target.port || '5432');
  assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, 'Valid PostgreSQL port required');
  if (identity) {
    assert.ok(identity.database === name, 'PostgreSQL database identity mismatch');
    // Port publishing can also change the server port relative to the caller.
    // Exact database identity, explicit isolated name and loopback caller are
    // the mutation boundaries; server interface/port are diagnostics only.
  }
  return target;
}
