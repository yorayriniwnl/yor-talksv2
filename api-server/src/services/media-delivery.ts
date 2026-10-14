import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pool } from '@workspace/db';
import { env } from '../config/env.js';
import { MediaLifecycleError, mediaIdentity, mediaIntent, type MediaAssetRow } from './media-service.js';
import { StorageService } from './storage-service.js';
import { runMediaProcess } from './media-byte-verification.js';
import type { MediaProvider } from './media-provider.js';
import { defaultMediaAuthorizationService, type MediaGrantContext, type MediaRequester, type MediaAuthorizationService } from './media-authorization-service.js';

type Variant = 'original' | 'poster';
type Grant = MediaGrantContext;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function signature(value:string):Buffer {
  return createHmac('sha256',env.JWT_SECRET).update('yor-talks:approved-media-delivery:v2:').update(value).digest();
}
export function mediaDeliveryUrl(context:Omit<Grant,'v'|'exp'>):string {
  const grant:Grant={...context,v:2,exp:Math.floor(Date.now()/1000)+env.MEDIA_SIGNED_URL_TTL_SECONDS};
  const body=Buffer.from(JSON.stringify(grant)).toString('base64url');
  return new URL(`/api/media/${grant.assetId}/content?token=${body}.${signature(body).toString('base64url')}`,env.MEDIA_DELIVERY_ORIGIN||env.CLIENT_ORIGIN).href;
}
function verifyGrant(id:string,token:string):Grant {
  try {
    if(!uuid.test(id)||token.length>1024)throw new Error();
    const [body,mac,...rest]=token.split('.');
    if(!body||!mac||rest.length)throw new Error();
    const supplied=Buffer.from(mac,'base64url'),expected=signature(body);
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw new Error();
    const parsed=JSON.parse(Buffer.from(body,'base64url').toString('utf8')) as Grant;
    const now=Math.floor(Date.now()/1000);
    if(parsed.v!==2||parsed.assetId!==id||!uuid.test(parsed.entityId)||typeof parsed.slot!=='string'||!parsed.slot||parsed.slot.length>80
      ||!['original','poster'].includes(parsed.variant)||typeof parsed.ownerPreview!=='boolean'
      ||!Number.isSafeInteger(parsed.exp)||parsed.exp<=now||parsed.exp>now+env.MEDIA_SIGNED_URL_TTL_SECONDS
      ||typeof parsed.policyRevision!=='string'||!parsed.policyRevision||parsed.policyRevision.length>256)throw new Error();
    if(parsed.viewer?.kind==='user'){
      if(!uuid.test(parsed.viewer.userId)||!uuid.test(parsed.viewer.deviceId)||!Number.isSafeInteger(parsed.viewer.authVersion)
        ||typeof parsed.viewer.eligibilityRevision!=='string'||!parsed.viewer.eligibilityRevision)throw new Error();
    }else if(parsed.viewer?.kind==='anonymous'){
      if(typeof parsed.viewer.eligibilityRevision!=='string'||!parsed.viewer.eligibilityRevision)throw new Error();
    }else throw new Error();
    if(typeof parsed.entityType!=='string'||!['users','posts','stories','user_notes','videos','articles','products','events','live_streams','communities','comments','video_comments','messages','highlights','profile_showcases','business_profiles','broadcast_channels','owner-preview'].includes(parsed.entityType))throw new Error();
    if(parsed.ownerPreview!==(parsed.entityType==='owner-preview'))throw new Error();
    return parsed;
  }catch{throw new MediaLifecycleError('Media delivery grant is invalid or expired',403,'media_delivery_denied');}
}
let posters=0;
export async function createVerifiedVideoPoster(buffer:Buffer,mime:string):Promise<Buffer> {
  if(!['video/mp4','video/webm'].includes(mime)||buffer.length>10*1024*1024)throw new MediaLifecycleError('Invalid poster source',415,'media_verification_failed');
  if(posters>=env.MEDIA_DECODE_CONCURRENCY)throw new MediaLifecycleError('Media delivery is busy',503,'media_processing_unavailable');
  posters++;let directory:string|undefined;
  try{
    directory=await mkdtemp(join(tmpdir(),'yor-media-poster-'));const input=join(directory,'original.bin'),output=join(directory,'poster.jpg');
    await writeFile(input,buffer,{flag:'wx',mode:0o600});
    await runMediaProcess(env.MEDIA_FFMPEG_PATH,['-v','error','-nostdin','-threads','1','-max_alloc','67108864',
      '-protocol_whitelist','file,pipe','-f',mime==='video/mp4'?'mov':'matroska',...(mime==='video/mp4'?['-enable_drefs','0']:[]),
      '-i',input,'-map','0:v:0','-frames:v','1','-vf','scale=960:960:force_original_aspect_ratio=decrease','-threads','1','-q:v','3','-f','image2',output],env.MEDIA_DECODE_TIMEOUT_MS,directory);
    const result=await readFile(output);
    if(!result.length||result.length>2*1024*1024||result.readUInt16BE(0)!==0xffd8||result.readUInt16BE(result.length-2)!==0xffd9)throw new Error();
    return result;
  }finally{posters--;if(directory)await rm(directory,{recursive:true,force:true});}
}
/** Never give viewers a provider path token: after deletion a signed upload can
 * recreate that path. Every delivery rechecks approval; returned bytes must
 * match the approved SHA, and posters are derived from those exact bytes. */
