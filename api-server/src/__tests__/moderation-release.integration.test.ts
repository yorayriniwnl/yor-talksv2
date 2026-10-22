import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { PgDialect } from 'drizzle-orm/pg-core';
import { assertModerationSchema, REQUIRED_MODERATION_SCHEMA_VERSION } from '../services/moderation-readiness.js';

const { migrateModeration, MODERATION_SCHEMA_VERSION } = await import(new URL('../../../lib/db/scripts/migrate-moderation.mjs', import.meta.url).href);
after(() => pool.end());

test('moderation release migration is repeatable and readiness rejects missing columns, version and uniqueness', async t => {
  const client = await pool.connect();
  t.after(async () => { try { await client.query('ROLLBACK'); } finally { client.release(); } });
  await client.query('BEGIN');
  const schema = `moderation_release_${randomUUID().replaceAll('-', '')}`;
  await client.query(`CREATE SCHEMA "${schema}"`); await client.query(`SET LOCAL search_path TO "${schema}"`);
  for (const table of ['users','reports','grievance_tickets']) await client.query(`CREATE TABLE ${table}(id uuid PRIMARY KEY)`);
  await client.query('CREATE TABLE release_schema_versions(version text PRIMARY KEY)');
  const dialect = new PgDialect();
  const ready = () => assertModerationSchema(statement => { const q = dialect.sqlToQuery(statement); return client.query(q.sql, q.params); });
  await migrateModeration(client); await migrateModeration(client);
  await assert.rejects(ready(), /migration is incomplete/);
  assert.equal(MODERATION_SCHEMA_VERSION, REQUIRED_MODERATION_SCHEMA_VERSION);
  await client.query('INSERT INTO release_schema_versions VALUES($1)', [MODERATION_SCHEMA_VERSION]);
  await ready();
  for (const change of [
    'ALTER TABLE moderation_appeals RENAME COLUMN public_rationale TO old_rationale',
    'DROP INDEX moderation_enforcements_target_idx',
    'DROP INDEX moderation_decision_notices_decision_recipient_idx',
    'DROP INDEX moderation_appeals_decision_appellant_unique_idx',
    'DELETE FROM release_schema_versions',
  ]) {
    await client.query('SAVEPOINT schema_fault'); await client.query(change);
    await assert.rejects(ready(), error => error instanceof Error, change);
    await client.query('ROLLBACK TO SAVEPOINT schema_fault'); await client.query('RELEASE SAVEPOINT schema_fault');
    await ready();
  }
  const [user, decision, appeal] = [randomUUID(),randomUUID(),randomUUID()];
  await client.query('INSERT INTO users VALUES($1)', [user]);
  await client.query("INSERT INTO moderation_decisions(id,target_type,target_id,action,rationale) VALUES($1,'user',$2,'restrict','Reviewed policy restriction')", [decision,user]);
  await client.query("INSERT INTO moderation_appeals(id,decision_id,appellant_user_id,relationship,statement) VALUES($1,$2,$3,'author','Please review this restriction')", [appeal,decision,user]);
  const before = await client.query('SELECT * FROM moderation_appeals');
  await migrateModeration(client); assert.deepEqual((await client.query('SELECT * FROM moderation_appeals')).rows,before.rows);
  await client.query('SAVEPOINT duplicate_appeal');
  await assert.rejects(client.query("INSERT INTO moderation_appeals(id,decision_id,appellant_user_id,relationship,statement) VALUES($1,$2,$3,'author','Duplicated appeal request')", [randomUUID(),decision,user]), { code: '23505' });
  await client.query('ROLLBACK TO SAVEPOINT duplicate_appeal');
});
