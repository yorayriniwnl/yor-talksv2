import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import express from 'express';
import jwt from 'jsonwebtoken';
import { io as connect, type Socket } from 'socket.io-client';
import { pool, runInDatabaseTransaction } from '@workspace/db';
import { sql } from 'drizzle-orm';
import { env } from '../config/env.js';
import { UserRepository } from '../repositories/user-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { ConversationRepository, MessageRepository } from '../repositories/message-repository.js';
import { MessageService, MessageUnavailableError } from '../services/message-service.js';
import { AccountService } from '../services/account-service.js';
import { mediaResponse, hydrateMediaValue, currentMessageResponse } from '../services/media-response.js';
import { MediaDeliveryService, mediaDeliveryUrl } from '../services/media-delivery.js';
import { MediaLifecycleError } from '../services/media-service.js';
import { createTestApprovedMedia } from './media-fixtures.js';
import { createTestUser } from './test-helpers.js';
import { authenticate, closeAuthenticationDependencies } from '../middlewares/auth.js';
import { errorHandler } from '../middlewares/error-handler.js';
import { attachSocketServer } from '../socket/index.js';
import messageRouter from '../routes/messages.js';
import mediaRouter from '../routes/media.js';
import { closeRateLimitRedis } from '../middlewares/rate-limit.js';
import type { MediaProvider } from '../services/media-provider.js';
import { assertIsolatedPostgres } from '../../../ops/test-infrastructure-guard.mjs';

const users=new UserRepository(),redis=new RedisRepository(),conversations=new ConversationRepository(),messages=new MessageRepository();
const service=new MessageService(conversations,messages,users),accounts=new AccountService(users,redis);
const userIds:string[]=[],conversationIds:string[]=[],mediaIds:string[]=[],clients:Socket[]=[];
const app=express();app.use(express.json());app.use(mediaResponse);app.use('/api',messageRouter);app.use('/api',mediaRouter);
app.get('/api/users/me/export',authenticate,async(req,res)=>res.json({data:await accounts.exportAccount(req.user!.id)}));
app.use(errorHandler);
const server=createServer(app);
let base:string, sockets:Awaited<ReturnType<typeof attachSocketServer>>;
const previousBeta=env.PUBLIC_BETA;

