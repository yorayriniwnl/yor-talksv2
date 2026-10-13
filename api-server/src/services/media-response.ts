import type { RequestHandler } from 'express';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { MediaAuthorizationService, type MediaEntityType, type MediaGrantContext, type MediaRequester, type MediaViewer } from './media-authorization-service.js';
import { mediaIdentity, type MediaAssetRow } from './media-service.js';
import type { MediaProvider } from './media-provider.js';
import { EligibilityService } from './eligibility-service.js';
import { loadOperatorPolicyIds } from '../eligibility/territory-policy.js';
import { createResponse } from '../utils/response.js';
import { mediaDeliveryUrl } from './media-delivery.js';

const fields=new Set(['url','avatarUrl','mediaUrl','videoUrl','coverUrl','thumbnailUrl','customImageUrl','logoUrl','images']);
const untrusted=new Set(['content','metadata','payload','privacy','settings','premiumStyle','storyTextStyle','stickers','productSnapshot','socialLinks','links','customText','textContent','description','body','reactions','preferences','dataJson']);
const containers=new Set(['data','items','results','rows','entries','posts','post','comments','comment','replies','stories','story','videos','video','messages','message','users','user','author','sender','recipient','owner','host','seller','follower','target','requester','caller','viewers','products','product','articles','article','events','event','streams','stream','channels','channel','highlights','highlight','showcases','showcase','communities','community','businesses','business','members','participants','conversations','conversation','profile','feed','notifications','notification','notes','note','threads','thread']);
const marker=/^(media|media-poster):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
type Context={entityType?:MediaEntityType;entityId?:string;previewId?:string;avatarOwner?:string};
const keyEntity:Record<string,MediaEntityType>={
  posts:'posts',post:'posts',stories:'stories',story:'stories',videos:'videos',video:'videos',messages:'messages',message:'messages',
  notes:'user_notes',note:'user_notes',articles:'articles',article:'articles',products:'products',product:'products',events:'events',event:'events',
  communities:'communities',community:'communities',comments:'comments',comment:'comments',replies:'comments',streams:'live_streams',stream:'live_streams',
  highlights:'highlights',highlight:'highlights',showcases:'profile_showcases',showcase:'profile_showcases',businesses:'business_profiles',business:'business_profiles',
  channels:'broadcast_channels',channel:'broadcast_channels',
};
const allowedEntityTypes=new Set<MediaEntityType>(['users','posts','stories','user_notes','videos','articles','products','events','live_streams','communities','comments','video_comments','messages','highlights','profile_showcases','business_profiles','broadcast_channels','owner-preview']);
const trusted=(key:string)=>!untrusted.has(key)&&(fields.has(key)||containers.has(key));
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function entityTypeFor(item:Record<string,unknown>,key:string):MediaEntityType|undefined {
  if(keyEntity[key])return keyEntity[key];
  if('conversationId'in item&&'senderId'in item)return 'messages';
  if('publishMode'in item&&'authorId'in item)return 'stories';
  if('distributionMode'in item&&'authorId'in item)return 'posts';
  if('videoUrl'in item&&'authorId'in item)return 'videos';
  if('sellerId'in item)return 'products';
  if('hostId'in item&&'startsAt'in item)return 'events';
  if('hostId'in item&&'guestIds'in item)return 'live_streams';
  if('ownerId'in item&&'slug'in item)return 'communities';
  if('videoId'in item&&'authorId'in item)return 'video_comments';
  if('postId'in item&&'authorId'in item)return 'comments';
  if('readTime'in item&&'excerpt'in item)return 'articles';
  if('expiresAt'in item&&'audience'in item&&'authorId'in item)return 'user_notes';
  return undefined;
}

function nextContext(item:Record<string,unknown>,parent:Context,key:string):Context {
  const inferred=entityTypeFor(item,key)??parent.entityType;
  const itemId=uuid(item.id)?item.id:parent.entityId;
  const avatarOwner=uuid(item.authorId)?item.authorId:uuid(item.senderId)?item.senderId:uuid(item.id)?item.id:parent.avatarOwner;
  return {
    entityType:inferred,
    entityId:itemId,
    avatarOwner,
    previewId:item.status==='approved'&&item.mediaId===item.id&&uuid(item.mediaId)?item.mediaId:undefined,
  };
}

