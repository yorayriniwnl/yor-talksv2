import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { db, pool } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { mediaAssetsTable, mediaReferencesTable, postsTable } from '@workspace/db/schema';
import { env } from '../config/env.js';
import { EligibilityService } from '../services/eligibility-service.js';
import { MediaAuthorizationService } from '../services/media-authorization-service.js';
import { MediaDeliveryService, mediaDeliveryUrl } from '../services/media-delivery.js';
import { MediaLifecycleError } from '../services/media-service.js';
import type { ApprovedTerritoryPolicy } from '../eligibility/types.js';
import type { MediaProvider, VerifiedMedia } from '../services/media-provider.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { ContentSafetyService } from '../services/content-safety-service.js';
import { createEligibilityFixture } from './eligibility-fixtures.js';
import { createTestUser } from './test-helpers.js';
import { createTestApprovedMedia } from './media-fixtures.js';

const users=new UserRepository(),redis=new RedisRepository();
const bytes=Buffer.from('synthetic approved media');
const sha256=createHash('sha256').update(bytes).digest('hex');
const now=Date.now();
const policies:ApprovedTerritoryPolicy[]=(['recipient','operator'] as const).map(scope=>({
  id:scope==='recipient'?'fixture-recipient':'fixture-operator',scope,territory:scope==='recipient'?'ZZ':'EE',version:'fixture-1',
  approved:true,synthetic:true,approvalReference:'isolated-fixture',effectiveFrom:new Date(now-60_000).toISOString(),
  reviewExpiresAt:new Date(now+86_400_000).toISOString(),sources:['https://legal.example/fixture'],
  allowedExperiences:['under_13','teen_13_17','adult_18_plus'],minimumAccessThreshold:null,independentConsentThreshold:13,
  guardianRequiredBelow:null,requiredGuardianPurposes:['account_activation'],guardianNoticeVersions:{account_activation:'notice-1'},
  currentTermsVersion:env.TERMS_VERSION,guardianContactsRequired:true,publicBrowsingAllowed:true,maximumContentRating:'mature',
  capabilities:{social:true,publish:true,messaging:true,payments:false,seller:false,memberships:false,live:false,rtc:false,ai:false,analytics:false,profiling:false},
}));

after(async()=>{await redis.disconnect();await pool.end();});

async function fixture(t:{after(fn:()=>Promise<void>):void},providerGate?:{started:()=>void;wait:Promise<void>} ) {
  const oldNodeEnv=env.NODE_ENV;env.NODE_ENV='production';t.after(async()=>{env.NODE_ENV=oldNodeEnv;});
  const createdUsers:string[]=[],createdAssets:string[]=[],createdPosts:string[]=[],deviceId=randomUUID();
  t.after(async()=>{
    if(createdAssets.length)await db.delete(mediaReferencesTable).where(eq(mediaReferencesTable.mediaId,createdAssets[0]!));
    if(createdPosts.length)await db.delete(postsTable).where(eq(postsTable.id,createdPosts[0]!));
    if(createdAssets.length)await db.delete(mediaAssetsTable).where(eq(mediaAssetsTable.id,createdAssets[0]!));
    if(createdUsers.length)await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[createdUsers]);
    await redis.delStrict(`session:${viewer.id}:${deviceId}`);
  });
  const [owner,viewer,other]=await Promise.all([createTestUser(users,{privacy:{profileVisibility:'public',messageRequests:true,allowDmFromStrangers:true}}),createTestUser(users,{settings:{theme:'light',notificationsEnabled:true,privateAccount:false,contentFilter:'mature'}}),createTestUser(users)]);
  createdUsers.push(owner.id,viewer.id,other.id);
  for(const user of [owner,viewer,other]) {
    await users.update(user.id,{termsVersion:env.TERMS_VERSION,termsAcceptedAt:new Date().toISOString()});
    await createEligibilityFixture(user.id);
  }
  const sessionValue='synthetic-session';await redis.setStrict(`session:${viewer.id}:${deviceId}`,sessionValue,600);
  const asset=await createTestApprovedMedia(owner.id,'post','image/png',{declaredBytes:bytes.length,verifiedBytes:bytes.length,sha256});
  createdAssets.push(asset.id);
  const postId=randomUUID();createdPosts.push(postId);
  await db.insert(postsTable).values({id:postId,authorId:owner.id,content:'Synthetic public post',images:[`media:${asset.id}`],
    audience:'public',distributionMode:'feed_and_profile',contentCategory:'other',contentRating:'regular'});
  await db.insert(mediaReferencesTable).values({mediaId:asset.id,entityType:'posts',entityId:postId,slot:'images'});
  const repository=new EligibilityRepository();
  const eligibility=new EligibilityService(repository,{policies:()=>policies,operatorPolicyIds:['fixture-operator'],currentTermsVersion:env.TERMS_VERSION});
  const decision=await eligibility.decisionFor(viewer.id);assert.equal(decision.activated,true);
  const authorization=new MediaAuthorizationService(eligibility,new ContentSafetyService(users,eligibility),users,redis);
  let providerCalls=0;
  const provider={verifyUpload:async(_intent,identity):Promise<VerifiedMedia>=>{
    providerCalls++;
    if(providerGate){providerGate.started();await providerGate.wait;}
    return {...identity!,buffer:bytes,bytes:bytes.length,mimeType:'image/png',sha256};
  }} as MediaProvider;
  const delivery=new MediaDeliveryService(provider,undefined,authorization);
  const context=mediaDeliveryUrl({assetId:asset.id,entityType:'posts',entityId:postId,slot:'images',variant:'original',ownerPreview:false,
    viewer:{kind:'user',userId:viewer.id,deviceId,authVersion:viewer.authVersion??0,eligibilityRevision:decision.revision},policyRevision:decision.revision});
  const token=new URL(context).searchParams.get('token')!;
  return {owner,viewer,other,deviceId,asset,postId,eligibility,delivery,token,providerCalls:()=>providerCalls};
}

