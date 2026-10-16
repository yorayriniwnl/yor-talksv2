import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { logErrorMetadata } from '../lib/log-error.js';

test('structured production error logs exclude query values and provider credentials', () => {
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import { DrizzleQueryError } from 'drizzle-orm/errors';
    import { logger } from './src/lib/logger.ts';
    const cause = Object.assign(new Error('private-driver-detail'), { code: '23505', detail: 'private-user-email' });
    const databaseError = new DrizzleQueryError('INSERT INTO messages(content) VALUES ($1)', ['private-message-body'], cause);
    logger.error({ err: databaseError, requestId: 'synthetic-request-id' }, 'Unhandled error');
    logger.warn({ error: Object.assign(new Error('private-push-endpoint'), {
      statusCode: 429, endpoint: 'https://example.test/private-capability', body: 'private-provider-response',
    }) }, 'Provider unavailable');
    logger.error(databaseError);
    logger.error({ err: databaseError });
    logger.warn({ err: 'private-redis-credential', error: { message: 'private-arbitrary-object' } }, 'Dependency unavailable');
    logger.flush();
  `], { cwd: new URL('../..', import.meta.url), encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' } });
  assert.equal(child.status, 0, 'the actual production logger must start successfully');
  assert.equal(child.stdout.includes('private-'), false, 'error messages, causes, query parameters and provider fields must not reach logs');
  const records = child.stdout.trim().split('\n').map(line => JSON.parse(line));
  assert.equal(records.length, 5);
  assert.equal(records[0].requestId, 'synthetic-request-id', 'opaque correlation data remains available');
  assert.equal(records[0].err.type, 'DrizzleQueryError');
  assert.equal(records[0].err.cause.code, '23505', 'reviewed SQLSTATE codes remain available for operations');
  assert.equal(records[1].error.statusCode, 429);
  assert.deepEqual(Object.keys(records[0].err).sort(), ['cause', 'type']);
});

test('error metadata accepts only reviewed types and codes, and bounds recursive causes', () => {
  const error = Object.assign(new Error('private-message'), {
    name: 'private-name', code: 'private-code', statusCode: 'private-status', cause: undefined as unknown,
  });
  error.cause = error;
  assert.deepEqual(logErrorMetadata(error), { type: 'Error', cause: { type: 'Error', cause: { type: 'Error' } } });
  assert.deepEqual(logErrorMetadata({ name: 'Error', message: 'private-body' }), { type: 'Error' });
  assert.deepEqual(logErrorMetadata('private-string'), { type: 'Error' });
  assert.deepEqual(logErrorMetadata(Object.assign(new Error(), { code: 'ECONNREFUSED', statusCode: 503 })),
    { type: 'Error', code: 'ECONNREFUSED', statusCode: 503 });
});
