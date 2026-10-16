const managedRoleComment = 'Yor Talks managed runtime role v1';
const runtimeRolePattern = /^[a-z][a-z0-9_]{0,62}$/;

export function runtimeRoleConfiguration(environment) {
  const name = environment.APP_DB_USER ?? '';
  const password = environment.APP_DB_PASSWORD ?? '';
  if (!runtimeRolePattern.test(name) || name.startsWith('pg_')) {
    throw new Error('[database role] APP_DB_USER must be a lowercase PostgreSQL identifier, excluding pg_ names');
  }
  if (!/^[a-fA-F0-9]{64,128}$/.test(password)) {
    throw new Error('[database role] APP_DB_PASSWORD must be an independently generated 64–128 character hex secret');
  }
  let owner, runtime;
  try {
    owner = new URL(environment.DATABASE_URL ?? '');
    runtime = new URL(environment.APP_DATABASE_URL ?? '');
  } catch {
    throw new Error('[database role] Migration and application database URLs must be set explicitly');
  }
  if (!['postgres:', 'postgresql:'].includes(owner.protocol) || !['postgres:', 'postgresql:'].includes(runtime.protocol)
    || owner.host !== runtime.host || owner.pathname !== runtime.pathname || owner.search !== runtime.search
    || owner.hash || runtime.hash || decodeURIComponent(runtime.username) !== name
    || decodeURIComponent(runtime.password) !== password || decodeURIComponent(owner.username) === name
    || decodeURIComponent(owner.password) === password) {
    throw new Error('[database role] Application URL must use the distinct configured runtime credentials on the migration database');
  }
  return { name, password };
}

function identifier(value) { return `"${value.replaceAll('"', '""')}"`; }

async function inspectExistingRole(client, name) {
  const result = await client.query(`SELECT oid, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
    rolcanlogin, shobj_description(oid, 'pg_authid') AS description FROM pg_roles WHERE rolname=$1`, [name]);
  const role = result.rows[0];
  if (!role) return undefined;
  if (role.description !== managedRoleComment || !role.rolcanlogin
    || role.rolsuper || role.rolcreatedb || role.rolcreaterole || role.rolreplication || role.rolbypassrls) {
    throw new Error('[database role] Refusing to alter an unrecognized or privileged existing APP_DB_USER; provision a new dedicated role');
  }
  if ((await client.query('SELECT 1 FROM pg_auth_members WHERE member=$1 OR roleid=$1 LIMIT 1', [role.oid])).rowCount
    || (await client.query("SELECT 1 FROM pg_shdepend WHERE refclassid='pg_authid'::regclass AND refobjid=$1 AND deptype='o' LIMIT 1", [role.oid])).rowCount) {
    throw new Error('[database role] Existing runtime role must have no role memberships, members or object ownership');
  }
  if ((await client.query(`SELECT 1 FROM pg_database d, LATERAL aclexplode(d.datacl) a
      WHERE a.grantee=$1 AND (d.datname<>current_database() OR a.privilege_type<>'CONNECT' OR a.is_grantable)
      UNION ALL SELECT 1 FROM pg_namespace n, LATERAL aclexplode(n.nspacl) a
      WHERE a.grantee=$1 AND (n.nspname<>'public' OR a.privilege_type<>'USAGE' OR a.is_grantable)
      UNION ALL SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace,
        LATERAL aclexplode(c.relacl) a
      WHERE a.grantee=$1 AND (n.nspname<>'public' OR a.is_grantable OR
        CASE WHEN c.relkind='S' THEN a.privilege_type NOT IN ('SELECT','USAGE')
          ELSE a.privilege_type NOT IN ('SELECT','INSERT','UPDATE','DELETE') END) LIMIT 1`, [role.oid])).rowCount) {
    throw new Error('[database role] Existing runtime role has unexpected grants; manual review is required before reconciliation');
  }
  return role;
}

export async function configureRuntimeRole(client, configuration, { inspectOnly = false } = {}) {
  const { name, password } = configuration;
  // Credentials originate only from runtimeRoleConfiguration. Revalidate at
  // this SQL boundary so programmatic callers cannot inject role/password SQL.
  if (!runtimeRolePattern.test(name) || name.startsWith('pg_') || !/^[a-fA-F0-9]{64,128}$/.test(password)) {
    throw new Error('[database role] Invalid runtime role configuration');
  }
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('yor-talks-runtime-role-v1'))");
    const identity = (await client.query('SELECT current_user AS owner, current_database() AS database')).rows[0];
    if (identity.owner === name) throw new Error('[database role] Migration and runtime database identities must be different');
    const existing = await inspectExistingRole(client, name);
    if (!inspectOnly) {
      const role = identifier(name), database = identifier(identity.database), owner = identifier(identity.owner);
      if (!existing) {
        await client.query(`CREATE ROLE ${role} LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${password}'`);
        await client.query(`COMMENT ON ROLE ${role} IS '${managedRoleComment}'`);
      } else {
        await client.query(`ALTER ROLE ${role} PASSWORD '${password}'`);
      }
      // This application owns a dedicated database. PUBLIC must not grant
      // runtime users temporary-table or public-schema creation privileges.
      await client.query(`REVOKE CREATE, TEMPORARY ON DATABASE ${database} FROM PUBLIC`);
      await client.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await client.query(`GRANT CONNECT ON DATABASE ${database} TO ${role}`);
      await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
      await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
      await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${owner} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`);
      await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${owner} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${role}`);
      await inspectExistingRole(client, name);
      const privileges = (await client.query(`SELECT has_database_privilege($1,current_database(),'CREATE') AS database_create,
        has_database_privilege($1,current_database(),'TEMP') AS temporary_create,
        has_schema_privilege($1,'public','CREATE') AS schema_create`, [name])).rows[0];
      if (Object.values(privileges).some(Boolean)) throw new Error('[database role] Runtime DDL privileges remain; review existing PUBLIC grants');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
