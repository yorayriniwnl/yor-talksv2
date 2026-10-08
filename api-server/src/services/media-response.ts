import type { RequestHandler } from 'express';
import { pool } from '@workspace/db';
import { mediaIdentity, type MediaAssetRow } from './media-service.js';
import type { MediaProvider } from './media-provider.js';
import { createResponse } from '../utils/response.js';
import { mediaDeliveryUrl } from './media-delivery.js';
import { MESSAGE_CURRENT_SQL, messageMembershipSql, messagePreviewEntitledSql, conversationAuthorizationSql } from '../repositories/message-visibility.js';

const fields=new Set(['url','avatarUrl','mediaUrl','videoUrl','coverUrl','thumbnailUrl','customImageUrl','logoUrl','images']);
const untrusted=new Set(['content','metadata','payload','privacy','settings','premiumStyle','storyTextStyle','stickers','productSnapshot','socialLinks','links','customText','textContent','description','body','reactions','preferences','dataJson']);
const containers=new Set(['data','items','results','rows','entries','posts','post','comments','comment','replies','stories','story','videos','video','messages','message','users','user','author','sender','recipient','owner','host','seller','follower','target','requester','caller','viewers','products','product','articles','article','events','event','streams','stream','channels','channel','highlights','highlight','showcases','showcase','communities','community','businesses','business','members','participants','conversations','conversation','profile','feed','notifications','notification','notes','note','threads','thread']);
containers.add('lastMessage');containers.add('sentMessages');containers.add('receivedMessages');
const trusted=(key:string)=>!untrusted.has(key)&&(fields.has(key)||containers.has(key));
const marker=/^(media|media-poster):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
type Context={entityId?:string;previewId?:string;avatarOwner?:string};

/** Final publication boundary for text as well as media. Stale service results
 * are revalidated after any asynchronous hydration work, never resurfaced.
 * Preview gets the additional unread/sender boundary without adding receipts. */
export async function currentMessageResponse<T>(value:T,viewerId?:string):Promise<T> {
  const wanted=new Set<string>(),previews=new Set<string>(),conversations=new Set<string>();
  const isMessage=(item:Record<string,unknown>)=>typeof item.id==='string'&&/^[0-9a-f-]{36}$/i.test(item.id)
    &&typeof item.conversationId==='string'&&typeof item.content==='string';
  const isConversation=(item:Record<string,unknown>)=>typeof item.id==='string'&&/^[0-9a-f-]{36}$/i.test(item.id)
    &&'participantA'in item&&'participantB'in item&&'isGroup'in item;
  function visit(item:unknown):void {
    if(Array.isArray(item))item.forEach(visit);
    else if(item&&typeof item==='object') {
      const row=item as Record<string,unknown>;
      if(isMessage(row)){wanted.add(row.id as string);if(row.messageState==='MESSAGE_PREVIEWED')previews.add(row.id as string);}
      if(isConversation(row))conversations.add(row.id as string);
      for(const [key,child]of Object.entries(row))if(!untrusted.has(key)||row.format==='yor-talks-account-export')visit(child);
    }
  }
  visit(value);if(!wanted.size&&!conversations.size)return value;
  const [current,currentConversations]=await Promise.all([
    viewerId&&wanted.size?pool.query<{id:string;unread:boolean}>(`SELECT m.id,
    (${messagePreviewEntitledSql('$2')} AND m.sender_id<>$2::uuid AND (m.recipient_id IS DISTINCT FROM $2::uuid OR m.seen_at IS NULL)
      AND NOT EXISTS(SELECT 1 FROM message_reads mr WHERE mr.message_id=m.id AND mr.user_id=$2::uuid)) unread
    FROM messages m WHERE m.id=ANY($1::uuid[]) AND ${MESSAGE_CURRENT_SQL} AND ${messageMembershipSql('$2')}`,
    [[...wanted],viewerId]).then(result=>result.rows):Promise.resolve([]),
    viewerId&&conversations.size?pool.query<{id:string}>(`SELECT c.id FROM conversations c WHERE c.id=ANY($1::uuid[]) AND ${conversationAuthorizationSql('$2')}`,
      [[...conversations],viewerId]).then(result=>result.rows):Promise.resolve([]),
  ]);
  const available=new Set(current.filter(row=>!previews.has(row.id)||row.unread).map(row=>row.id));
  const availableConversations=new Set(currentConversations.map(row=>row.id));
  function filter(item:unknown):unknown {
    if(Array.isArray(item))return item.map(filter).filter(child=>child!==null);
    if(item&&typeof item==='object'){
      const row=item as Record<string,unknown>;
      if(isMessage(row)&&!available.has(row.id as string))return null;
      if(isConversation(row)&&!availableConversations.has(row.id as string))return null;
      if(row.conversation&&typeof row.conversation==='object'&&isConversation(row.conversation as Record<string,unknown>)
        &&!availableConversations.has((row.conversation as Record<string,unknown>).id as string))return null;
      return Object.fromEntries(Object.entries(row).map(([key,child])=>[key,!untrusted.has(key)||row.format==='yor-talks-account-export'?filter(child):child]));
    }
    return item;
  }
  return filter(value)as T;
}
/** Only actual entity references, or an authenticated owner's completion DTO,
 * may mint URLs. A marker in free text/arbitrary JSON is never sufficient. */