export class MediaDeliveryService {
  private readonly cache=new Map<string,{expires:number;buffer:Buffer;mime:string}>();
  private readonly loading=new Map<string,Promise<{buffer:Buffer;mime:string}>>();
  constructor(private readonly provider:MediaProvider=new StorageService(),private readonly poster=createVerifiedVideoPoster,
    private readonly authorization:MediaAuthorizationService=defaultMediaAuthorizationService){}
  async read(id:string,token:string,requester:MediaRequester={}):Promise<{buffer:Buffer;mime:string}> {
    const grant=verifyGrant(id,token);
    const row=(await pool.query<MediaAssetRow>(`SELECT * FROM media_assets WHERE id=$1 AND status='approved' AND deletion_status='none'
      AND ($2::boolean OR EXISTS(SELECT 1 FROM media_references WHERE media_id=$1 AND entity_type=$3 AND entity_id=$4 AND slot=$5))`,
      [id,grant.ownerPreview,grant.entityType,grant.entityId,grant.slot])).rows[0];
    const identity=row&&mediaIdentity(row);
    if(!row||!identity||!/^[a-f0-9]{64}$/.test(row.sha256??''))throw new MediaLifecycleError('Media is no longer available',404,'media_not_available');
    await this.authorization.authorize(grant,row,requester);
    if(grant.variant==='poster'&&!row.verified_mime?.startsWith('video/'))throw new MediaLifecycleError('No video poster is available',404,'media_not_available');
    const key=`${id}:${row.sha256}:${grant.variant}`,cached=this.cache.get(key);
    if(cached&&cached.expires>Date.now()) { await this.authorization.authorize(grant,row,requester); return cached; }
    const pending=this.loading.get(key);if(pending) { const result=await pending; await this.authorization.authorize(grant,row,requester); return result; }
    if(this.loading.size>=env.MEDIA_DECODE_CONCURRENCY)throw new MediaLifecycleError('Media delivery is busy',503,'media_processing_unavailable');
    const work=(async()=>{
      const verified=await this.provider.verifyUpload(mediaIntent(row),identity);
      if(verified.sha256!==row.sha256||createHash('sha256').update(verified.buffer).digest('hex')!==row.sha256||verified.bytes!==row.verified_bytes
        ||verified.mimeType!==row.verified_mime)throw new MediaLifecycleError('Provider bytes changed after approval',415,'media_verification_failed');
      const result={buffer:grant.variant==='poster'?await this.poster(verified.buffer,verified.mimeType):verified.buffer,mime:grant.variant==='poster'?'image/jpeg':verified.mimeType};
      // Revocation can commit while the provider/decoder was running.
      const stillCurrent=(await pool.query<MediaAssetRow>(`SELECT * FROM media_assets WHERE id=$1 AND status='approved' AND deletion_status='none'
        AND ($2::boolean OR EXISTS(SELECT 1 FROM media_references WHERE media_id=$1 AND entity_type=$3 AND entity_id=$4 AND slot=$5))`,
        [id,grant.ownerPreview,grant.entityType,grant.entityId,grant.slot])).rows[0];
      if(!stillCurrent||stillCurrent.sha256!==row.sha256||stillCurrent.verified_bytes!==row.verified_bytes||stillCurrent.verified_mime!==row.verified_mime)
        throw new MediaLifecycleError('Media is no longer available',404,'media_not_available');
      await this.authorization.authorize(grant,stillCurrent,requester);
      while(this.cache.size>=3)this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key,{...result,expires:Date.now()+30_000});return result;
    })();
    this.loading.set(key,work);try{const result=await work;await this.authorization.authorize(grant,row,requester);return result;}finally{this.loading.delete(key);}
  }
}