async function viewerFor(requester?:MediaRequester):Promise<MediaViewer> {
  const eligibility=new EligibilityService();
  if(requester?.userId&&requester.deviceId&&Number.isSafeInteger(requester.authVersion)) {
    const decision=await eligibility.decisionFor(requester.userId);
    return {kind:'user',userId:requester.userId,deviceId:requester.deviceId,authVersion:requester.authVersion!,eligibilityRevision:decision.revision};
  }
  const decision=await eligibility.publicDecision({operatorPolicyIds:loadOperatorPolicyIds()});
  return {kind:'anonymous',eligibilityRevision:decision.revision};
}

/** Only an exact entity/reference pair, or its authenticated owner's completion DTO, can mint a grant. */
export async function hydrateMediaValue<T>(value:T,provider?:Pick<MediaProvider,'signedDeliveryUrl'|'signedPosterUrl'>,
  requester?:MediaRequester|string,authorization=new MediaAuthorizationService()):Promise<T> {
  const legacyViewerId=typeof requester==='string'?requester:undefined;
  const requesterContext=typeof requester==='object'&&requester?requester:{};
  // Provider URLs are retained only for legacy test fixtures. Deployed response
  // paths always issue viewer-bound application grants.
  const testProvider=env.NODE_ENV==='production'?undefined:provider;
  let viewer:MediaViewer|undefined;
  const wanted=new Set<string>(),candidateKeys=new Set<string>(),previewIds=new Set<string>();
  function context(item:Record<string,unknown>,parent:Context,key:string):Context {
    const scope=nextContext(item,parent,key);
    if(key==='users'||key==='user'||key==='author'||key==='sender'||key==='recipient'||key==='owner') {
      const id=uuid(item.id)?item.id:uuid(item.userId)?item.userId:undefined;
      return {...scope,entityType:'users',entityId:id??scope.entityId,avatarOwner:id??scope.avatarOwner};
    }
    return scope;
  }
  function discover(item:unknown,key='',scope:Context={}):void {
    if(typeof item==='string'&&fields.has(key)) {
      const match=item.match(marker);if(!match)return;
      wanted.add(match[2]!);
      if(scope.previewId===match[2])previewIds.add(match[2]!);
      else if(key==='avatarUrl'&&scope.avatarOwner)candidateKeys.add(`${match[2]}|users|${scope.avatarOwner}|avatarUrl`);
      else if(scope.entityType&&scope.entityId)candidateKeys.add(`${match[2]}|${scope.entityType}|${scope.entityId}|${key}`);
      else if(scope.entityId)candidateKeys.add(`${match[2]}|*|${scope.entityId}|${key}`);
    } else if(Array.isArray(item))item.forEach(child=>discover(child,key,scope));
    else if(item&&typeof item==='object') {
      const scopeNext=context(item as Record<string,unknown>,scope,key);
      for(const [childKey,child]of Object.entries(item))if(trusted(childKey))discover(child,childKey,scopeNext);
    }
  }
  discover(value);
  if(wanted.size&&typeof requester!=='string')viewer=await viewerFor(requester);
  const assetsResult=wanted.size?await pool.query<MediaAssetRow>(
    `SELECT * FROM media_assets WHERE id=ANY($1::uuid[]) AND status='approved' AND deletion_status='none'`,[[...wanted]]):{rows:[] as MediaAssetRow[]};
  const referenceResult=wanted.size?await pool.query<{media_id:string;entity_type:string;entity_id:string;slot:string}>(
    `SELECT media_id,entity_type,entity_id,slot FROM media_references WHERE media_id=ANY($1::uuid[])`,[[...wanted]]):{rows:[] as Array<{media_id:string;entity_type:string;entity_id:string;slot:string}>};
  const byId=new Map(assetsResult.rows.map(row=>[row.id,row]));
  const references=new Set(referenceResult.rows.map(row=>`${row.media_id}|${row.entity_type}|${row.entity_id}|${row.slot}`));
  const grants=new Map<string,string>();
  if(viewer?.kind==='user')for(const mediaId of previewIds) {
    const asset=byId.get(mediaId);
    if(asset?.owner_id===viewer.userId)candidateKeys.add(`${mediaId}|owner-preview|${viewer.userId}|ownerPreview`);
  }
  if(testProvider&&legacyViewerId)for(const mediaId of previewIds) {
    const asset=byId.get(mediaId);
    if(asset?.owner_id===legacyViewerId)candidateKeys.add(`${mediaId}|owner-preview|${legacyViewerId}|ownerPreview`);
  }
  if(viewer||testProvider)for(const candidate of candidateKeys) {
    const [mediaId,requestedType,entityId,slot]=candidate.split('|');
    if(!mediaId||!requestedType||!entityId||!slot)continue;
    const asset=byId.get(mediaId);if(!asset)continue;
    const ownerPreview=requestedType==='owner-preview';
    const entityTypes=requestedType==='*'
      ? referenceResult.rows.filter(reference=>reference.media_id===mediaId&&reference.entity_id===entityId&&reference.slot===slot).map(reference=>reference.entity_type)
      : [requestedType];
    if(ownerPreview&&asset.owner_id!==((viewer?.kind==='user'&&viewer.userId)||legacyViewerId))continue;
    for(const entityType of entityTypes) {
    if(!allowedEntityTypes.has(entityType as MediaEntityType))continue;
    if(!ownerPreview&&!references.has(`${mediaId}|${entityType}|${entityId}|${slot}`))continue;
    const typedEntity=entityType as MediaEntityType;
    for(const variant of ['original','poster'] as const) {
      if(variant==='poster'&&!asset.verified_mime?.startsWith('video/'))continue;
      const identity=mediaIdentity(asset);if(!identity)continue;
      const grantContext:Omit<MediaGrantContext,'v'|'exp'>|undefined=viewer
        ? {assetId:asset.id,entityType:typedEntity,entityId,slot,variant,ownerPreview,viewer,policyRevision:viewer.eligibilityRevision}
        : undefined;
      if(grantContext&&!testProvider) {
        try { await authorization.authorize({...grantContext,v:2,exp:Math.floor(Date.now()/1000)+env.MEDIA_SIGNED_URL_TTL_SECONDS},asset,requesterContext); }
        catch { continue; }
      }
      const url=testProvider
        ? (variant==='poster'?testProvider.signedPosterUrl(identity):testProvider.signedDeliveryUrl(identity))
        : grantContext?mediaDeliveryUrl(grantContext):undefined;
      if(!url)continue;
      grants.set(`${mediaId}|${entityType}|${entityId}|${slot}|${variant}`,url);
      if(requestedType==='*')grants.set(`${mediaId}|*|${entityId}|${slot}|${variant}`,url);
    }
    }
  }
  function transform(item:unknown,key='',scope:Context={}):unknown {
    if(typeof item==='string'&&fields.has(key)) {
      const match=item.match(marker);
      if(!match) {
        if(env.NODE_ENV==='production'&&/^https?:\/\//i.test(item))return null;
        return item;
      }
      const previewOwner=viewer?.kind==='user'?viewer.userId:legacyViewerId;
      const candidate=scope.previewId===match[2]&&previewOwner
        ? `${match[2]}|owner-preview|${previewOwner}|ownerPreview`
        : key==='avatarUrl'&&scope.avatarOwner?`${match[2]}|users|${scope.avatarOwner}|avatarUrl`
        : scope.entityType&&scope.entityId?`${match[2]}|${scope.entityType}|${scope.entityId}|${key}`
        : scope.entityId?`${match[2]}|*|${scope.entityId}|${key}`:'';
      const poster=match[1]==='media-poster';
      return grants.get(`${candidate}|${poster?'poster':'original'}`)??null;
    }
    if(Array.isArray(item))return item.map(child=>transform(child,key,scope));
    if(item&&typeof item==='object'){
      const scopeNext=context(item as Record<string,unknown>,scope,key);
      return Object.fromEntries(Object.entries(item).map(([childKey,child])=>[childKey,trusted(childKey)?transform(child,childKey,scopeNext):child]));
    }
    return item;
  }
  return transform(value)as T;
}

export const mediaResponse:RequestHandler=(req,res,next)=>{
  const json=res.json.bind(res);
  res.json=((body:unknown)=>{
    const requester=req.user&&req.sessionIdentity?{userId:req.user.id,deviceId:req.sessionIdentity.deviceId,authVersion:req.sessionIdentity.authVersion}:undefined;
    res.setHeader('Cache-Control','private, no-store');
    void hydrateMediaValue(body,undefined,requester).then(result=>{if(!res.destroyed&&!res.writableEnded)json(result);}).catch(()=>{
      if(!res.destroyed&&!res.writableEnded){res.status(503);json(createResponse('Media delivery is temporarily unavailable',null,{},['media_delivery_unavailable']));}
    });return res;
  })as typeof res.json;
  next();
};