before(async()=>{
  // Explicit infrastructure, exact database identity, and loopback are required
  // before this file writes synthetic fixtures. No default .env database.
  assert.equal(process.env.NODE_ENV,'test');assert.ok(process.env.DATABASE_URL);assert.ok(process.env.REDIS_URL);
  assertIsolatedPostgres(process.env);
  const identity=(await pool.query('SELECT current_database() AS database,inet_server_port() AS port')).rows[0];
  assertIsolatedPostgres(process.env,identity);
  env.PUBLIC_BETA=true;sockets=await attachSocketServer(server);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert.ok(address&&typeof address!=='string');base=`http://127.0.0.1:${address.port}/api`;
});
after(async()=>{
  env.PUBLIC_BETA=previousBeta;clients.forEach(client=>client.disconnect());
  if(sockets)await new Promise<void>(resolve=>sockets.close(()=>resolve()));
  // Fixture-only deletion: keep migration state and unrelated data intact.
  if(conversationIds.length)await pool.query('DELETE FROM conversations WHERE id=ANY($1::uuid[])',[conversationIds]);
  if(userIds.length)await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[userIds]);
  if(mediaIds.length)await pool.query('DELETE FROM media_assets WHERE id=ANY($1::uuid[])',[mediaIds]);
  await Promise.all([redis.disconnect(),closeAuthenticationDependencies(),closeRateLimitRedis()]);await pool.end();
});
async function person(){
  const user=await createTestUser(users,{passwordHash:await bcrypt.hash('synthetic-password',4),termsVersion:env.TERMS_VERSION,
    termsAcceptedAt:new Date().toISOString(),ageConfirmedAt:new Date().toISOString()});userIds.push(user.id);
  const deviceId=randomUUID();await redis.setStrict(`session:${user.id}:${deviceId}`,'active',600);
  const token=jwt.sign({sub:user.id,deviceId,type:'access',authVersion:user.authVersion??0},env.JWT_SECRET,{expiresIn:600});
  await pool.query(`INSERT INTO user_feature_overrides(user_id,feature_key,enabled,expires_at) VALUES($1,'MESSAGE_UNREAD_PREVIEW',true,now()+interval '1 hour')`,[user.id]);
  return {user,token};
}
async function direct(){const sender=await person(),recipient=await person(),conversation=await service.createConversation(sender.user.id,recipient.user.id);conversationIds.push(conversation.id);return {sender,recipient,conversation};}
async function request(path:string,token:string,method='GET',body?:unknown){return fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});}
async function data(response:Response):Promise<any>{return (await response.json() as {data:unknown}).data;}
function event(client:Socket,name:string){return new Promise<any>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Missing ${name}`)),5000);client.once(name,value=>{clearTimeout(timer);resolve(value);});});}
async function socket(token:string){const client=connect(base.replace(/\/api$/,''),{autoConnect:false,reconnection:false,transports:['websocket'],auth:{token}});clients.push(client);const ready=event(client,'connect');client.connect();await ready;return client;}

test('retained expired and deleted rows are unavailable to every HTTP/read/export/mutation path with workers stopped',async()=>{
  const {sender,recipient,conversation}=await direct();
  const expired=await service.sendMessageToConversation(sender.user.id,conversation.id,'retained expiry secret');
  const deleted=await service.sendMessageToConversation(sender.user.id,conversation.id,'retained deletion secret');
  await pool.query(`UPDATE messages SET expires_at=clock_timestamp() WHERE id=$1`,[expired.id]);
  await pool.query(`UPDATE messages SET deleted_at=clock_timestamp() WHERE id=$1`,[deleted.id]);
  for(const hidden of [expired,deleted]){
    assert.equal(await messages.findById(hidden.id),undefined);
    assert.ok(await messages.findRetainedById(hidden.id),'test must preserve retained rows');
    assert.equal(await service.previewMessage(hidden.id,recipient.user.id),undefined);
    assert.equal((await request(`/messages/${hidden.id}/preview`,recipient.token,'POST')).status,404);
    for(const [method,path,body]of [['POST',`/messages/${hidden.id}/seen`,{}],['PUT',`/messages/${hidden.id}`,{content:'edited'}],
      ['POST',`/messages/${hidden.id}/reactions`,{reaction:'heart'}],['POST',`/messages/${hidden.id}/pin`,{}]] as const){
      const response=await request(path,sender.token,method,body);assert.equal(await data(response),null);
    }
    await assert.rejects(()=>service.sendMessageToConversation(sender.user.id,conversation.id,'retry',{idempotencyKey:hidden.id}),MessageUnavailableError);
    assert.equal((await request('/messages',sender.token,'POST',{conversationId:conversation.id,content:'retry',idempotencyKey:hidden.id})).status,410);
  }
  assert.deepEqual(await data(await request(`/conversations/${conversation.id}/messages`,recipient.token)),[]);
  const inbox=await data(await request('/conversations',recipient.token));assert.equal(inbox.find((row:any)=>row.conversation.id===conversation.id).lastMessage,undefined);
  for(const account of [sender,recipient]){const exported=await data(await request('/users/me/export',account.token));assert.deepEqual(exported.content.sentMessages,[]);assert.deepEqual(exported.content.receivedMessages,[]);}
  assert.equal((await pool.query('SELECT count(*)::int n FROM messages WHERE conversation_id=$1',[conversation.id])).rows[0].n,2);
});

test('expiration remains strict at the database boundary and independent of connection timezone',async()=>{
  const {sender,conversation}=await direct(),message=await service.sendMessageToConversation(sender.user.id,conversation.id,'database clock');
  await pool.query("UPDATE messages SET expires_at=(clock_timestamp() AT TIME ZONE 'UTC')+interval '5 minutes' WHERE id=$1",[message.id]);
  await runInDatabaseTransaction(async tx=>{
    await tx.execute(sql`SET LOCAL TIME ZONE 'Asia/Kolkata'`);
    assert.ok(await messages.findById(message.id));
  });
  await pool.query("UPDATE messages SET expires_at=clock_timestamp() AT TIME ZONE 'UTC' WHERE id=$1",[message.id]);
  await runInDatabaseTransaction(async tx=>{
    await tx.execute(sql`SET LOCAL TIME ZONE 'Asia/Kolkata'`);
    assert.equal(await messages.findById(message.id),undefined);
  });
});

test('deletion and read-triggered vanish return only allowlisted tombstones over HTTP and sockets',async()=>{
  const {sender,recipient,conversation}=await direct(),client=await socket(recipient.token);
  const message=await service.sendMessageToConversation(sender.user.id,conversation.id,'body never in deletion response');
  const received=event(client,'message:update');
  const tombstone=await data(await request(`/messages/${message.id}`,sender.token,'DELETE'));
  assert.deepEqual(Object.keys(tombstone).sort(),['conversationId','deletedAt','expiresAt','id','seenAt','tombstone']);
  assert.deepEqual(await received,tombstone);
  await service.setVanishMode(conversation.id,sender.user.id,true);
  const vanished=await service.sendMessageToConversation(sender.user.id,conversation.id,'body never in read response');
  const update=event(client,'message:update');
  const read=await data(await request(`/messages/${vanished.id}/seen`,recipient.token,'POST',{}));
  assert.deepEqual(Object.keys(read).sort(),Object.keys(tombstone).sort());assert.equal(read.tombstone,true);assert.deepEqual(await update,read);
});

test('locked preview boundary respects deletion, read, expiry, membership and sender while a legitimate preview creates no receipt',async()=>{
  const {sender,recipient,conversation}=await direct();
  const message=await service.sendMessageToConversation(sender.user.id,conversation.id,'unread preview');
  const preview=await data(await request(`/messages/${message.id}/preview`,recipient.token,'POST',{}));assert.equal(preview.content,'unread preview');
  assert.equal((await pool.query('SELECT 1 FROM message_reads WHERE message_id=$1',[message.id])).rowCount,0);
  assert.equal(await service.previewMessage(message.id,sender.user.id),undefined);
  // Force a concurrent writer to hold the same real row lock until preview is
  // waiting. A stale first SELECT must not authorize the later write/return.
  for(const effect of ['deleted_at=clock_timestamp()','seen_at=clock_timestamp()','expires_at=clock_timestamp()','read-receipt']){
    const victim=await service.sendMessageToConversation(sender.user.id,conversation.id,'race secret');
    const connection=await pool.connect();await connection.query('BEGIN');await connection.query('SELECT id FROM messages WHERE id=$1 FOR UPDATE',[victim.id]);
    const previewing=service.previewMessage(victim.id,recipient.user.id);
    if(effect==='read-receipt')await connection.query('INSERT INTO message_reads(message_id,user_id) VALUES($1,$2)',[victim.id,recipient.user.id]);
    else await connection.query(`UPDATE messages SET ${effect} WHERE id=$1`,[victim.id]);
    await connection.query('COMMIT');connection.release();
    assert.equal(await previewing,undefined);
    assert.equal(await currentMessageResponse({...victim,messageState:'MESSAGE_PREVIEWED'},recipient.user.id),null);
  }
  const group=await service.createGroupChat(sender.user.id,[recipient.user.id],'Membership race');conversationIds.push(group.id);
  const groupMessage=await service.sendMessageToConversation(sender.user.id,group.id,'membership secret');
  await pool.query('DELETE FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',[group.id,recipient.user.id]);
  assert.equal(await messages.recordPreview(groupMessage.id,recipient.user.id),undefined);
  assert.equal(await currentMessageResponse(groupMessage,recipient.user.id),null);
  assert.deepEqual(await currentMessageResponse([{conversation:group,lastMessage:groupMessage}],recipient.user.id),[]);
  const entitlementVictim=await service.sendMessageToConversation(sender.user.id,conversation.id,'revoked preview authority');
  await pool.query(`UPDATE user_feature_overrides SET enabled=false,expires_at=NULL WHERE user_id=$1 AND feature_key='MESSAGE_UNREAD_PREVIEW'`,[recipient.user.id]);
  assert.equal(await messages.recordPreview(entitlementVictim.id,recipient.user.id),undefined);
  assert.equal(await currentMessageResponse({...entitlementVictim,messageState:'MESSAGE_PREVIEWED'},recipient.user.id),null);
});

test('prior message attachment grants recheck parent availability/membership including cached and provider-in-flight delivery',async()=>{
  const {sender,recipient,conversation}=await direct(),bytes=Buffer.from('synthetic approved attachment'),sha=createHash('sha256').update(bytes).digest('hex');
  const asset=await createTestApprovedMedia(sender.user.id,'message','image/png',{sha256:sha,verifiedBytes:bytes.length});mediaIds.push(asset.id);
  const message=await service.sendMessageToConversation(sender.user.id,conversation.id,'attachment',{mediaId:asset.id});
  const hydrated=await hydrateMediaValue(message,undefined,recipient.user.id);const token=new URL(hydrated.mediaUrl!).searchParams.get('token')!;
  const provider={verifyUpload:async()=>({assetId:asset.providerAssetId!,publicId:asset.publicId,resourceType:'image',deliveryType:'authenticated',version:1,format:'png',buffer:bytes,bytes:bytes.length,mimeType:'image/png',sha256:sha})}as unknown as MediaProvider;
  const delivery=new MediaDeliveryService(provider);assert.deepEqual((await delivery.read(asset.id,token)).buffer,bytes);
  await assert.rejects(()=>delivery.read(asset.id,new URL(mediaDeliveryUrl(asset.id,'original')).searchParams.get('token')!),MediaLifecycleError);
  await pool.query('UPDATE messages SET expires_at=clock_timestamp() WHERE id=$1',[message.id]);
  assert.equal(await hydrateMediaValue(message,undefined,recipient.user.id),null);await assert.rejects(()=>delivery.read(asset.id,token),MediaLifecycleError);
  assert.equal((await fetch(`${base}/media/${asset.id}/content?token=${token}`)).status,404);
  assert.equal((await pool.query('SELECT 1 FROM media_references WHERE entity_id=$1',[message.id])).rowCount,1,'lifecycle cleanup remains stopped');
  await pool.query('UPDATE messages SET expires_at=NULL WHERE id=$1',[message.id]);
  let release!:()=>void,started!:()=>void;const blocked=new Promise<void>(resolve=>release=resolve),entered=new Promise<void>(resolve=>started=resolve);
  const slow=new MediaDeliveryService({...provider,verifyUpload:async(...args:any[])=>{started();await blocked;return provider.verifyUpload(args[0],args[1]);}});
  const reading=slow.read(asset.id,token);await entered;await pool.query('UPDATE messages SET deleted_at=clock_timestamp() WHERE id=$1',[message.id]);release();await assert.rejects(reading,MediaLifecycleError);
  const group=await service.createGroupChat(sender.user.id,[recipient.user.id],'Attachment membership');conversationIds.push(group.id);
  const groupAsset=await createTestApprovedMedia(sender.user.id,'message','image/png',{sha256:sha,verifiedBytes:bytes.length});mediaIds.push(groupAsset.id);
  const groupMessage=await service.sendMessageToConversation(sender.user.id,group.id,'attachment',{mediaId:groupAsset.id});
  const groupToken=new URL((await hydrateMediaValue(groupMessage,undefined,recipient.user.id)).mediaUrl!).searchParams.get('token')!;
  await pool.query('DELETE FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',[group.id,recipient.user.id]);
  await assert.rejects(()=>delivery.read(groupAsset.id,groupToken),MediaLifecycleError);
  assert.equal((await fetch(`${base}/media/${groupAsset.id}/content?token=${groupToken}`)).status,404);
});

test('idempotent HTTP/socket retries do not republish, and concurrent PostgreSQL reactions preserve all users without duplicates',async()=>{
  const {sender,recipient,conversation}=await direct(),client=await socket(sender.token),key=randomUUID();
  const received:any[]=[];client.on('message:receive',value=>received.push(value));
  let confirmation=event(client,'message:sent');client.emit('message:send',{conversationId:conversation.id,content:'once',idempotencyKey:key});await confirmation;
  confirmation=event(client,'message:sent');client.emit('message:send',{conversationId:conversation.id,content:'once',idempotencyKey:key});await confirmation;assert.equal(received.length,1);
  assert.equal((await request('/messages',sender.token,'POST',{conversationId:conversation.id,content:'once',idempotencyKey:key})).status,201);
  const concurrentKey=randomUUID();
  const results=await Promise.all(Array.from({length:12},()=>service.sendMessageToConversation(sender.user.id,conversation.id,'concurrent once',{idempotencyKey:concurrentKey})));
  assert.equal(new Set(results.map(result=>result.id)).size,1);
  assert.equal(results.filter(result=>service.consumeNewPublication(result)).length,1,'only the insert winner has publication authority');
  assert.equal((await pool.query('SELECT count(*)::int n FROM messages WHERE id=$1',[concurrentKey])).rows[0].n,1);
  const members=await Promise.all(Array.from({length:12},()=>person()));
  const group=await service.createGroupChat(sender.user.id,members.map(member=>member.user.id),'Concurrent reactions');conversationIds.push(group.id);
  const message=await service.sendMessageToConversation(sender.user.id,group.id,'reaction race');
  await Promise.all(members.flatMap((member,index)=>Array.from({length:3},()=>service.addReaction(message.id,member.user.id,index%2?'heart':'thumbs-up'))));
  const saved=(await messages.findById(message.id))!;
  assert.equal(saved.reactions!['heart'].length,6);assert.equal(saved.reactions!['thumbs-up'].length,6);
  for(const value of Object.values(saved.reactions!))assert.equal(new Set(value).size,value.length);
});

test('deleting group creator or legacy recipient preserves survivors, retains existing author-erasure policy, promotes ownership and preserves financial/media jobs',async()=>{
  for(const deletion of ['creator','legacy-recipient']){
    const creator=await person(),first=await person(),second=await person(),group=await service.createGroupChat(creator.user.id,[first.user.id,second.user.id],'Shared history');conversationIds.push(group.id);
    const authored=await service.sendMessageToConversation(creator.user.id,group.id,'creator contribution');
    const reply=await service.sendMessageToConversation(first.user.id,group.id,'first contribution',{replyToId:authored.id});
    const other=await service.sendMessageToConversation(second.user.id,group.id,'second contribution');
    // Representative pre-upgrade legacy values remain non-destructive under
    // upgraded FKs even when a concurrent old application writes them.
    await pool.query('UPDATE conversations SET participant_a=$1,participant_b=$1 WHERE id=$2',[creator.user.id,group.id]);
    await pool.query('UPDATE messages SET recipient_id=$1 WHERE id=$2',[second.user.id,reply.id]);
    const erased=deletion==='creator'?creator:second;
    const ledgerId=randomUUID(),reference=`message-history:${randomUUID()}`;
    await pool.query('INSERT INTO ledger_transactions(id,credit_account_id,debit_account_id,amount_minor,reference_id) VALUES($1,$2,$3,50,$4)',[ledgerId,first.user.id,erased.user.id,reference]);
    const asset=await createTestApprovedMedia(erased.user.id,'message');mediaIds.push(asset.id);
    await service.sendMessageToConversation(erased.user.id,group.id,'erased media',{mediaId:asset.id});
    assert.equal(await accounts.deleteAccount(erased.user.id,'synthetic-password'),true);
    assert.ok(await conversations.findById(group.id));assert.equal(await users.findById(erased.user.id),undefined);
    assert.deepEqual(await service.listConversation(group.id,erased.user.id),[]);
    const history=await service.listConversation(group.id,first.user.id);assert.ok(history.some(message=>message.id===reply.id));
    assert.equal(history.some(message=>message.senderId===erased.user.id),false,'existing deleted-author erasure remains the default pending owner approval');
    if(deletion==='creator'){assert.ok(history.some(message=>message.id===other.id));assert.equal(history.find(message=>message.id===reply.id)?.replyToId,null);}
    else assert.ok(history.some(message=>message.id===authored.id));
    assert.ok((await pool.query(`SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND role='admin'`,[group.id])).rowCount);
    assert.equal((await pool.query('SELECT debit_account_id FROM ledger_transactions WHERE id=$1',[ledgerId])).rows[0].debit_account_id,null);
    assert.equal((await pool.query(`SELECT 1 FROM background_jobs WHERE dedup_key=$1`,[`account:${erased.user.id}`])).rowCount,1);
    assert.ok((await pool.query('SELECT 1 FROM media_assets WHERE id=$1 AND owner_id IS NULL AND deletion_status<>$2',[asset.id,'none'])).rowCount);
    await pool.query('DELETE FROM ledger_transactions WHERE id=$1',[ledgerId]);
  }
  const {sender,recipient,conversation}=await direct();await service.sendMessageToConversation(sender.user.id,conversation.id,'direct erasure');
  await accounts.deleteAccount(sender.user.id,'synthetic-password');assert.equal(await conversations.findById(conversation.id),undefined);
});

test('representative existing-data migration removes destructive legacy FKs and remains repeatable without restoring removed membership',async()=>{
  const connection=await pool.connect(),schema=`message_upgrade_${randomUUID().replaceAll('-','')}`;
  const creator=randomUUID(),first=randomUUID(),second=randomUUID(),group=randomUUID(),authorMessage=randomUUID(),survivorMessage=randomUUID();
  assert.match(schema,/^message_upgrade_[a-f0-9]+$/);
  const migrate=await import(new URL('../../../lib/db/scripts/message-integrity-migration.mjs',import.meta.url).href);
  try {
    await connection.query(`CREATE SCHEMA ${schema}`);await connection.query(`SET search_path TO ${schema},public`);
    await connection.query(`CREATE TABLE users(id uuid PRIMARY KEY);CREATE TABLE conversations(id uuid PRIMARY KEY,
      participant_a uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,participant_b uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      participant_ids jsonb DEFAULT '[]',is_group boolean DEFAULT false);
      CREATE TABLE messages(id uuid PRIMARY KEY,conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,created_at timestamp DEFAULT now(),deleted_at timestamp,expires_at timestamp,
      reply_to_id uuid REFERENCES messages(id),forwarded_from_id uuid REFERENCES messages(id))`);
    await connection.query('INSERT INTO users(id) SELECT unnest($1::uuid[])',[[creator,first,second]]);
    await connection.query('INSERT INTO conversations VALUES($1,$2,$2,$3::jsonb,true)',[group,creator,JSON.stringify([creator,first,second])]);
    await connection.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content) VALUES($1,$2,$3,$4,'author history')`,[authorMessage,group,creator,first]);
    await connection.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content,reply_to_id) VALUES($1,$2,$3,$4,'survivor history',$5)`,[survivorMessage,group,first,second,authorMessage]);
    await migrate.migrateMessageIntegrity(connection);await migrate.migrateMessageIntegrity(connection);
    assert.equal((await connection.query("SELECT 1 FROM release_schema_versions WHERE version='20261007-message-integrity-1'")).rowCount,1);
    assert.equal((await connection.query('SELECT count(*)::int n FROM conversation_members WHERE conversation_id=$1',[group])).rows[0].n,3);
    assert.equal((await connection.query('SELECT participant_a FROM conversations WHERE id=$1',[group])).rows[0].participant_a,null);
    assert.equal((await connection.query('SELECT recipient_id FROM messages WHERE id=$1',[survivorMessage])).rows[0].recipient_id,null);
    await connection.query('DELETE FROM users WHERE id=$1',[creator]);
    assert.equal((await connection.query('SELECT 1 FROM conversations WHERE id=$1',[group])).rowCount,1);
    const retained=(await connection.query('SELECT * FROM messages WHERE id=$1',[survivorMessage])).rows[0];assert.equal(retained.content,'survivor history');assert.equal(retained.reply_to_id,null);
    await connection.query('DELETE FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',[group,first]);
    await migrate.migrateMessageIntegrity(connection);
    assert.equal((await connection.query('SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2',[group,first])).rowCount,0);
    await connection.query('DELETE FROM conversation_members WHERE conversation_id=$1',[group]);await migrate.migrateMessageIntegrity(connection);
    assert.equal((await connection.query('SELECT 1 FROM conversation_members WHERE conversation_id=$1',[group])).rowCount,0,'an empty authoritative membership must not be repopulated from stale JSON');
  }finally{
    await connection.query('SET search_path TO public');await connection.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);connection.release();
  }
});

test('injected account deletion failure rolls back group ownership, history, media revocation and cleanup enqueue together',async()=>{
  const creator=await person(),survivor=await person(),group=await service.createGroupChat(creator.user.id,[survivor.user.id],'Transactional group');conversationIds.push(group.id);
  const asset=await createTestApprovedMedia(creator.user.id,'message');mediaIds.push(asset.id);
  const message=await service.sendMessageToConversation(creator.user.id,group.id,'transactional body',{mediaId:asset.id});
  const guard=`message_rollback_guard_${randomUUID().replaceAll('-','')}`;assert.match(guard,/^message_rollback_guard_[a-f0-9]+$/);
  await pool.query(`CREATE TABLE ${guard}(user_id uuid REFERENCES users(id) ON DELETE RESTRICT)`);await pool.query(`INSERT INTO ${guard} VALUES($1)`,[creator.user.id]);
  try{
    await assert.rejects(()=>accounts.deleteAccount(creator.user.id,'synthetic-password'));
    assert.ok(await users.findById(creator.user.id));assert.ok(await messages.findById(message.id));
    assert.equal((await pool.query(`SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,[group.id,creator.user.id])).rows[0].role,'admin');
    assert.equal((await pool.query(`SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,[group.id,survivor.user.id])).rows[0].role,'member');
    assert.equal((await pool.query(`SELECT 1 FROM background_jobs WHERE dedup_key=$1`,[`account:${creator.user.id}`])).rowCount,0);
    const saved=(await pool.query('SELECT owner_id,deletion_status FROM media_assets WHERE id=$1',[asset.id])).rows[0];assert.equal(saved.owner_id,creator.user.id);assert.equal(saved.deletion_status,'none');
    assert.equal((await pool.query('SELECT 1 FROM media_references WHERE entity_id=$1',[message.id])).rowCount,1);
  }finally{await pool.query(`DROP TABLE ${guard}`);}
});
