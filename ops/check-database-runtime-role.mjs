import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { configureRuntimeRole, runtimeRoleConfiguration } from '../lib/db/scripts/configure-runtime-role.mjs';

const require = createRequire(new URL('../lib/db/package.json', import.meta.url));
const { Client } = require('pg');
const adminURL = process.env.DATABASE_ROLE_TEST_ADMIN_URL;
if (!adminURL) throw new Error('Set DATABASE_ROLE_TEST_ADMIN_URL to an explicitly disposable test cluster');
const testHost = new URL(adminURL);
if (!['localhost', '127.0.0.1', '[::1]', 'postgres'].includes(testHost.hostname)) {
  throw new Error('Role checks are restricted to a loopback/CI synthetic PostgreSQL cluster');
}
const suffix = randomBytes(6).toString('hex');
const database = `yor_role_test_${suffix}`, name = `yor_runtime_test_${suffix}`;
const privilegedName = `yor_privileged_test_${suffix}`;
const password = randomBytes(32).toString('hex');
const owner = new Client({ connectionString: adminURL });
const connections = new Set();
const createdRoles = new Set();
let createdDatabase = false;

async function connect(url) {
  const client = new Client({ connectionString: url });
  await client.connect(); connections.add(client); return client;
}
async function denied(client, query) {
  await assert.rejects(client.query(query), error => ['42501', '0LP01'].includes(error.code),
    `Runtime role unexpectedly executed privileged SQL: ${query}`);
}

try {
  await owner.connect();
  await owner.query(`CREATE DATABASE "${database}"`);
  createdDatabase = true;
  const migrationURL = new URL(adminURL); migrationURL.pathname = `/${database}`;
  const runtimeURL = new URL(migrationURL); runtimeURL.username = name; runtimeURL.password = password;
  const config = runtimeRoleConfiguration({ APP_DB_USER: name, APP_DB_PASSWORD: password,
    DATABASE_URL: migrationURL.toString(), APP_DATABASE_URL: runtimeURL.toString() });
  const migration = await connect(migrationURL.toString());
  await migration.query('CREATE TABLE public.role_fixture (id bigserial PRIMARY KEY, value text NOT NULL)');
  await migration.query('CREATE SCHEMA unrelated; CREATE TABLE unrelated.private_fixture (id integer)');
  // Fresh role and an idempotent existing-role/upgrade path must both work.
  await configureRuntimeRole(migration, config); createdRoles.add(name);
  await configureRuntimeRole(migration, config);
  const runtime = await connect(runtimeURL.toString());
  const flags = (await runtime.query(`SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls
    FROM pg_roles WHERE rolname=current_user`)).rows[0];
  assert.ok(Object.values(flags).every(value => value === false));
  const row = (await runtime.query("INSERT INTO public.role_fixture(value) VALUES ('synthetic') RETURNING id")).rows[0];
  await runtime.query("UPDATE public.role_fixture SET value='updated' WHERE id=$1", [row.id]);
  assert.equal((await runtime.query('SELECT value FROM public.role_fixture WHERE id=$1', [row.id])).rows[0].value, 'updated');
  await runtime.query('DELETE FROM public.role_fixture WHERE id=$1', [row.id]);
  assert.equal((await runtime.query('SELECT count(*)::integer AS count FROM public.role_fixture')).rows[0].count, 0);
  await migration.query('CREATE TABLE public.future_fixture (id bigserial PRIMARY KEY, value text NOT NULL)');
  await runtime.query("INSERT INTO public.future_fixture(value) VALUES ('default-grants')");
  const ownerName = (await migration.query('SELECT current_user AS name')).rows[0].name.replaceAll('"', '""');
  for (const query of [
    'CREATE TABLE public.forbidden(id integer)', 'CREATE SCHEMA forbidden', 'CREATE TEMP TABLE forbidden(id integer)',
    'DROP TABLE public.role_fixture', 'ALTER TABLE public.role_fixture ADD COLUMN forbidden integer',
    'TRUNCATE public.role_fixture', 'CREATE ROLE forbidden_runtime_role', 'CREATE DATABASE forbidden_runtime_db',
    `SET ROLE "${ownerName}"`, 'SELECT * FROM unrelated.private_fixture',
  ]) await denied(runtime, query);

  // Reject an unmanaged pre-existing role without changing it.
  await owner.query(`CREATE ROLE "${privilegedName}" LOGIN SUPERUSER`); createdRoles.add(privilegedName);
  await assert.rejects(configureRuntimeRole(migration, { name: privilegedName, password }), /unrecognized or privileged/);
  assert.equal((await owner.query('SELECT rolsuper FROM pg_roles WHERE rolname=$1', [privilegedName])).rows[0].rolsuper, true);
  // Also reject mutations of the managed role rather than silently downgrading them.
  await migration.query(`GRANT CREATE ON SCHEMA public TO "${name}"`);
  await assert.rejects(configureRuntimeRole(migration, config), /unexpected grants/);
  await migration.query(`REVOKE CREATE ON SCHEMA public FROM "${name}"`);
  await owner.query(`GRANT "${privilegedName}" TO "${name}"`);
  await assert.rejects(configureRuntimeRole(migration, config), /memberships/);
  await owner.query(`REVOKE "${privilegedName}" FROM "${name}"`);
  await configureRuntimeRole(migration, config);
  console.log('[database role] Fresh/upgrade runtime CRUD, sequences/default grants, isolation and DDL/role/database denial pass. Unexpected existing roles, grants and memberships are rejected unchanged.');
} finally {
  for (const client of connections) await client.end().catch(() => undefined);
  // Targets are generated here and never selected from host/user input.
  if (createdDatabase) await owner.query(`DROP DATABASE "${database}"`);
  for (const role of createdRoles) await owner.query(`DROP ROLE "${role}"`);
  await owner.end();
}
