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
import { MESSAGE_CURRENT_SQL, messageMembershipSql } from '../repositories/message-visibility.js';

type Variant = 'original' | 'poster';
type MessageGrantScope = {messageId:string;viewerId:string};
type Grant = { id: string; variant: Variant; exp: number; preview: boolean; messageId?:string;viewerId?:string };
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function signature(value:string):Buffer {
  return createHmac('sha256',env.JWT_SECRET).update('yor-talks:approved-media-delivery:v1:').update(value).digest();
}
export function mediaDeliveryUrl(id:string,variant:Variant,preview=false,scope?:MessageGrantScope):string {
  const body=Buffer.from(JSON.stringify({id,variant,preview,...scope,exp:Math.floor(Date.now()/1000)+env.MEDIA_SIGNED_URL_TTL_SECONDS} satisfies Grant)).toString('base64url');
  return new URL(`/api/media/${id}/content?token=${body}.${signature(body).toString('base64url')}`,env.MEDIA_DELIVERY_ORIGIN||env.CLIENT_ORIGIN).href;
}
function verifyGrant(id:string,token:string):Grant {
  try {
    if(!uuid.test(id)||token.length>512)throw new Error();
    const [body,mac,...rest]=token.split('.');
    if(!body||!mac||rest.length)throw new Error();
    const supplied=Buffer.from(mac,'base64url'),expected=signature(body);
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw new Error();
    const parsed=JSON.parse(Buffer.from(body,'base64url').toString('utf8')) as Grant;
    const now=Math.floor(Date.now()/1000);
    if(parsed.id!==id||!['original','poster'].includes(parsed.variant)||typeof parsed.preview!=='boolean'
      ||((parsed.messageId!==undefined||parsed.viewerId!==undefined)&&(!uuid.test(parsed.messageId??'')||!uuid.test(parsed.viewerId??'')||parsed.preview))
      ||!Number.isSafeInteger(parsed.exp)||parsed.exp<=now||parsed.exp>now+env.MEDIA_SIGNED_URL_TTL_SECONDS)throw new Error();
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
  constructor(private readonly provider:MediaProvider=new StorageService(),private readonly poster=createVerifiedVideoPoster){}
  private async authorizedRow(id:string,grant:Grant):Promise<MediaAssetRow> {
    if(grant.exp<=Math.floor(Date.now()/1000))throw new MediaLifecycleError('Media delivery grant is invalid or expired',403,'media_delivery_denied');
    const row=(await pool.query<MediaAssetRow>(`SELECT a.* FROM media_assets a WHERE a.id=$1 AND a.status='approved' AND a.deletion_status='none'
      AND (CASE WHEN $3::uuid IS NOT NULL THEN EXISTS(SELECT 1 FROM media_references r JOIN messages m ON m.id=r.entity_id
          WHERE r.media_id=a.id AND r.entity_type='messages' AND m.id=$3 AND ${MESSAGE_CURRENT_SQL} AND ${messageMembershipSql('$4')})
        ELSE (($2::boolean AND NOT EXISTS(SELECT 1 FROM media_references WHERE media_id=a.id))
          OR EXISTS(SELECT 1 FROM media_references WHERE media_id=a.id AND entity_type<>'messages')) END)`,
      [id,grant.preview,grant.messageId??null,grant.viewerId??null])).rows[0];
    if(!row)throw new MediaLifecycleError('Media is no longer available',404,'media_not_available');
    return row;
  }
  async read(id:string,token:string):Promise<{buffer:Buffer;mime:string}> {
    const grant=verifyGrant(id,token);
    const row=await this.authorizedRow(id,grant);
    const identity=row&&mediaIdentity(row);
    if(!row||!identity||!/^[a-f0-9]{64}$/.test(row.sha256??''))throw new MediaLifecycleError('Media is no longer available',404,'media_not_available');
    if(grant.variant==='poster'&&!row.verified_mime?.startsWith('video/'))throw new MediaLifecycleError('No video poster is available',404,'media_not_available');
    const key=`${id}:${row.sha256}:${grant.variant}`,cached=this.cache.get(key);
    if(cached&&cached.expires>Date.now()){await this.authorizedRow(id,grant);return cached;}
    const pending=this.loading.get(key);if(pending){const result=await pending;await this.authorizedRow(id,grant);return result;}
    if(this.loading.size>=env.MEDIA_DECODE_CONCURRENCY)throw new MediaLifecycleError('Media delivery is busy',503,'media_processing_unavailable');
    const work=(async()=>{
      const verified=await this.provider.verifyUpload(mediaIntent(row),identity);
      if(verified.sha256!==row.sha256||createHash('sha256').update(verified.buffer).digest('hex')!==row.sha256||verified.bytes!==row.verified_bytes
        ||verified.mimeType!==row.verified_mime)throw new MediaLifecycleError('Provider bytes changed after approval',415,'media_verification_failed');
      const result={buffer:grant.variant==='poster'?await this.poster(verified.buffer,verified.mimeType):verified.buffer,mime:grant.variant==='poster'?'image/jpeg':verified.mimeType};
      // Revocation can commit while the provider/decoder was running.
      await this.authorizedRow(id,grant);
      while(this.cache.size>=3)this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(key,{...result,expires:Date.now()+30_000});return result;
    })();
    this.loading.set(key,work);try{return await work;}finally{this.loading.delete(key);}
  }
}
