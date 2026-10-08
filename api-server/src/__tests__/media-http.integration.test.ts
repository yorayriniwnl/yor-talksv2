import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { createTestUser } from './test-helpers.js';
import { createMediaRouter } from '../routes/media.js';
import { MediaService, MediaLifecycleError, type MediaModerator } from '../services/media-service.js';
import { MediaDeliveryService, mediaDeliveryUrl } from '../services/media-delivery.js';
import { mediaResponse } from '../services/media-response.js';
import { closeAuthenticationDependencies } from '../middlewares/auth.js';
import { closeRateLimitRedis } from '../middlewares/rate-limit.js';
import { errorHandler } from '../middlewares/error-handler.js';
import type { MediaProvider, MediaUploadIntent } from '../services/media-provider.js';
import { CommunityService } from '../services/community-service.js';
import { createTestApprovedMedia } from './media-fixtures.js';
import businessRouter from '../routes/business.js';

const buffer=Buffer.from('synthetic verified image');
const approved:MediaModerator={assertReady:async()=>{},moderate:async()=>({decision:'approve',reasons:[]})};
function provider(overrides:Partial<MediaProvider>={}):MediaProvider{
  return {prepareUpload:async intent=>({directAllowed:false,uploadUrl:'unused',cloudName:'fixture',apiKey:'fixture',resourceType:intent.resourceType,publicId:intent.publicId,maxFileSize:2*1024*1024,fields:{}}),
    uploadBuffer:async()=>{},verifyUpload:async intent=>({assetId:'b'.repeat(32),publicId:intent.publicId,resourceType:intent.resourceType,deliveryType:'authenticated',version:1,format:'png',buffer,bytes:buffer.length,mimeType:'image/png',sha256:createHash('sha256').update(buffer).digest('hex'),width:2,height:2}),
    verifyIdentity:async()=>{},signedDeliveryUrl:()=>{throw new Error('Provider URL must stay internal');},signedPosterUrl:()=>{throw new Error('Provider URL must stay internal');},deleteAsset:async()=>{},deletePendingUpload:async()=>{},deleteUpload:async()=>{},deleteExpected:async()=>{},inspectReadiness:async()=>({storage:true,presets:true,direct:false,errorCodes:[]}),...overrides};
}
const redis=new RedisRepository(),users=new UserRepository();
async function json(response:Response):Promise<any>{return response.json();}
after(async()=>{await Promise.all([redis.disconnect(),closeAuthenticationDependencies(),closeRateLimitRedis()]);await pool.end();});
async function account(){
  const user=await createTestUser(users,{termsVersion:env.TERMS_VERSION,termsAcceptedAt:new Date().toISOString(),ageConfirmedAt:new Date().toISOString()});
  const deviceId=randomUUID();await redis.setStrict(`session:${user.id}:${deviceId}`,'active',600);
  return {user,token:jwt.sign({sub:user.id,deviceId,type:'access',authVersion:user.authVersion??0},env.JWT_SECRET,{algorithm:'HS256',expiresIn:600})};
}
async function serve(t:{after(fn:()=>Promise<void>):void},storage=provider(),moderator=approved){
  const service=new MediaService(storage,moderator),delivery=new MediaDeliveryService(storage);
  const app=express();app.use(express.json());app.use(mediaResponse);app.use('/api',createMediaRouter(service,delivery));app.use('/api/business',businessRouter);app.use(errorHandler);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise<void>(resolve=>server.close(()=>resolve())));
  const address=server.address();if(!address||typeof address==='string')throw new Error();
  const base=`http://127.0.0.1:${address.port}/api`;
  const request=(path:string,token?:string,body?:unknown,method='POST')=>fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{'X-Untrusted':'anonymous'}),...(!(body instanceof FormData)&&body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
  return {service,delivery,request};
}
test('production HTTP presign and multipart upload succeed through verified lifecycle; forged fields and cross-owner finalization fail',async t=>{
  const owner=await account(),other=await account();const {request}=await serve(t);
  const previous=process.env.NODE_ENV;process.env.NODE_ENV='production';t.after(async()=>{process.env.NODE_ENV=previous;});
  const input={filename:'fixture.png',mimeType:'image/png',size:buffer.length,purpose:'post'};
  assert.equal((await request('/media/presign',undefined,input)).status,401);
  for(const extra of [{publicId:'forged/path'},{public_id:'forged'},{url:'https://example.test/x'},{ownerId:other.user.id},{status:'approved'}]){
    const bad=await request('/media/presign',owner.token,{...input,...extra});assert.equal(bad.status,400);assert.equal((await json(bad)).success,false);
  }
  const presign=await request('/media/presign',owner.token,input);assert.equal(presign.status,200);const media=(await json(presign)).data;
  assert.equal(media.status,'pending');assert.equal(media.mode,'server');assert.equal(media.url,undefined);
  assert.equal((await request(`/media/${media.id}/finalize`,other.token,{})).status,403);
  assert.equal((await request(`/media/${media.id}/finalize`,owner.token,{publicId:'forged'})).status,400);
  const completed=await request(`/media/${media.id}/finalize`,owner.token,{});assert.equal(completed.status,200);
  const result=(await json(completed)).data;assert.equal(result.status,'approved');assert.match(result.url,/\/api\/media\/.*\/content\?token=/);
  const form=new FormData();form.append('file',new Blob([buffer],{type:'image/png'}),'fixture.png');form.append('purpose','post');
  const uploaded=await request('/media/upload',owner.token,form);assert.equal(uploaded.status,201);assert.equal((await json(uploaded)).data.status,'approved');
});
test('production HTTP moderation unavailable remains a conditional 503 and cannot create a publishable asset',async t=>{
  const owner=await account();const {request}=await serve(t,provider(),{...approved,assertReady:async()=>{throw new Error('not configured');}});
  const response=await request('/media/presign',owner.token,{filename:'a.png',mimeType:'image/png',size:buffer.length,purpose:'post'});
  assert.equal(response.status,503);assert.equal((await json(response)).data,null);
});
test('delivery verifies approved bytes, rejects token tampering/cross-ID replay, and revokes cached content after deletion',async t=>{
  const owner=await account();const {service,delivery,request}=await serve(t);
  const prepared=await service.prepareUpload(owner.user.id,{filename:'a.png',mimeType:'image/png',size:buffer.length,purpose:'post'});
  await service.finalizeUpload(owner.user.id,prepared.id);
  const url=new URL(mediaDeliveryUrl(prepared.id,'original',true)),token=url.searchParams.get('token')!;
  const response=await request(`/media/${prepared.id}/content?token=${token}`,undefined,undefined,'GET');assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(Buffer.from(await response.arrayBuffer()),buffer);
  await assert.rejects(()=>delivery.read(randomUUID(),token),MediaLifecycleError);
  await assert.rejects(()=>delivery.read(prepared.id,token.slice(0,-2)+'zz'),MediaLifecycleError);
  const savedTtl=env.MEDIA_SIGNED_URL_TTL_SECONDS;env.MEDIA_SIGNED_URL_TTL_SECONDS=30;const futureToken=new URL(mediaDeliveryUrl(prepared.id,'original',true)).searchParams.get('token')!;
  env.MEDIA_SIGNED_URL_TTL_SECONDS=29;await assert.rejects(()=>delivery.read(prepared.id,futureToken),MediaLifecycleError);env.MEDIA_SIGNED_URL_TTL_SECONDS=savedTtl;
  await service.deleteUpload(owner.user.id,prepared.id);await assert.rejects(()=>delivery.read(prepared.id,token),MediaLifecycleError);
});
test('replayed provider bytes after approval never reach the delivery response or video poster generator',async()=>{
  const owner=await account(),storage=provider(),service=new MediaService(storage,approved);
  const media=await service.prepareUpload(owner.user.id,{filename:'a.png',mimeType:'image/png',size:buffer.length,purpose:'post'});await service.finalizeUpload(owner.user.id,media.id);
  const tampered=provider({verifyUpload:async intent=>{const result=await storage.verifyUpload(intent);return {...result,buffer:Buffer.from('unapproved replacement'),sha256:createHash('sha256').update('unapproved replacement').digest('hex')};}});
  const token=new URL(mediaDeliveryUrl(media.id,'original',true)).searchParams.get('token')!;
  await assert.rejects(()=>new MediaDeliveryService(tampered).read(media.id,token),error=>error instanceof MediaLifecycleError&&error.code==='media_verification_failed');
});
test('business and community images publish only owned approved purpose-specific IDs',async t=>{
  const owner=await account(),other=await account(),{request}=await serve(t);
  const logo=await createTestApprovedMedia(owner.user.id,'business');
  const response=await request('/business',owner.token,{name:'Synthetic Business',logoMediaId:logo.id});assert.equal(response.status,201);
  const businessId=(await json(response)).data.businessId;
  assert.equal((await pool.query("SELECT media_id FROM media_references WHERE entity_type='business_profiles' AND entity_id=$1",[businessId])).rows[0].media_id,logo.id);
  const wrong=await request('/business',other.token,{name:'Wrong owner business',logoMediaId:logo.id});assert.equal(wrong.status,403);
  assert.equal((await request('/business',owner.token,{name:'Raw URL business',logoUrl:'https://example.test/a'})).status,400);
  const cover=await createTestApprovedMedia(owner.user.id,'community');
  const community=await new CommunityService().createCommunity({name:'Synthetic Circle',slug:'media-'+randomUUID(),description:'A synthetic community',ownerId:owner.user.id,coverMediaId:cover.id});
  assert.equal(community.coverUrl,`media:${cover.id}`);
  assert.equal((await pool.query("SELECT media_id FROM media_references WHERE entity_type='communities' AND entity_id=$1",[community.id])).rows[0].media_id,cover.id);
});
