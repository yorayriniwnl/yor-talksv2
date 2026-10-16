import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { db, pool } from '@workspace/db';
import { and, eq } from 'drizzle-orm';
import { mediaAssetsTable, mediaReferencesTable, postsTable } from '@workspace/db/schema';
import { env } from '../config/env.js';
import { EligibilityService } from '../services/eligibility-service.js';
import { MediaAuthorizationService, type MediaGrantContext } from '../services/media-authorization-service.js';
import { MediaDeliveryService, mediaDeliveryUrl } from '../services/media-delivery.js';
import { MediaLifecycleError } from '../services/media-service.js';
import type { ApprovedTerritoryPolicy } from '../eligibility/types.js';
import type { MediaProvider, VerifiedMedia } from '../services/media-provider.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { RedisRepository } from '../repositories/redis-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { ContentSafetyService } from '../services/content-safety-service.js';
import { ConversationRepository } from '../repositories/message-repository.js';
import type { ContactAuthorizationService } from '../services/contact-authorization-service.js';
import { createEligibilityFixture } from './eligibility-fixtures.js';
import { allowTestContacts, createTestUser } from './test-helpers.js';
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

async function fixture(t:{after(fn:()=>Promise<void>):void},providerGate?:{started:()=>void;wait:Promise<void>},contacts?: ContactAuthorizationService) {
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
  const authorization=new MediaAuthorizationService(eligibility,new ContentSafetyService(users,eligibility),users,redis,undefined,contacts);
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
  return {owner,viewer,other,deviceId,asset,postId,eligibility,authorization,delivery,token,providerCalls:()=>providerCalls};
}

async function profileFixture(t: Parameters<typeof fixture>[0], providerGate?: Parameters<typeof fixture>[1]) {
  const f = await fixture(t, providerGate);
  // Keep a live reference throughout the purpose/entity swap. Removing the
  // only reference first correctly schedules an approved asset for deletion.
  await db.transaction(async tx => {
    await tx.update(mediaAssetsTable).set({ purpose: 'avatar' }).where(eq(mediaAssetsTable.id, f.asset.id));
    await tx.insert(mediaReferencesTable).values({ mediaId: f.asset.id, entityType: 'users', entityId: f.owner.id, slot: 'avatarUrl' });
    await tx.delete(mediaReferencesTable).where(and(eq(mediaReferencesTable.mediaId, f.asset.id), eq(mediaReferencesTable.entityType, 'posts')));
  });
  await users.update(f.owner.id, { avatarUrl: `media:${f.asset.id}` });
  const decision = await f.eligibility.decisionFor(f.viewer.id);
  const context: Omit<MediaGrantContext, 'v' | 'exp'> = {
    assetId: f.asset.id, entityType: 'users', entityId: f.owner.id, slot: 'avatarUrl', variant: 'original', ownerPreview: false,
    viewer: { kind: 'user', userId: f.viewer.id, deviceId: f.deviceId, authVersion: f.viewer.authVersion ?? 0, eligibilityRevision: decision.revision },
    policyRevision: decision.revision,
  };
  const renewToken = () => new URL(mediaDeliveryUrl(context)).searchParams.get('token')!;
  const asset = (await pool.query('SELECT * FROM media_assets WHERE id=$1', [f.asset.id])).rows[0];
  const requester = { userId: f.viewer.id, deviceId: f.deviceId, authVersion: f.viewer.authVersion ?? 0 };
  const authorizeIssuance = () => f.authorization.authorize({ ...context, v: 2, exp: Math.floor(Date.now() / 1000) + 300 }, asset, requester);
  return { ...f, requester, renewToken, authorizeIssuance, token: renewToken() };
}

