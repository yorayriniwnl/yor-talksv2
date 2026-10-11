import fs from 'node:fs';

export async function inspectSchemaObjects(client) {
  const source=fs.readFileSync(new URL('./schema-object-inspection.sql',import.meta.url),'utf8');
  const {rows}=await client.query(source);
  return rows.map(row=>row.object_name);
}

/** Reviewed base SQL is applied only to an empty schema under an advisory lock.
 * Existing databases always use the additive migrations, never schema diff/push. */
export async function bootstrapEmptySchema(client) {
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtext('yor:base-schema:bootstrap'))");
    if ((await inspectSchemaObjects(client)).length !== 0) throw new Error('Base SQL requires a verified empty public schema and no custom schemas; retry additive migration');
    const source = fs.readFileSync(new URL('./production-base.sql', import.meta.url), 'utf8');
    await client.query(source);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
