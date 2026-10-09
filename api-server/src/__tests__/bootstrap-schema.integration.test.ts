import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Client } from 'pg';
import { assertIsolatedPostgres } from '../../../ops/test-infrastructure-guard.mjs';

const requireDb=createRequire(new URL('../../../lib/db/package.json',import.meta.url));
const pg=requireDb('pg')as typeof import('pg');
const productionScript=fileURLToPath(new URL('../../../lib/db/scripts/migrate-production.mjs',import.meta.url));
const bootstrapModule=await import(new URL('../../../lib/db/scripts/bootstrap-schema.mjs',import.meta.url).href);
const databases=new Set<string>();let admin:Client,target:URL;
before(async()=>{
  assert.equal(process.env.NODE_ENV,'test');assert.ok(process.env.DATABASE_URL);assert.ok(process.env.REDIS_URL);
  target=assertIsolatedPostgres(process.env);
  admin=new pg.Client({connectionString:target.href,ssl:false});await admin.connect();
  const identity=(await admin.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
  assertIsolatedPostgres(process.env,identity);
});
after(async()=>{
  if(admin){for(const name of databases){assert.match(name,/^yor_hardening_bootstrap_[a-f0-9]{32}$/);await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);}await admin.end();}
});
async function fixture(){
  const name=`yor_hardening_bootstrap_${randomUUID().replaceAll('-','')}`;assert.match(name,/^yor_hardening_bootstrap_[a-f0-9]{32}$/);
  databases.add(name);await admin.query(`CREATE DATABASE "${name}"`);
  const url=new URL(target.href);url.pathname=`/${name}`;
  const client=new pg.Client({connectionString:url.href,ssl:false});await client.connect();
  assert.equal((await client.query('SELECT current_database() db')).rows[0].db,name);
  return {name,url,client};
}
async function runProduction(url:URL):Promise<{code:number|null;output:string}>{
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[productionScript],{env:{...process.env,DATABASE_URL:url.href,NODE_ENV:'test',DB_SSL:'false'},stdio:['ignore','pipe','pipe'],windowsHide:true});
    let output='';child.stdout.on('data',chunk=>output+=String(chunk));child.stderr.on('data',chunk=>output+=String(chunk));
    const timeout=setTimeout(()=>{child.kill();reject(new Error('Isolated migration exceeded 60 seconds'));},60_000);
    child.once('error',error=>{clearTimeout(timeout);reject(error);});child.once('exit',code=>{clearTimeout(timeout);resolve({code,output});});
  });
}
async function tableNames(client:Client){return (await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`)).rows.map(row=>row.tablename as string);}

test('reviewed SQL bootstraps a fresh private database and production migration repeats without schema push',async()=>{
  const {url,client}=await fixture();
  try{
    assert.deepEqual(await tableNames(client),[]);
    const first=await runProduction(url);assert.equal(first.code,0,first.output);assert.doesNotMatch(first.output,/drizzle-kit push|--force/);
    const tables=await tableNames(client);for(const required of ['users','messages','conversations','conversation_members','media_assets','release_schema_versions','background_jobs'])assert.ok(tables.includes(required),required);
    const versions=(await client.query('SELECT version,applied_at FROM release_schema_versions ORDER BY version')).rows;
    assert.ok(versions.some(row=>row.version==='20261007-message-integrity-1'));
    const repeat=await runProduction(url);assert.equal(repeat.code,0,repeat.output);
    assert.deepEqual((await client.query('SELECT version,applied_at FROM release_schema_versions ORDER BY version')).rows,versions,'repeat must preserve applied history');
    await assert.rejects(()=>bootstrapModule.bootstrapEmptySchema(client),/verified empty public schema/);
  }finally{await client.end();}
});

test('production upgrade migrates representative existing cascading group data without altering surviving bodies',async()=>{
  const {url,client}=await fixture(),creator=randomUUID(),survivor=randomUUID(),other=randomUUID(),group=randomUUID(),message=randomUUID();
  try{
    await bootstrapModule.bootstrapEmptySchema(client);
    await client.query(`ALTER TABLE conversations DROP CONSTRAINT conversations_participant_a_users_id_fk,DROP CONSTRAINT conversations_participant_b_users_id_fk,
      ALTER COLUMN participant_a SET NOT NULL,ALTER COLUMN participant_b SET NOT NULL;
      ALTER TABLE conversations ADD CONSTRAINT old_participant_a FOREIGN KEY(participant_a) REFERENCES users(id) ON DELETE CASCADE,
        ADD CONSTRAINT old_participant_b FOREIGN KEY(participant_b) REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE messages DROP CONSTRAINT messages_recipient_id_users_id_fk,ALTER COLUMN recipient_id SET NOT NULL;
      ALTER TABLE messages ADD CONSTRAINT old_recipient FOREIGN KEY(recipient_id) REFERENCES users(id) ON DELETE CASCADE`);
    for(const id of [creator,survivor,other])await client.query(`INSERT INTO users(id,username,email,password_hash,full_name) VALUES($1,$2,$3,'synthetic-hash','Synthetic upgrade account')`,[id,`upgrade-${id.slice(0,8)}`,`${id}@example.test`]);
    await client.query('INSERT INTO conversations(id,participant_a,participant_b,participant_ids,is_group,title) VALUES($1,$2,$2,$3::jsonb,true,$4)',[group,creator,JSON.stringify([creator,survivor,other]),'Existing synthetic group']);
    await client.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content) VALUES($1,$2,$3,$4,'Surviving pre-upgrade body')`,[message,group,survivor,other]);
    const upgraded=await runProduction(url);assert.equal(upgraded.code,0,upgraded.output);
    assert.equal((await client.query('SELECT count(*)::int n FROM conversation_members WHERE conversation_id=$1',[group])).rows[0].n,3);
    assert.equal((await client.query('SELECT participant_a FROM conversations WHERE id=$1',[group])).rows[0].participant_a,null);
    assert.equal((await client.query('SELECT recipient_id,content FROM messages WHERE id=$1',[message])).rows[0].recipient_id,null);
    await client.query('DELETE FROM users WHERE id=$1',[creator]);
    assert.equal((await client.query('SELECT content FROM messages WHERE id=$1',[message])).rows[0].content,'Surviving pre-upgrade body');
    assert.equal((await client.query('SELECT 1 FROM conversations WHERE id=$1',[group])).rowCount,1);
    const repeated=await runProduction(url);assert.equal(repeated.code,0,repeated.output);
    assert.equal((await client.query('SELECT content FROM messages WHERE id=$1',[message])).rows[0].content,'Surviving pre-upgrade body');
  }finally{await client.end();}
});

