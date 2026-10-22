import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { pool } from '@workspace/db';
import { streamAccountExport, AccountExportNotFoundError, ACCOUNT_EXPORT_USER_FK_DECISIONS, ACCOUNT_EXPORT_COLLECTIONS, buildAccountExportPageQuery } from '../services/account-export.js';
import { AccountService } from '../services/account-service.js';
import { UserController } from '../controllers/user-controller.js';
import { UserRepository } from '../repositories/user-repository.js';
import type { AuthService } from '../services/auth-service.js';
import type { UserService } from '../services/user-service.js';
import type { RedisRepository } from '../repositories/redis-repository.js';
import { createTestUser } from './test-helpers.js';

after(() => pool.end());
async function fixtures(t: TestContext) {
  const users = new UserRepository();
  const owner = await createTestUser(users, { passwordHash: 'private-password-marker', totpSecret: 'private-totp-marker',
    contactIdentityDigest: 'private-digest-marker', googleSubject: `private-google-${randomUUID()}` });
  const other = await createTestUser(users, { bio: 'private-unrelated-bio-marker' });
  t.after(async () => { await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[owner.id,other.id]]); });
  return { users, owner, other };
}
async function read(userId: string, pageSize = 2) {
  let text = '';
  for await (const chunk of streamAccountExport(userId,{pageSize})) text += chunk;
  return JSON.parse(text);
}

test('private-chat exports contain participant ciphertext and only the subjects public identity', async t => {
  const { users, owner, other } = await fixtures(t);
  const outsider = await createTestUser(users);
  t.after(() => pool.query('DELETE FROM users WHERE id=$1', [outsider.id]));
  for (const [index, user] of [owner, other, outsider].entries()) {
    await pool.query(`INSERT INTO private_chat_identities(user_id,public_key,fingerprint) VALUES($1,$2,$3)`,
      [user.id, `-----BEGIN PGP PUBLIC KEY BLOCK-----\n${'public-fixture-'.repeat(10)}${index}`, String(index + 1).repeat(64)]);
  }
  const shared = randomUUID(), unrelated = randomUUID();
  const pair = [owner.id, other.id].sort(), otherPair = [other.id, outsider.id].sort();
  await pool.query(`INSERT INTO private_chat_threads(id,user_a_id,user_b_id) VALUES($1,$2,$3),($4,$5,$6)`,
    [shared, ...pair, unrelated, ...otherPair]);
  const encrypted = `-----BEGIN PGP MESSAGE-----\n${'opaque-fixture-'.repeat(10)}`;
  await pool.query(`INSERT INTO private_chat_envelopes(id,thread_id,sender_id,ciphertext) VALUES($1,$2,$3,$4),($5,$6,$3,$7)`,
    [randomUUID(), shared, other.id, encrypted, randomUUID(), unrelated, `${encrypted}-unrelated`]);
  const archive = await read(owner.id, 1);
  assert.equal(archive.content.privateChatEnvelopes.length, 1);
  assert.equal(archive.content.privateChatEnvelopes[0].ciphertext, encrypted);
  assert.deepEqual(archive.content.privateChatThreads.map((row: { id: string }) => row.id), [shared]);
  assert.deepEqual(archive.content.privateChatPublicIdentity.map((row: { userId: string }) => row.userId), [owner.id]);
  assert.equal(JSON.stringify(archive).includes(`${encrypted}-unrelated`), false);
  assert.equal(Object.hasOwn(archive.content.privateChatEnvelopes[0], 'content'), false);
});