export async function hydrateMediaValue<T>(value:T,provider?:Pick<MediaProvider,'signedDeliveryUrl'|'signedPosterUrl'>,viewerId?:string):Promise<T> {
  const wanted=new Set<string>(),entities=new Set<string>();
  function context(item:Record<string,unknown>,parent:Context,key:string):Context {
    const id=typeof item.id==='string'?item.id:parent.entityId;
    const avatarOwner=key==='viewers'&&typeof item.viewerId==='string'?item.viewerId:typeof item.authorId==='string'?item.authorId:typeof item.senderId==='string'?item.senderId:id;
    return {entityId:id,avatarOwner,previewId:item.status==='approved'&&item.mediaId===item.id&&typeof item.mediaId==='string'?item.mediaId:undefined};
  }
  function discover(item:unknown,key='',scope:Context={}):void {
    if(typeof item==='string'&&fields.has(key)) {
      const match=item.match(marker);if(match){wanted.add(match[2]!);if(scope.entityId)entities.add(scope.entityId);if(key==='avatarUrl'&&scope.avatarOwner)entities.add(scope.avatarOwner);}
    }else if(Array.isArray(item))item.forEach(child=>discover(child,key,scope));
    else if(item&&typeof item==='object') {
      const scopeNext=context(item as Record<string,unknown>,scope,key);
      for(const [childKey,child]of Object.entries(item))if(trusted(childKey))discover(child,childKey,scopeNext);
    }
  }
  discover(value);if(!wanted.size)return currentMessageResponse(value,viewerId);
  const safeEntities=[...entities].filter(id=>/^[0-9a-f-]{36}$/i.test(id));
  const [assets,references]=await Promise.all([
    pool.query<MediaAssetRow>(`SELECT * FROM media_assets WHERE id=ANY($1::uuid[]) AND status='approved' AND deletion_status='none'`,[[...wanted]]),
    pool.query<{media_id:string;entity_id:string;entity_type:string}>(`SELECT r.media_id,r.entity_id,r.entity_type FROM media_references r
      WHERE r.media_id=ANY($1::uuid[]) AND r.entity_id=ANY($2::uuid[])
      AND (r.entity_type<>'messages' OR ($3::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM messages m WHERE m.id=r.entity_id
        AND ${MESSAGE_CURRENT_SQL} AND ${messageMembershipSql('$3')})))`,[[...wanted],safeEntities,viewerId??null]),
  ]);
  const byId=new Map(assets.rows.map(row=>[row.id,row])),uses=new Set(references.rows.map(row=>`${row.entity_id}:${row.media_id}`));
  const messageUses=new Set(references.rows.filter(row=>row.entity_type==='messages').map(row=>`${row.entity_id}:${row.media_id}`));
  function transform(item:unknown,key='',scope:Context={}):unknown {
    if(typeof item==='string'&&fields.has(key)) {
      const match=item.match(marker);if(!match)return item;
      const row=byId.get(match[2]!),identity=row&&mediaIdentity(row);
      const referenced=uses.has(`${scope.entityId}:${match[2]}`)||(key==='avatarUrl'&&uses.has(`${scope.avatarOwner}:${match[2]}`));
      const ownedPreview=scope.previewId===match[2]&&viewerId!==undefined&&row?.owner_id===viewerId;
      if(!identity||(!referenced&&!ownedPreview))return null;
      if(match[1]==='media-poster'&&!row!.verified_mime?.startsWith('video/'))return null;
      if(provider&&!messageUses.has(`${scope.entityId}:${match[2]}`))return match[1]==='media-poster'?provider.signedPosterUrl(identity):provider.signedDeliveryUrl(identity);
      return mediaDeliveryUrl(row!.id,match[1]==='media-poster'?'poster':'original',ownedPreview,
        messageUses.has(`${scope.entityId}:${match[2]}`)?{messageId:scope.entityId!,viewerId:viewerId!}:undefined);
    }
    if(Array.isArray(item))return item.map(child=>transform(child,key,scope));
    if(item&&typeof item==='object'){
      const scopeNext=context(item as Record<string,unknown>,scope,key);
      return Object.fromEntries(Object.entries(item).map(([childKey,child])=>[childKey,trusted(childKey)?transform(child,childKey,scopeNext):child]));
    }
    return item;
  }
  return currentMessageResponse(transform(value)as T,viewerId);
}
export const mediaResponse:RequestHandler=(req,res,next)=>{
  const json=res.json.bind(res);
  res.json=((body:unknown)=>{
    void hydrateMediaValue(body,undefined,req.user?.id).then(result=>{if(!res.destroyed&&!res.writableEnded)json(result);}).catch(()=>{
      if(!res.destroyed&&!res.writableEnded){res.status(503);json(createResponse('Media delivery is temporarily unavailable',null,{},['media_delivery_unavailable']));}
    });return res;
  })as typeof res.json;
  next();
};
