import type { RequestHandler } from 'express';
import { pool } from '@workspace/db';
import { mediaIdentity, type MediaAssetRow } from './media-service.js';
import type { MediaProvider } from './media-provider.js';
import { createResponse } from '../utils/response.js';
import { mediaDeliveryUrl } from './media-delivery.js';

const fields=new Set(['url','avatarUrl','mediaUrl','videoUrl','coverUrl','thumbnailUrl','customImageUrl','logoUrl','images']);
const untrusted=new Set(['content','metadata','payload','privacy','settings','premiumStyle','storyTextStyle','stickers','productSnapshot','socialLinks','links','customText','textContent','description','body','reactions','preferences','dataJson']);
const containers=new Set(['data','items','results','rows','entries','posts','post','comments','comment','replies','stories','story','videos','video','messages','message','users','user','author','sender','recipient','owner','host','seller','products','product','articles','article','events','event','streams','stream','channels','channel','highlights','highlight','showcases','showcase','communities','community','businesses','business','members','participants','conversations','conversation','profile','feed','notifications','notification','notes','note','threads','thread']);
const trusted=(key:string)=>!untrusted.has(key)&&(fields.has(key)||containers.has(key));
const marker=/^(media|media-poster):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
type Context={entityId?:string;previewId?:string;avatarOwner?:string};
/** Only actual entity references, or an authenticated owner's completion DTO,
 * may mint URLs. A marker in free text/arbitrary JSON is never sufficient. */
export async function hydrateMediaValue<T>(value:T,provider?:Pick<MediaProvider,'signedDeliveryUrl'|'signedPosterUrl'>,viewerId?:string):Promise<T> {
  const wanted=new Set<string>(),entities=new Set<string>();
  function context(item:Record<string,unknown>,parent:Context):Context {
    const id=typeof item.id==='string'?item.id:parent.entityId;
    const avatarOwner=typeof item.authorId==='string'?item.authorId:typeof item.senderId==='string'?item.senderId:id;
    return {entityId:id,avatarOwner,previewId:item.status==='approved'&&item.mediaId===item.id&&typeof item.mediaId==='string'?item.mediaId:undefined};
  }
  function discover(item:unknown,key='',scope:Context={}):void {
    if(typeof item==='string'&&fields.has(key)) {
      const match=item.match(marker);if(match){wanted.add(match[2]!);if(scope.entityId)entities.add(scope.entityId);if(key==='avatarUrl'&&scope.avatarOwner)entities.add(scope.avatarOwner);}
    }else if(Array.isArray(item))item.forEach(child=>discover(child,key,scope));
    else if(item&&typeof item==='object') {
      const scopeNext=context(item as Record<string,unknown>,scope);
      for(const [childKey,child]of Object.entries(item))if(trusted(childKey))discover(child,childKey,scopeNext);
    }
  }
  discover(value);if(!wanted.size)return value;
  const safeEntities=[...entities].filter(id=>/^[0-9a-f-]{36}$/i.test(id));
  const [assets,references]=await Promise.all([
    pool.query<MediaAssetRow>(`SELECT * FROM media_assets WHERE id=ANY($1::uuid[]) AND status='approved' AND deletion_status='none'`,[[...wanted]]),
    pool.query<{media_id:string;entity_id:string}>(`SELECT media_id,entity_id FROM media_references WHERE media_id=ANY($1::uuid[]) AND entity_id=ANY($2::uuid[])`,[[...wanted],safeEntities]),
  ]);
  const byId=new Map(assets.rows.map(row=>[row.id,row])),uses=new Set(references.rows.map(row=>`${row.entity_id}:${row.media_id}`));
  function transform(item:unknown,key='',scope:Context={}):unknown {
    if(typeof item==='string'&&fields.has(key)) {
      const match=item.match(marker);if(!match)return item;
      const row=byId.get(match[2]!),identity=row&&mediaIdentity(row);
      const referenced=uses.has(`${scope.entityId}:${match[2]}`)||(key==='avatarUrl'&&uses.has(`${scope.avatarOwner}:${match[2]}`));
      const ownedPreview=scope.previewId===match[2]&&viewerId!==undefined&&row?.owner_id===viewerId;
      if(!identity||(!referenced&&!ownedPreview))return null;
      if(match[1]==='media-poster'&&!row!.verified_mime?.startsWith('video/'))return null;
      if(provider)return match[1]==='media-poster'?provider.signedPosterUrl(identity):provider.signedDeliveryUrl(identity);
      return mediaDeliveryUrl(row!.id,match[1]==='media-poster'?'poster':'original',ownedPreview);
    }
    if(Array.isArray(item))return item.map(child=>transform(child,key,scope));
    if(item&&typeof item==='object'){
      const scopeNext=context(item as Record<string,unknown>,scope);
      return Object.fromEntries(Object.entries(item).map(([childKey,child])=>[childKey,trusted(childKey)?transform(child,childKey,scopeNext):child]));
    }
    return item;
  }
  return transform(value)as T;
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
