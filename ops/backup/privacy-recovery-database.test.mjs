import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { accountErasureExecutor, eraseAccountData } from '../../lib/db/runtime/account-erasure.mjs';
import { exportPrivacyManifest } from './export-privacy-manifest.mjs';
import { replayRestoredDeletions } from './replay-deletions.mjs';
import { validateDeletionManifest, verifyRestoredDeletions } from './verify-restored-deletions.mjs';

const require = createRequire(new URL('../../lib/db/package.json',import.meta.url));
const { Client } = require('pg');
const digest = value => createHash('sha256').update(value).digest('hex');
function localUrl(value) {
  const url = new URL(value);
  assert.ok(['postgres:','postgresql:'].includes(url.protocol) && ['localhost','127.0.0.1','[::1]'].includes(url.hostname),
    'This destructive rehearsal requires explicit loopback PostgreSQL URLs');
  return url;
}
function pg(binary,url,args) {
  const executable = path.join(process.env.RECOVERY_TEST_PG_BIN ?? '',`${binary}${process.platform==='win32'?'.exe':''}`);
  execFileSync(executable,args,{ env:{...process.env,PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),
    PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:url.pathname.slice(1)},stdio:'pipe',timeout:60000 });
}

test('real historical dump restores erased accounts; atomic replay preserves survivors and restores privacy preferences', {
  skip:!process.env.RECOVERY_TEST_ADMIN_URL || !process.env.RECOVERY_TEST_SCHEMA_URL,
}, async () => {
  const adminUrl=localUrl(process.env.RECOVERY_TEST_ADMIN_URL), schemaUrl=localUrl(process.env.RECOVERY_TEST_SCHEMA_URL);
  const suffix=randomUUID().replaceAll('-',''), sourceName=`yor_recovery_source_${suffix}`, restoredName=`yor_recovery_target_${suffix}`;
  const sourceUrl=new URL(adminUrl), restoredUrl=new URL(adminUrl); sourceUrl.pathname=`/${sourceName}`; restoredUrl.pathname=`/${restoredName}`;
  const directory=await mkdtemp(path.join(tmpdir(),'yor-privacy-recovery-'));
  const admin=new Client({connectionString:adminUrl.href}); await admin.connect();
  let source,restored;
  try {
    await admin.query(`CREATE DATABASE "${sourceName}"`); await admin.query(`CREATE DATABASE "${restoredName}"`);
    const schema=path.join(directory,'schema.dump'), snapshot=path.join(directory,'before-erasure.dump');
    pg('pg_dump',schemaUrl,['--schema-only','--format=custom','--no-owner','--no-privileges',`--file=${schema}`]);
    pg('pg_restore',sourceUrl,['--dbname',sourceName,'--single-transaction','--no-owner','--no-privileges',schema]);
    source=new Client({connectionString:sourceUrl.href}); restored=new Client({connectionString:restoredUrl.href});
    await source.connect(); await restored.connect();
    const departing=randomUUID(),survivor=randomUUID(),restricted=randomUUID(),conversation=randomUUID(),authored=randomUUID(),retained=randomUUID();
    const email=`${departing}@example.test`, unbound='unbound-recovery@example.test', later='later-registration@example.test';
    for (const id of [departing,survivor,restricted]) await source.query(`INSERT INTO users(id,username,email,password_hash,full_name,email_verified)
      VALUES($1,$2,$3,'synthetic-only','Recovery fixture',true)`,[id,id,`${id}@example.test`]);
    await source.query(`INSERT INTO conversations(id,participant_a,participant_b,participant_ids,is_group)
      VALUES($1,$2,$3,$4,true)`,[conversation,departing,survivor,JSON.stringify([departing,survivor])]);
    await source.query('INSERT INTO conversation_members(conversation_id,user_id,role) VALUES($1,$2,\'admin\'),($1,$3,\'member\')',[conversation,departing,survivor]);
    await source.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content) VALUES($1,$2,$3,$4,'Erase me')`,[authored,conversation,departing,survivor]);
    await source.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content,reply_to_id,reactions)
      VALUES($1,$2,$3,$4,'Keep me',$5,$6)`,[retained,conversation,survivor,departing,authored,JSON.stringify({heart:[departing,survivor]})]);
    const ledger=randomUUID();
    await source.query('INSERT INTO ledger_transactions(id,credit_account_id,debit_account_id,amount_minor,reference_id) VALUES($1,$2,$3,100,$4)',[ledger,survivor,departing,randomUUID()]);
    const community=randomUUID();
    await source.query(`INSERT INTO communities(id,owner_id,name,slug,announcements) VALUES($1,$2,'Recovery community',$4,$3)`,
      [community,survivor,JSON.stringify([{id:'authored',authorId:departing,content:'Erase discussion'},
        {id:'retained',authorId:survivor,content:'Keep discussion',likedBy:[departing,survivor],likes:2}]),community]);
    for (const address of [unbound,later,email]) {
      await source.query(`INSERT INTO preregistrations(email,username,created_at) VALUES($1,$2,$3)`,
        [address,randomUUID(),address===later?'2026-02-01T00:00:00Z':'2026-01-01T00:00:00Z']);
      await source.query('INSERT INTO waitlist(id,email,created_at) VALUES($1,$2,$3)',[randomUUID(),address,address===later?'2026-02-01T00:00:00Z':'2026-01-01T00:00:00Z']);
      await source.query(`INSERT INTO consent_records(subject_digest,purpose,version,granted) VALUES($1,'launch_updates','recovery-test',true)`,[digest(address)]);
    }
    pg('pg_dump',sourceUrl,['--format=custom','--no-owner','--no-privileges',`--file=${snapshot}`]);
    const erasedAt='2026-01-15T00:00:00.000Z', eventId=randomUUID();
    await source.query('BEGIN');
    const user=(await source.query('SELECT id,email,email_verified AS "emailVerified" FROM users WHERE id=$1 FOR UPDATE',[departing])).rows[0];
    await eraseAccountData(accountErasureExecutor(source),user,{id:eventId,erasedAt});
    for (const address of [unbound,later]) {
      for (const table of ['preregistrations','waitlist']) await source.query(`DELETE FROM ${table} WHERE email=$1 AND created_at<=$2`,[address,erasedAt]);
      await source.query(`INSERT INTO deletion_journal(account_id,stable_identity_digest,erased_at) VALUES(NULL,$1,$2)`,[digest(address),erasedAt]);
      await source.query(`INSERT INTO email_suppressions(email_hash,purpose,reason,suppressed_at) VALUES($1,'all_promotional','verified_erasure',$2)`,[digest(address),erasedAt]);
    }
    // Keep the source checkpoint deterministic; all fixture events precede it.
    await source.query('UPDATE email_suppressions SET suppressed_at=$1',[erasedAt]);
    await source.query('UPDATE users SET processing_restricted=true WHERE id=$1',[restricted]);
    await source.query('COMMIT');
    const exported=await exportPrivacyManifest(source,sourceName);
    const manifest=validateDeletionManifest(exported.bytes,{expectedSha256:exported.sha256,expectedThrough:exported.through});
    assert.ok(!exported.bytes.toString().includes(email));
    pg('pg_restore',restoredUrl,['--dbname',restoredName,'--single-transaction','--no-owner','--no-privileges',snapshot]);
    await assert.rejects(verifyRestoredDeletions(restored,manifest,restoredName),/keep it isolated/);
    await assert.rejects(replayRestoredDeletions(restored,manifest,'wrong_target',{manifestSha256:exported.sha256}),/recovery target/);
    await restored.query('CREATE TABLE recovery_guard(id uuid REFERENCES users(id))');
    await restored.query('INSERT INTO recovery_guard VALUES($1)',[departing]);
    await assert.rejects(replayRestoredDeletions(restored,manifest,restoredName,{manifestSha256:exported.sha256}));
    assert.equal((await restored.query('SELECT count(*)::integer AS count FROM messages')).rows[0].count,2);
    assert.equal((await restored.query('SELECT 1 FROM recovery_replay_log')).rowCount,0);
    await restored.query('DROP TABLE recovery_guard');
    const result=await replayRestoredDeletions(restored,manifest,restoredName,{manifestSha256:exported.sha256});
    assert.equal(result.replayedAccounts,1); assert.equal(result.replayedUnbound,2);
    await verifyRestoredDeletions(restored,manifest,restoredName);
    const message=(await restored.query('SELECT * FROM messages WHERE id=$1',[retained])).rows[0];
    assert.equal(message.content,'Keep me'); assert.equal(message.reply_to_id,null); assert.deepEqual(message.reactions,{heart:[survivor]});
    const survivingLedger=(await restored.query('SELECT * FROM ledger_transactions WHERE id=$1',[ledger])).rows[0];
    assert.equal(survivingLedger.credit_account_id,survivor); assert.equal(survivingLedger.debit_account_id,null);
    const discussions=(await restored.query('SELECT announcements FROM communities WHERE id=$1',[community])).rows[0].announcements;
    assert.equal(discussions.length,1); assert.deepEqual(discussions[0].likedBy,[survivor]);
    assert.equal((await restored.query('SELECT 1 FROM preregistrations WHERE email=$1',[unbound])).rowCount,0);
    assert.equal((await restored.query('SELECT 1 FROM preregistrations WHERE email=$1',[email])).rowCount,0);
    assert.equal((await restored.query('SELECT 1 FROM preregistrations WHERE email=$1',[later])).rowCount,1);
    assert.equal((await restored.query('SELECT processing_restricted FROM users WHERE id=$1',[restricted])).rows[0].processing_restricted,true);
    assert.equal((await restored.query('SELECT 1 FROM consent_records WHERE granted=true')).rowCount,0);
    assert.equal((await restored.query('SELECT erased_at FROM deletion_journal WHERE id=$1',[eventId])).rows[0].erased_at.toISOString(),erasedAt);
    assert.equal((await restored.query('SELECT 1 FROM recovery_replay_log WHERE manifest_sha256=$1',[exported.sha256])).rowCount,1);
    await restored.query("UPDATE background_jobs SET status='complete',payload='{}' WHERE dedup_key=$1",[`account:${departing}`]);
    await restored.query('UPDATE messages SET reactions=$2 WHERE id=$1',[retained,JSON.stringify({heart:[departing,survivor]})]);
    assert.equal((await replayRestoredDeletions(restored,manifest,restoredName,{manifestSha256:exported.sha256})).replayedAccounts,0);
    assert.equal((await restored.query('SELECT 1 FROM deletion_journal')).rowCount,3);
    assert.deepEqual((await restored.query('SELECT reactions FROM messages WHERE id=$1',[retained])).rows[0].reactions,{heart:[survivor]});
    const cleanup=(await restored.query('SELECT status,payload FROM background_jobs WHERE dedup_key=$1',[`account:${departing}`])).rows[0];
    assert.equal(cleanup.status,'pending'); assert.equal(cleanup.payload.emailHash,digest(email));
  } finally {
    await source?.end().catch(()=>{}); await restored?.end().catch(()=>{});
    for (const name of [sourceName,restoredName]) {
      assert.match(name,/^yor_recovery_(source|target)_[a-f0-9]{32}$/);
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    }
    await admin.end();
    assert.equal(path.dirname(directory),tmpdir());
    await rm(directory,{recursive:true,force:true});
  }
});