test('message archives omit shared legacy receipts while retaining the subjects own read records', async t => {
  const { owner, other } = await fixtures(t);
  const conversation = randomUUID(), sent = randomUUID(), received = randomUUID();
  await pool.query(`INSERT INTO conversations(id,participant_a,participant_b) VALUES($1,$2,$3)`,
    [conversation, owner.id, other.id]);
  await pool.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content,seen_at) VALUES
    ($1,$2,$3,$4,'Sent message',now()), ($5,$2,$4,$3,'Received message',now())`,
    [sent, conversation, owner.id, other.id, received]);
  await pool.query(`INSERT INTO message_reads(message_id,user_id,read_at) VALUES($1,$2,now()),($3,$4,now())`,
    [sent, other.id, received, owner.id]);
  const archive = await read(owner.id);
  assert.equal(archive.content.sentMessages[0].id, sent);
  assert.equal(archive.content.receivedMessages[0].id, received);
  for (const message of [...archive.content.sentMessages, ...archive.content.receivedMessages]) {
    assert.equal(Object.hasOwn(message, 'seenAt'), false, 'a retained other-reader timestamp is never an export grant');
  }
  assert.deepEqual(archive.activity.messageReads.map((row: { messageId: string; userId: string }) =>
    [row.messageId, row.userId]), [[received, owner.id]]);
  assert.ok(archive.activity.messageReads[0].readAt);
});

test('consent, rights requests and moderation exports include subject records without internal evidence', async t => {
  const { owner, other } = await fixtures(t);
  const decisionId = randomUUID();
  const rightsIds = [randomUUID(), randomUUID()];
  t.after(async () => {
    await pool.query('DELETE FROM moderation_decisions WHERE id=$1', [decisionId]);
    await pool.query('DELETE FROM privacy_rights_requests WHERE id=ANY($1::uuid[])', [rightsIds]);
  });
  await pool.query(`INSERT INTO moderation_decisions(id,target_type,target_id,action,actor_id,rationale,internal_notes)
    VALUES($1,'user',$2,'no_action',$3,'A subject-facing decision','internal-decision-marker')`, [decisionId, owner.id, other.id]);
  for (const [index, subject] of [owner, other].entries()) {
    await pool.query(`INSERT INTO consent_records(subject_id,subject_digest,purpose,version,granted,metadata)
      VALUES($1,'identity-digest-marker','optional_analytics','v1',$2,'{"internal":"consent-metadata-marker"}')`, [subject.id, index === 0]);
    await pool.query(`INSERT INTO privacy_rights_requests(id,subject_id,email_hash,request_type,status,verification_token_hash,details)
      VALUES($1,$2,'email-hash-marker','access','verified',$3,'{"internal":"rights-details-marker"}')`,
      [rightsIds[index], subject.id,`verification-token-marker-${rightsIds[index]}`]);
    await pool.query(`INSERT INTO moderation_decision_notices(id,decision_id,recipient_user_id,recipient_role,target_type,target_id,safe_summary,action)
      VALUES($1,$2,$3::uuid,'affected_party','user',$3::text,$4,'no_action')`, [randomUUID(), decisionId, subject.id, `safe-notice-${index}`]);
    await pool.query(`INSERT INTO moderation_appeals(id,decision_id,appellant_user_id,relationship,statement,reviewer_id,reviewer_notes)
      VALUES($1,$2,$3,'affected_party',$4,$5,'internal-review-marker')`,
      [randomUUID(), decisionId, subject.id, `My submitted appeal ${index}`, other.id]);
  }
  const archive = await read(owner.id);
  assert.equal(archive.safety.consentRecords.length, 1);
  assert.equal(archive.safety.consentRecords[0].granted, true);
  assert.equal(archive.safety.privacyRightsRequests.length, 1);
  assert.equal(archive.safety.privacyRightsRequests[0].requestType, 'access');
  assert.deepEqual(archive.safety.moderationNotices.map((row: { safeSummary: string }) => row.safeSummary), ['safe-notice-0']);
  assert.deepEqual(archive.safety.moderationAppeals.map((row: { statement: string }) => row.statement), ['My submitted appeal 0']);
  for (const hidden of ['identity-digest-marker', 'consent-metadata-marker', 'email-hash-marker', 'verification-token-marker',
    'rights-details-marker', 'internal-decision-marker', 'internal-review-marker', 'safe-notice-1', 'My submitted appeal 1']) {
    assert.equal(JSON.stringify(archive).includes(hidden), false, hidden);
  }
});

test('every migrated user foreign key has an explicit export or privacy exclusion decision', async () => {
  const { rows } = await pool.query<{key:string}>(`SELECT DISTINCT c.conrelid::regclass::text||'.'||a.attname AS key
    FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
    WHERE c.contype='f' AND c.confrelid='users'::regclass ORDER BY key`);
  assert.deepEqual(rows.map(row=>row.key),Object.keys(ACCOUNT_EXPORT_USER_FK_DECISIONS).sort());
  for (const [key,reason] of Object.entries(ACCOUNT_EXPORT_USER_FK_DECISIONS)) assert.ok(reason.length>20,key);
  assert.equal(new Set(ACCOUNT_EXPORT_COLLECTIONS.map(item=>`${item.section}.${item.name}`)).size,ACCOUNT_EXPORT_COLLECTIONS.length);
});

test('native cursor types match the catalog and common subject pages can seek through ordered indexes', async t => {
  const { owner } = await fixtures(t);
  const catalog = await pool.query<{ table_name: string; column_name: string; type: string }>(`SELECT c.relname AS table_name,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS type
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=current_schema() AND a.attnum>0 AND NOT a.attisdropped`);
  const available=await pool.query<{tablename:string;indexdef:string}>(`SELECT tablename,indexdef FROM pg_indexes WHERE schemaname=current_schema()`);
  for (const item of ACCOUNT_EXPORT_COLLECTIONS) {
    for (const key of item.keys) {
      const match = key.expression.match(/^t\.([a-z_]+)$/);
      if (match) assert.equal(catalog.rows.find(row=>row.table_name===item.table && row.column_name===match[1])?.type,key.type,`${item.name}: ${key.expression}`);
    }
  }
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    // A small isolated fixture often favors a sequential scan. This checks that
    // an ordered index seek is available, not a production load benchmark.
    await client.query('SET LOCAL enable_seqscan=off');
    await client.query('SET LOCAL enable_bitmapscan=off');
    await client.query('SET LOCAL enable_sort=off');
    for (const name of ['posts','bookmarks','followRequests']) {
      const item=ACCOUNT_EXPORT_COLLECTIONS.find(item=>item.name===name)!;
      const query=buildAccountExportPageQuery(item,owner.id,new Date().toISOString(),[randomUUID()],2);
      assert.doesNotMatch(query.text,/jsonb_build_array\([^\n]+\)\s*>/);
      const plan=await client.query(`EXPLAIN (FORMAT JSON) ${query.text}`,query.values);
      const indexes: Record<string,unknown>[]=[];
      const visit=(node:Record<string,unknown>)=>{ if(node['Index Cond']) indexes.push(node); for(const child of node.Plans as Record<string,unknown>[]??[]) visit(child); };
      visit(plan.rows[0]['QUERY PLAN'][0].Plan);
      const scopes=item.scopes??[item.where];
      for (const scope of scopes) {
        const ownerColumn=scope.match(/^t\.([a-z_]+)=/)![1];
        assert.ok(available.rows.some(row=>row.tablename===item.table && row.indexdef.includes(`(${ownerColumn}, ${item.keys[0].expression.slice(2)})`)),`${name}: ordered subject/cursor index exists`);
      }
      // PostgreSQL can prefer the smaller primary index for nearly empty
      // fixtures. The native range must remain an Index Cond in either plan.
      assert.ok(indexes.some(node=>String(node['Index Cond']).includes(' > ')),`${name}: native cursor remains an index condition: ${JSON.stringify(plan.rows)}`);
    }
  } finally { await client.query('ROLLBACK'); client.release(); }
});

test('a database disconnect while the archive consumer is paused is handled and releases its connection', async t => {
  const { owner }=await fixtures(t);
  const before=await pool.query<{pid:number}>(`SELECT pid FROM pg_stat_activity WHERE application_name='yor-account-export'`);
  const previous=new Set(before.rows.map(row=>row.pid));
  const stream=streamAccountExport(owner.id);
  await stream.next();
  try {
    const active=await pool.query<{pid:number}>(`SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND application_name='yor-account-export' AND state='idle in transaction'`);
    const targets=active.rows.filter(row=>!previous.has(row.pid));
    assert.equal(targets.length,1,'only this test archive is terminated');
    await pool.query('SELECT pg_terminate_backend($1)',[targets[0].pid]);
    // Let pg deliver the asynchronous error while the generator is suspended.
    await new Promise(resolve=>setTimeout(resolve,100));
    await assert.rejects(stream.next(),/terminat|connection|closed/i);
    assert.equal((await pool.query('SELECT 1 AS healthy')).rows[0].healthy,1);
    assert.equal(pool.waitingCount,0);
  } finally { await stream.return(undefined); }
});

test('version 2 includes authored domains and canonical group messages without unrelated private data or grants', async t => {
  const { owner, other } = await fixtures(t);
  const video=randomUUID(), article=randomUUID(), note=randomUUID(), highlight=randomUUID(), project=randomUUID(), business=randomUUID(), workspace=randomUUID(), community=randomUUID(), discussion=randomUUID(), channel=randomUUID(), channelMessage=randomUUID(), conversation=randomUUID(), groupMessage=randomUUID(), unrelatedMessage=randomUUID(), order=randomUUID(), receivedComment=randomUUID();
  const dispute=`dispute-${order}`, unrelatedDispute=`unrelated-${order}`, payment=`payment-${order}`;
  t.after(async()=>{
    await pool.query('DELETE FROM payment_dispute_history WHERE dispute_id=ANY($1::text[])',[[dispute,unrelatedDispute]]);
    await pool.query('DELETE FROM payment_disputes WHERE id=ANY($1::text[])',[[dispute,unrelatedDispute]]);
    await pool.query('DELETE FROM marketplace_orders WHERE id=$1',[order]);
  });
  await pool.query(`INSERT INTO videos(id,author_id,video_url,thumbnail_url,title,type,liked_by) VALUES($1,$2,'media:11111111-1111-4111-8111-111111111111','','Own video','video',$3)`,[video,owner.id,JSON.stringify([other.id])]);
  await pool.query(`INSERT INTO articles(id,author_id,title,excerpt,content,cover_url) VALUES($1,$2,'Own article','Excerpt','Article body','https://provider.test/private-signed-link')`,[article,owner.id]);
  await pool.query(`INSERT INTO user_notes(id,author_id,content,expires_at) VALUES($1,$2,'Own note',now()+interval '1 day')`,[note,owner.id]);
  await pool.query(`INSERT INTO highlights(id,owner_id,title) VALUES($1,$2,'Own highlight')`,[highlight,owner.id]);
  await pool.query(`INSERT INTO projects(id,owner_id,title,description) VALUES($1,$2,'Own project','Private project draft')`,[project,owner.id]);
  await pool.query(`INSERT INTO business_profiles(id,owner_id,name,industry) VALUES($1,$2,'Own business','Software')`,[business,owner.id]);
  await pool.query(`INSERT INTO creator_workspace_items(id,owner_id,kind,item_key,payload) VALUES($1,$2,'draft','draft-key','{"text":"Private draft content"}')`,[workspace,owner.id]);
  await pool.query(`INSERT INTO profile_comments(id,profile_id,author_id,content) VALUES($1,$2,$3,'Received profile comment')`,[receivedComment,owner.id,other.id]);
  await pool.query(`INSERT INTO communities(id,owner_id,name,slug,announcements) VALUES($1,$2,'Community',$3,$4)`,[community,other.id,`export-${community}`,JSON.stringify([{id:discussion,authorId:owner.id,title:'Own discussion',content:'Own embedded content',likedBy:[other.id]},{id:randomUUID(),authorId:other.id,title:'Unrelated hidden discussion',content:'private-unrelated-discussion-marker'}])]);
  await pool.query(`INSERT INTO broadcast_channels(id,owner_id,name) VALUES($1,$2,'Own channel')`,[channel,owner.id]);
  await pool.query(`INSERT INTO broadcast_channel_messages(id,channel_id,author_id,content) VALUES($1,$2,$3,'Own broadcast')`,[channelMessage,channel,owner.id]);
  await pool.query(`INSERT INTO conversations(id,participant_a,participant_b,is_group,title) VALUES($1,$2,$2,true,'Group archive')`,[conversation,other.id]);
  await pool.query(`INSERT INTO conversation_members(conversation_id,user_id) VALUES($1,$2),($1,$3)`,[conversation,owner.id,other.id]);
  await pool.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content) VALUES($1,$2,$3,$3,'Group received content')`,[groupMessage,conversation,other.id]);
  const unrelatedConversation=randomUUID();
  await pool.query(`INSERT INTO conversations(id,participant_a,participant_b,is_group) VALUES($1,$2,$2,true)`,[unrelatedConversation,other.id]);
  await pool.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content) VALUES($1,$2,$3,$3,'private-unrelated-message-marker')`,[unrelatedMessage,unrelatedConversation,other.id]);
  await pool.query(`INSERT INTO marketplace_orders(id,buyer_id,seller_id,provider_order_id,provider_payment_id,amount_minor,shipping_name,shipping_address,shipping_phone,provider_signature,product_snapshot)
    VALUES($1,$2,$3,$4,$5,500,'Other buyer','private-buyer-address-marker','private-buyer-phone-marker','private-provider-signature-marker','{"title":"Retained purchased item"}')`,[order,other.id,owner.id,`export-${order}`,payment]);
  await pool.query(`INSERT INTO payment_disputes(id,payment_id,status,amount_minor,currency) VALUES($1,$2,'open',500,'INR'),($3,'unrelated-private-payment','open',500,'INR')`,[dispute,payment,unrelatedDispute]);
  await pool.query(`INSERT INTO payment_dispute_history(dispute_id,snapshot_hash,status,amount_deducted) VALUES($1,'private-provider-snapshot-marker','open',0)`,[dispute]);

  const exported=await read(owner.id);
  assert.equal(exported.version,2);
  for (const [category,id] of [['videos',video],['articles',article],['notes',note],['highlights',highlight],['communityDiscussions',discussion],['broadcastChannels',channel],['broadcastMessages',channelMessage],['receivedMessages',groupMessage]]) {
    assert.equal(exported.content[category].some((row:{id:string})=>row.id===id),true,category);
  }
  assert.equal(exported.creator.workspace[0]?.id,workspace);
  assert.equal(exported.creator.projects[0]?.id,project);
  assert.equal(exported.creator.businesses[0]?.id,business);
  assert.equal(exported.content.receivedProfileComments[0]?.id,receivedComment);
  assert.deepEqual(exported.commerce.paymentDisputes.map((row:{id:string})=>row.id),[dispute]);
  assert.equal(exported.commerce.disputeHistory[0]?.disputeId,dispute);
  assert.equal(exported.relationships.conversations[0]?.id,conversation);
  assert.equal(exported.content.articles[0]?.coverUrl,null,'legacy provider URLs cannot become export access grants');
  assert.equal(exported.content.videos[0]?.videoUrl,'media:11111111-1111-4111-8111-111111111111');
  assert.equal('likedBy' in exported.content.videos[0],false);
  assert.equal('shippingAddress' in exported.marketplaceOrders[0],false);
  assert.equal(exported.marketplaceOrders[0].productSnapshot.title,'Retained purchased item');
  assert.doesNotMatch(JSON.stringify(exported),/private-password-marker|private-totp-marker|private-digest-marker|private-google-|private-provider-signature-marker|private-provider-snapshot-marker|private-buyer-address-marker|private-buyer-phone-marker|private-unrelated-|private-signed-link|unrelated-private-payment/);
  const buyer=await read(other.id);
  assert.equal(buyer.marketplaceOrders[0].shippingAddress,'private-buyer-address-marker');
  assert.deepEqual(buyer.interactions.videosLikes.map((row:{id:string})=>row.id),[video]);
});

test('indexed legacy reaction and discussion scopes retain complete compound keyset pages', async t => {
  const { owner,other }=await fixtures(t);
  const ids=Array.from({length:5},()=>randomUUID()).sort();
  for(const id of ids) await pool.query(`INSERT INTO posts(id,author_id,content,reactions) VALUES($1,$2,'Private unrelated post',$3)`,
    [id,other.id,JSON.stringify({like:[owner.id,other.id],wave:[owner.id],private:[other.id]})]);
  const community=randomUUID(), discussionIds=Array.from({length:5},()=>randomUUID()).sort();
  await pool.query(`INSERT INTO communities(id,owner_id,name,slug,announcements) VALUES($1::uuid,$2,'Discussion fixture',$1::text,$3)`,
    [community,other.id,JSON.stringify(discussionIds.map(id=>({id,authorId:owner.id,content:'Own contribution'})))]);
  const data=await read(owner.id,2);
  assert.deepEqual(data.interactions.postsReactions,ids.flatMap(entityId=>[{entityId,reaction:'like'},{entityId,reaction:'wave'}]));
  assert.deepEqual(data.content.communityDiscussions.map((row:{id:string})=>row.id),discussionIds);
  assert.deepEqual(data.content.posts,[]);
  assert.doesNotMatch(JSON.stringify(data),/Private unrelated post/);
});

test('archives retain submitted external video links without exposing provider delivery URLs', async t => {
  const { owner }=await fixtures(t);
  const externalId=randomUUID(), privateId=randomUUID();
  await pool.query(`INSERT INTO videos(id,author_id,title,type,video_url,thumbnail_url) VALUES
    ($1,$3,'External fixture','standard','https://youtu.be/own-contribution','https://storage.test/private-poster-token'),
    ($2,$3,'Legacy fixture','standard','https://storage.test/private-delivery-token','')`,[externalId,privateId,owner.id]);
  const data=await read(owner.id);
  assert.equal(data.content.videos.find((video:{id:string})=>video.id===externalId).videoUrl,'https://youtu.be/own-contribution');
  assert.equal(data.content.videos.find((video:{id:string})=>video.id===privateId).videoUrl,null);
  assert.doesNotMatch(JSON.stringify(data),/private-poster-token|private-delivery-token/);
});

test('keyset pages form one stable snapshot and generator cancellation releases the transaction', async t => {
  const { owner }=await fixtures(t);
  const ids=Array.from({length:5},()=>randomUUID()).sort();
  for (const id of ids) await pool.query(`INSERT INTO posts(id,author_id,content) VALUES($1,$2,'Snapshot original')`,[id,owner.id]);
  const stream=streamAccountExport(owner.id,{pageSize:2});
  const first=await stream.next();
  assert.equal(first.done,false);
  await pool.query(`UPDATE posts SET content='Changed after snapshot' WHERE id=$1`,[ids[0]]);
  const late=randomUUID();
  await pool.query(`INSERT INTO posts(id,author_id,content) VALUES($1,$2,'Late post')`,[late,owner.id]);
  const chunks=[first.value!];
  for await (const chunk of stream) chunks.push(chunk);
  const exported=JSON.parse(chunks.join(''));
  assert.deepEqual(exported.content.posts.map((row:{id:string})=>row.id),ids);
  assert.equal(exported.content.posts[0].content,'Snapshot original');
  assert.equal(chunks.filter(chunk=>ids.some(id=>chunk.includes(id))).length,5,'rows are yielded separately across keyset pages');

  const cancelled=streamAccountExport(owner.id);
  await cancelled.next();
  await cancelled.return(undefined);
  const abort=new AbortController(), aborted=streamAccountExport(owner.id,{signal:abort.signal});
  await aborted.next();
  abort.abort();
  await assert.rejects(aborted.next(),{name:'AbortError'});
  const { rows }=await pool.query(`SELECT pid FROM pg_stat_activity WHERE application_name='yor-account-export' AND state='idle in transaction'`);
  assert.deepEqual(rows,[]);
});

test('HTTP export streams the existing envelope and checks missing users before attachment headers', async t => {
  const { owner }=await fixtures(t);
  const controller=new UserController({} as UserService,{} as AuthService,new AccountService(new UserRepository(),{} as RedisRepository));
  const app=express();
  app.get('/export/:userId',(req,res)=>{req.user={id:req.params.userId,role:'user',permissions:[]};void controller.exportAccount(req,res);});
  const server=app.listen(0,'127.0.0.1');
  await new Promise<void>(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
  const address=server.address();
  assert.ok(address && typeof address!=='string');
  const response=await fetch(`http://127.0.0.1:${address.port}/export/${owner.id}`);
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-disposition')??'',/attachment/);
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  const data=await response.json() as {success:boolean;data:{version:number;account:{id:string}}};
  assert.equal(data.success,true);
  assert.equal(data.data.version,2);
  assert.equal(data.data.account.id,owner.id);
  const missing=await fetch(`http://127.0.0.1:${address.port}/export/${randomUUID()}`);
  assert.equal(missing.status,404);
  assert.equal(missing.headers.get('content-disposition'),null);
  assert.equal((await missing.json() as {success:boolean}).success,false);
  await assert.rejects(async()=>{for await(const _chunk of streamAccountExport(randomUUID())){}},AccountExportNotFoundError);
});