test('nonempty incomplete targets are refused without modifying existing sentinel data',async()=>{
  const {url,client}=await fixture();
  try{
    await client.query(`CREATE TABLE sentinel(id integer PRIMARY KEY,body text NOT NULL);INSERT INTO sentinel VALUES(1,'Preserve this existing data')`);
    const result=await runProduction(url);assert.equal(result.code,1);assert.match(result.output,/non-empty, incomplete base schema/);
    assert.deepEqual(await tableNames(client),['sentinel']);assert.equal((await client.query('SELECT body FROM sentinel')).rows[0].body,'Preserve this existing data');
    await assert.rejects(()=>bootstrapModule.bootstrapEmptySchema(client),/verified empty public schema/);
    assert.deepEqual(await tableNames(client),['sentinel']);
  }finally{await client.end();}
});

test('function-only, type-only, custom-schema and extension targets fail closed, including user functions in system schemas',async()=>{
  const {url,client}=await fixture();
  const cases=[
    {create:"CREATE FUNCTION public.retained_function() RETURNS text LANGUAGE sql AS 'SELECT ''preserved''::text'",drop:'DROP FUNCTION public.retained_function()',object:'routine:public.retained_function',verify:"SELECT public.retained_function() AS value",value:'preserved'},
    {create:"CREATE TYPE public.retained_type AS ENUM ('preserved')",drop:'DROP TYPE public.retained_type',object:'type:public.retained_type',verify:"SELECT 'preserved'::public.retained_type AS value",value:'preserved'},
    {create:'CREATE SCHEMA retained_schema',drop:'DROP SCHEMA retained_schema',object:'schema:retained_schema',verify:"SELECT nspname AS value FROM pg_namespace WHERE nspname='retained_schema'",value:'retained_schema'},
    {create:'CREATE EXTENSION pgcrypto WITH SCHEMA public',drop:'DROP EXTENSION pgcrypto',object:'extension:pgcrypto',verify:"SELECT extname AS value FROM pg_extension WHERE extname='pgcrypto'",value:'pgcrypto'},
    {create:"CREATE FUNCTION pg_catalog.retained_function() RETURNS text LANGUAGE sql AS 'SELECT ''preserved''::text'",drop:'DROP FUNCTION pg_catalog.retained_function()',object:'routine:pg_catalog.retained_function',verify:"SELECT pg_catalog.retained_function() AS value",value:'preserved'},
  ];
  try{
    assert.deepEqual(await bootstrapModule.inspectSchemaObjects(client),[],'the default system extension is permitted');
    for(const scenario of cases){
      await client.query(scenario.create);
      assert.ok((await bootstrapModule.inspectSchemaObjects(client)).includes(scenario.object),scenario.object);
      const result=await runProduction(url);assert.equal(result.code,1,scenario.object);assert.match(result.output,/non-empty, incomplete base schema/);
      await assert.rejects(()=>bootstrapModule.bootstrapEmptySchema(client),/verified empty public schema/);
      assert.deepEqual(await tableNames(client),[],'a refused bootstrap must not create application tables');
      assert.equal((await client.query(scenario.verify)).rows[0].value,scenario.value,'a refused bootstrap must retain the original object');
      await client.query(scenario.drop);
      assert.deepEqual(await bootstrapModule.inspectSchemaObjects(client),[]);
    }
    const retry=await runProduction(url);assert.equal(retry.code,0,retry.output);
  }finally{await client.end();}
});

test('a real PostgreSQL failure during base SQL rolls back every created table before a clean retry',async()=>{
  const {client}=await fixture();
  try{
    let injected=false;
    const failingClient={query:async(statement:string,...args:unknown[])=>{
      if(statement.includes('CREATE TABLE')){injected=true;return client.query(`${statement}\nSELECT 1/0 AS injected_bootstrap_failure`);}
      return client.query(statement,...args as [unknown[]]);
    }};
    await assert.rejects(()=>bootstrapModule.bootstrapEmptySchema(failingClient),/division by zero/);assert.equal(injected,true);
    assert.deepEqual(await tableNames(client),[],'DDL must have rolled back with the failed transaction');
    await bootstrapModule.bootstrapEmptySchema(client);assert.ok((await tableNames(client)).includes('users'));
  }finally{await client.end();}
});