test('a viewer-bound exact-resource grant cannot be copied to another account or anonymous delivery',async t=>{
  const f=await fixture(t);
  const requester={userId:f.viewer.id,deviceId:f.deviceId,authVersion:f.viewer.authVersion??0};
  const content=await f.delivery.read(f.asset.id,f.token,requester);
  assert.deepEqual(content.buffer,bytes);
  const otherDevice=randomUUID();await redis.setStrict(`session:${f.other.id}:${otherDevice}`,'other-session',600);
  t.after(()=>redis.delStrict(`session:${f.other.id}:${otherDevice}`));
  await assert.rejects(()=>f.delivery.read(f.asset.id,f.token,{userId:f.other.id,deviceId:otherDevice,authVersion:f.other.authVersion??0}),MediaLifecycleError);
  await assert.rejects(()=>f.delivery.read(f.asset.id,f.token,{}),MediaLifecycleError);
  await assert.rejects(()=>f.delivery.read(f.asset.id,f.token,{userId:f.viewer.id,deviceId:randomUUID(),authVersion:f.viewer.authVersion??0}),MediaLifecycleError);
  const legacyBody=Buffer.from(JSON.stringify({id:f.asset.id,variant:'original',preview:false,exp:Math.floor(Date.now()/1000)+60})).toString('base64url');
  const legacyMac=createHmac('sha256',env.JWT_SECRET).update('yor-talks:approved-media-delivery:v1:').update(legacyBody).digest('base64url');
  await assert.rejects(()=>f.delivery.read(f.asset.id,`${legacyBody}.${legacyMac}`,requester),MediaLifecycleError);
});

test('a public reference to an asset cannot authorize its separate private reference',async t=>{
  const f=await fixture(t),privatePostId=randomUUID(),requester={userId:f.viewer.id,deviceId:f.deviceId,authVersion:f.viewer.authVersion??0};
  t.after(async()=>{
    await db.delete(mediaReferencesTable).where(eq(mediaReferencesTable.entityId,privatePostId));
    await db.delete(postsTable).where(eq(postsTable.id,privatePostId));
  });
  await db.insert(postsTable).values({id:privatePostId,authorId:f.owner.id,content:'Synthetic followers-only post',images:[`media:${f.asset.id}`],
    audience:'followers',distributionMode:'feed_and_profile',contentCategory:'other',contentRating:'regular'});
  await db.insert(mediaReferencesTable).values({mediaId:f.asset.id,entityType:'posts',entityId:privatePostId,slot:'images'});
  const decision=await f.eligibility.decisionFor(f.viewer.id);
  const privateUrl=mediaDeliveryUrl({assetId:f.asset.id,entityType:'posts',entityId:privatePostId,slot:'images',variant:'original',ownerPreview:false,
    viewer:{kind:'user',userId:f.viewer.id,deviceId:f.deviceId,authVersion:f.viewer.authVersion??0,eligibilityRevision:decision.revision},policyRevision:decision.revision});
  const privateToken=new URL(privateUrl).searchParams.get('token')!;
  await assert.rejects(()=>f.delivery.read(f.asset.id,privateToken,requester),MediaLifecycleError);
});

test('a cached grant is denied immediately after its exact entity reference is removed',async t=>{
  const f=await fixture(t),requester={userId:f.viewer.id,deviceId:f.deviceId,authVersion:f.viewer.authVersion??0};
  await f.delivery.read(f.asset.id,f.token,requester);
  assert.equal(f.providerCalls(),1);
  await db.delete(mediaReferencesTable).where(eq(mediaReferencesTable.mediaId,f.asset.id));
  await assert.rejects(()=>f.delivery.read(f.asset.id,f.token,requester),MediaLifecycleError);
  assert.equal(f.providerCalls(),1,'a denied cached read does not call the provider again');
});

test('a cached media read rechecks current eligibility instead of trusting cached bytes',async t=>{
  const f=await fixture(t),requester={userId:f.viewer.id,deviceId:f.deviceId,authVersion:f.viewer.authVersion??0};
  await f.delivery.read(f.asset.id,f.token,requester);
  const operator=policies.find(policy=>policy.scope==='operator')!,social=operator.capabilities.social;
  t.after(()=>{operator.capabilities.social=social;});
  operator.capabilities.social=false;
  await assert.rejects(()=>f.delivery.read(f.asset.id,f.token,requester),MediaLifecycleError);
  assert.equal(f.providerCalls(),1,'revoked cached reads must not trigger another provider request');
});

test('revoked eligibility during a shared provider read returns no bytes to either caller',async t=>{
  let start!:()=>void,release!:()=>void;
  const started=new Promise<void>(resolve=>{start=resolve;}),wait=new Promise<void>(resolve=>{release=resolve;});
  const f=await fixture(t,{started:start,wait});
  const requester={userId:f.viewer.id,deviceId:f.deviceId,authVersion:f.viewer.authVersion??0};
  const first=f.delivery.read(f.asset.id,f.token,requester);
  await started;
  const second=f.delivery.read(f.asset.id,f.token,requester);
  const operator=policies.find(policy=>policy.scope==='operator')!;
  const social=operator.capabilities.social;t.after(()=>{operator.capabilities.social=social;});
  operator.capabilities.social=false;
  release();
  const results=await Promise.allSettled([first,second]);
  assert.ok(results.every(result=>result.status==='rejected'));
  assert.equal(f.providerCalls(),1,'identical requests share the pending provider verification');
});