async function ephemeralFixture(t: Parameters<typeof fixture>[0], entityType: 'stories' | 'user_notes' | 'messages',
  providerGate?: Parameters<typeof fixture>[1], contacts = allowTestContacts) {
  const f = await fixture(t, providerGate, contacts), entityId = randomUUID();
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
  t.after(async () => { await pool.query(`DELETE FROM "${entityType}" WHERE id=$1`, [entityId]); });
  if (entityType === 'stories') {
    await pool.query(`INSERT INTO stories(id,author_id,media_url,type,audience,content_rating,expires_at)
      VALUES($1,$2,$3,'image','public','regular',$4)`, [entityId, f.owner.id, `media:${f.asset.id}`, expiresAt]);
  } else if (entityType === 'user_notes') {
    await pool.query(`INSERT INTO user_notes(id,author_id,content,audience,content_rating,expires_at)
      VALUES($1,$2,'Synthetic ephemeral note','public','regular',$3)`, [entityId, f.owner.id, expiresAt]);
  } else {
    const conversation = await new ConversationRepository().findOrCreateDirect(f.owner.id, f.viewer.id);
    await pool.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content,media_id,media_url,expires_at)
      VALUES($1,$2,$3,$4,'Synthetic ephemeral attachment',$5,$6,$7)`,
      [entityId, conversation.id, f.owner.id, f.viewer.id, f.asset.id, `media:${f.asset.id}`, expiresAt]);
  }
  await db.insert(mediaReferencesTable).values({ mediaId: f.asset.id, entityType, entityId, slot: 'mediaUrl' });
  const decision = await f.eligibility.decisionFor(f.viewer.id);
  const context: Omit<MediaGrantContext, 'v' | 'exp'> = {
    assetId: f.asset.id, entityType, entityId, slot: 'mediaUrl', variant: 'original', ownerPreview: false,
    viewer: { kind: 'user', userId: f.viewer.id, deviceId: f.deviceId, authVersion: f.viewer.authVersion ?? 0, eligibilityRevision: decision.revision },
    policyRevision: decision.revision,
  };
  const renewToken = () => new URL(mediaDeliveryUrl(context)).searchParams.get('token')!;
  const asset = (await pool.query('SELECT * FROM media_assets WHERE id=$1', [f.asset.id])).rows[0];
  const requester = { userId: f.viewer.id, deviceId: f.deviceId, authVersion: f.viewer.authVersion ?? 0 };
  const authorizeIssuance = () => f.authorization.authorize({ ...context, v: 2, exp: Math.floor(Date.now() / 1000) + 300 }, asset, requester);
  const expire = async () => {
    // Updating a message that is already expired intentionally releases its
    // reference through a trigger. Cross its lifetime naturally so the test
    // exercises access before asynchronous cleanup, with the reference intact.
    const expiry = Date.now() + (entityType === 'messages' ? 500 : 0);
    await pool.query(`UPDATE "${entityType}" SET expires_at=$2 WHERE id=$1`, [entityId, new Date(expiry).toISOString()]);
    if (entityType === 'messages') await new Promise(resolve => setTimeout(resolve, Math.max(0, expiry - Date.now()) + 5));
  };
  return { ...f, entityId, requester, renewToken, authorizeIssuance, expire, token: renewToken() };
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

test('profile media rechecks minor privacy at issuance, cached delivery and renewed grants', async t => {
  const f = await profileFixture(t);
  await f.authorizeIssuance();
  await f.delivery.read(f.asset.id, f.token, f.requester);
  assert.equal(f.providerCalls(), 1);

  const facts = await new EligibilityRepository().readFacts(f.owner.id);
  assert.ok(facts?.assessment);
  await createEligibilityFixture(f.owner.id, { assessment: { ...facts.assessment, experience: 'teen_13_17',
    thresholds: [{ age: 13, atLeast: true }, { age: 18, atLeast: false }] } });
  const ownerDecision = await f.eligibility.decisionFor(f.owner.id);
  assert.equal(ownerDecision.activated, true);
  assert.equal(ownerDecision.experience, 'teen_13_17');
  assert.equal((await users.findById(f.owner.id))?.privacy?.profileVisibility, 'public', 'legacy preferences remain public in this fixture');

  await assert.rejects(f.authorizeIssuance, MediaLifecycleError);
  await assert.rejects(() => f.delivery.read(f.asset.id, f.token, f.requester), MediaLifecycleError);
  await assert.rejects(() => f.delivery.read(f.asset.id, f.renewToken(), f.requester), MediaLifecycleError);
  assert.equal(f.providerCalls(), 1, 'denied profile grants do not fetch or release cached bytes');

  await users.followUser(f.viewer.id, f.owner.id);
  await f.authorizeIssuance();
  assert.deepEqual((await f.delivery.read(f.asset.id, f.token, f.requester)).buffer, bytes, 'accepted followers retain access');
  await users.unfollowUser(f.viewer.id, f.owner.id);
  await assert.rejects(f.authorizeIssuance, MediaLifecycleError);
  await assert.rejects(() => f.delivery.read(f.asset.id, f.token, f.requester), MediaLifecycleError);
});

test('unclassified profile media stays unavailable to child-safe and anonymous audiences', async t => {
  const f = await profileFixture(t);
  await users.update(f.viewer.id, { settings: { ...f.viewer.settings, contentFilter: 'child_safe' } });
  await assert.rejects(f.authorizeIssuance, MediaLifecycleError);
  await assert.rejects(() => f.delivery.read(f.asset.id, f.token, f.requester), MediaLifecycleError);
  await assert.rejects(() => f.delivery.read(f.asset.id, f.renewToken(), {}), MediaLifecycleError);
  assert.equal(f.providerCalls(), 0, 'a child-safe or anonymous grant is rejected before provider delivery');
});

test('profile privacy changed during provider verification prevents delivery and new issuance', async t => {
  let start!: () => void, release!: () => void;
  const started = new Promise<void>(resolve => { start = resolve; });
  const wait = new Promise<void>(resolve => { release = resolve; });
  const f = await profileFixture(t, { started: start, wait });
  const pending = f.delivery.read(f.asset.id, f.token, f.requester);
  const result = assert.rejects(pending, MediaLifecycleError);
  await started;
  await users.patchPrivacy(f.owner.id, { profileVisibility: 'private' });
  release();
  await result;
  await assert.rejects(f.authorizeIssuance, MediaLifecycleError);
  await assert.rejects(() => f.delivery.read(f.asset.id, f.renewToken(), f.requester), MediaLifecycleError);
  assert.equal(f.providerCalls(), 1);
});

for (const entityType of ['stories', 'user_notes', 'messages'] as const) {
  test(`${entityType} media expires at issuance and cached delivery without waiting for cleanup`, async t => {
    const f = await ephemeralFixture(t, entityType);
    await f.authorizeIssuance();
    assert.deepEqual((await f.delivery.read(f.asset.id, f.token, f.requester)).buffer, bytes);
    assert.equal(f.providerCalls(), 1);

    await f.expire();
    assert.equal((await pool.query('SELECT 1 FROM media_references WHERE media_id=$1 AND entity_type=$2 AND entity_id=$3',
      [f.asset.id, entityType, f.entityId])).rowCount, 1, 'expiry enforcement cannot depend on asynchronous reference cleanup');
    await assert.rejects(f.authorizeIssuance, MediaLifecycleError);
    await assert.rejects(() => f.delivery.read(f.asset.id, f.token, f.requester), MediaLifecycleError);
    await assert.rejects(() => f.delivery.read(f.asset.id, f.renewToken(), f.requester), MediaLifecycleError);
    assert.equal(f.providerCalls(), 1, 'expired cached grants neither fetch nor release provider bytes');
  });

  test(`${entityType} expiry during provider verification returns no bytes`, async t => {
    let start!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { start = resolve; });
    const wait = new Promise<void>(resolve => { release = resolve; });
    const f = await ephemeralFixture(t, entityType, { started: start, wait });
    const pending = f.delivery.read(f.asset.id, f.token, f.requester);
    const result = assert.rejects(pending, MediaLifecycleError);
    await started;
    await f.expire();
    release();
    await result;
    await assert.rejects(f.authorizeIssuance, MediaLifecycleError);
    assert.equal(f.providerCalls(), 1);
  });
}

test('an expired story retained in a highlight keeps its currently authorized media', async t => {
  const f = await ephemeralFixture(t, 'stories');
  await f.expire();
  await pool.query('UPDATE stories SET is_highlight=true WHERE id=$1', [f.entityId]);
  await f.authorizeIssuance();
  assert.deepEqual((await f.delivery.read(f.asset.id, f.token, f.requester)).buffer, bytes);

  const highlightId = randomUUID();
  await pool.query(`INSERT INTO highlights(id,owner_id,title) VALUES($1,$2,'Synthetic retained story')`, [highlightId, f.owner.id]);
  await pool.query('UPDATE stories SET is_highlight=false,highlight_id=$2 WHERE id=$1', [f.entityId, highlightId]);
  await f.authorizeIssuance();
  assert.deepEqual((await f.delivery.read(f.asset.id, f.token, f.requester)).buffer, bytes);

  await pool.query('INSERT INTO highlight_items(highlight_id,story_id) VALUES($1,$2)', [highlightId, f.entityId]);
  await pool.query('UPDATE stories SET highlight_id=NULL WHERE id=$1', [f.entityId]);
  await f.authorizeIssuance();
  assert.deepEqual((await f.delivery.read(f.asset.id, f.token, f.requester)).buffer, bytes);

  await pool.query('DELETE FROM highlight_items WHERE highlight_id=$1 AND story_id=$2', [highlightId, f.entityId]);
  await assert.rejects(f.authorizeIssuance, MediaLifecycleError);
  await assert.rejects(() => f.delivery.read(f.asset.id, f.token, f.requester), MediaLifecycleError);
  assert.equal(f.providerCalls(), 1, 'removing the final highlight retention must close cached story access');
});

test('message attachment expiry uses the database UTC clock for near-future content', async t => {
  const f = await ephemeralFixture(t, 'messages');
  await pool.query('UPDATE messages SET expires_at=$2 WHERE id=$1', [f.entityId, new Date(Date.now() + 60_000).toISOString()]);
  await f.authorizeIssuance();
  assert.deepEqual((await f.delivery.read(f.asset.id, f.token, f.requester)).buffer, bytes);
});

test('message expiry during awaited contact authorization prevents grant issuance', async t => {
  let expire: (() => Promise<unknown>) | undefined;
  const contacts = { ...allowTestContacts, async requirePairwiseContacts() { await expire?.(); } } as unknown as ContactAuthorizationService;
  const f = await ephemeralFixture(t, 'messages', undefined, contacts);
  expire = f.expire;
  await assert.rejects(f.authorizeIssuance, MediaLifecycleError);
  assert.equal(f.providerCalls(), 0);
});

for (const storageType of ['timestamp without time zone', 'timestamp with time zone'] as const) {
  for (const entityType of ['stories', 'user_notes', 'messages'] as const) {
    test(`${entityType} media expiry supports ${storageType} in non-UTC database sessions`, async t => {
      const f = await ephemeralFixture(t, entityType);
      const client = await pool.connect();
      try {
        // Model fresh and additive-migration column types in this connection's
        // private table. The real schema and other test processes stay intact.
        await client.query(`CREATE TEMP TABLE "${entityType}" (LIKE public."${entityType}" INCLUDING DEFAULTS)`);
        await client.query(`ALTER TABLE pg_temp."${entityType}" ALTER COLUMN expires_at TYPE ${storageType} USING expires_at::${storageType}`);
        await client.query(`INSERT INTO pg_temp."${entityType}" SELECT * FROM public."${entityType}" WHERE id=$1`, [f.entityId]);
        const query = t.mock.method(pool, 'query', ((...args: any[]) => (client.query as any)(...args)) as any);
        try {
          for (const timezone of ['Europe/Berlin', 'America/New_York']) {
            await client.query('SELECT set_config(\'TimeZone\',$1,false)', [timezone]);
            assert.deepEqual((await client.query(`SELECT current_setting('TimeZone') AS timezone,pg_typeof(expires_at)::text AS storage_type
              FROM pg_temp."${entityType}" WHERE id=$1`, [f.entityId])).rows[0], { timezone, storage_type: storageType });
            await client.query(`UPDATE pg_temp."${entityType}" SET expires_at=$2 WHERE id=$1`,
              [f.entityId, new Date(Date.now() + 60_000).toISOString()]);
            await f.authorizeIssuance();
            assert.deepEqual((await f.delivery.read(f.asset.id, f.token, f.requester)).buffer, bytes, `${timezone}: future content remains available`);
            const providerCalls = f.providerCalls();

            await client.query(`UPDATE pg_temp."${entityType}" SET expires_at=$2 WHERE id=$1`,
              [f.entityId, new Date(Date.now() - 60_000).toISOString()]);
            await assert.rejects(f.authorizeIssuance, MediaLifecycleError, `${timezone}: expired content cannot mint a grant`);
            await assert.rejects(() => f.delivery.read(f.asset.id, f.token, f.requester), MediaLifecycleError,
              `${timezone}: expired content cannot release cached bytes`);
            await assert.rejects(() => f.delivery.read(f.asset.id, f.renewToken(), f.requester), MediaLifecycleError);
            assert.equal(f.providerCalls(), providerCalls);
          }
        } finally {
          query.mock.restore();
        }
      } finally {
        try {
          await client.query(`DROP TABLE IF EXISTS pg_temp."${entityType}"`);
          await client.query('RESET TIME ZONE');
        } finally { client.release(); }
      }
    });
  }
}
