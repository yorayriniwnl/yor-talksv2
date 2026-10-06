import { createHash, randomUUID } from "node:crypto";
import { pool, runInDatabaseTransaction, type DbTransaction } from "@workspace/db";
import { sql } from "drizzle-orm";
import { StorageService } from "./storage-service.js";
import { MediaModerationService } from "./media-moderation-service.js";
import { MEDIA_PURPOSES, mediaMimeAllowed, purposeLimits, MediaVerificationError, MediaTooLargeError,
  MediaModerationUnavailableError, MediaProviderNotConfiguredError, MediaProviderUnavailableError, MediaUploadNotFoundError,
  type MediaPurpose, type MediaProvider, type MediaUploadIntent, type ProviderIdentity, type VerifiedMedia } from "./media-provider.js";

export class MediaLifecycleError extends Error {
  constructor(message: string, public readonly status: number, public readonly code: string) { super(message); this.name = "MediaLifecycleError"; }
}
export interface MediaUploadResult {
  id: string; mediaId: string; status: string; purpose?: MediaPurpose;
  url?: string; thumbnailUrl?: string; mimeType?: string; size?: number;
  width?: number; height?: number; duration?: number;
}
export interface MediaModerator {
  assertReady(): Promise<void>;
  moderate(media: VerifiedMedia, purpose: MediaPurpose): Promise<{ decision: "approve" | "reject" | "uncertain"; reasons: string[] }>;
}
export interface MediaAssetRow {
  id: string; owner_id: string | null; purpose: MediaPurpose; provider: string; status: string;
  public_id: string; resource_type: "image" | "video"; declared_mime: string; declared_bytes: number;
  provider_asset_id: string | null; provider_version: number | null; provider_format: string | null;
  verified_mime: string | null; verified_bytes: number | null; sha256: string | null;
  width: number | null; height: number | null; duration_seconds: number | null;
  moderation_json: unknown; verification_token: string | null; verification_until: string | null;
  deletion_status: string; upload_expires_at: string; finalized_at: string | null;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const mediaIntent = (row: MediaAssetRow): MediaUploadIntent => ({ id:row.id,ownerId:row.owner_id??"",purpose:row.purpose,
  publicId:row.public_id,resourceType:row.resource_type,declaredMimeType:row.declared_mime,declaredBytes:row.declared_bytes });
export function mediaIdentity(row: MediaAssetRow): ProviderIdentity | undefined {
  if (row.provider !== "cloudinary" || !row.provider_asset_id || !row.provider_version || !row.provider_format) return undefined;
  return {assetId:row.provider_asset_id,version:row.provider_version,format:row.provider_format,publicId:row.public_id,resourceType:row.resource_type,deliveryType:"authenticated"};
}
export function mediaResult(row: MediaAssetRow): MediaUploadResult {
  const base = {id:row.id,mediaId:row.id,status:row.status,purpose:row.purpose};
  if (row.status !== "approved" || row.deletion_status !== "none") return base;
  return {...base,url:`media:${row.id}`,thumbnailUrl:row.verified_mime?.startsWith("video/")?`media-poster:${row.id}`:`media:${row.id}`,
    mimeType:row.verified_mime??undefined,size:row.verified_bytes??undefined,width:row.width??undefined,height:row.height??undefined,duration:row.duration_seconds??undefined};
}
export function mediaError(error: unknown): MediaLifecycleError {
  if (error instanceof MediaLifecycleError) return error;
  if (error instanceof MediaTooLargeError) return new MediaLifecycleError("Media exceeds its purpose limit",413,"media_too_large");
  if (error instanceof MediaVerificationError) return new MediaLifecycleError("Media verification failed",415,"media_verification_failed");
  if (error instanceof MediaModerationUnavailableError) return new MediaLifecycleError("Media moderation is unavailable",503,"media_moderation_unavailable");
  if (error instanceof MediaProviderNotConfiguredError) return new MediaLifecycleError("Media storage is not configured",503,"media_provider_not_configured");
  if (error instanceof MediaUploadNotFoundError) return new MediaLifecycleError("The reserved media upload was not found",502,"media_upload_not_found");
  if (error instanceof MediaProviderUnavailableError) return new MediaLifecycleError("Media storage is temporarily unavailable",502,"media_provider_unavailable");
  return new MediaLifecycleError("Media processing is temporarily unavailable",503,"media_processing_unavailable");
}
export async function getApprovedMedia(tx:DbTransaction,ownerId:string,mediaIds:string[],purpose:MediaPurpose,kind?:"image"|"audio"|"video"):Promise<MediaUploadResult[]> {
  if (mediaIds.length>10 || mediaIds.some(id=>!uuid.test(id)) || new Set(mediaIds).size!==mediaIds.length) throw new MediaLifecycleError("Invalid media IDs",400,"invalid_media_ids");
  const found = new Map<string,MediaAssetRow>();
  for (const id of [...mediaIds].sort()) {
    const row = (await tx.execute(sql`SELECT * FROM media_assets WHERE id=${id}::uuid FOR UPDATE`)).rows[0] as unknown as MediaAssetRow|undefined;
    if (!row || row.owner_id!==ownerId) throw new MediaLifecycleError("Media does not belong to this account",403,"media_owner_mismatch");
    if (row.status!=="approved" || row.deletion_status!=="none" || !mediaIdentity(row) || !row.verified_mime || !row.verified_bytes || !/^[a-f0-9]{64}$/.test(row.sha256??'') || (row.moderation_json as {decision?:string}|null)?.decision!=='approve') throw new MediaLifecycleError("Media is not approved",409,"media_not_approved");
    if (row.purpose!==purpose || (kind && !row.verified_mime?.startsWith(`${kind}/`))) throw new MediaLifecycleError("Media has the wrong purpose or type",415,"media_purpose_mismatch");
    found.set(id,row);
  }
  return mediaIds.map(id=>mediaResult(found.get(id)!));
}
export class MediaService {
  constructor(private readonly provider:MediaProvider=new StorageService(),private readonly moderator:MediaModerator=new MediaModerationService()) {}
  private async owned(ownerId:string,id:string):Promise<MediaAssetRow> {
    if (!uuid.test(id)) throw new MediaLifecycleError("Invalid media ID",400,"invalid_media_id");
    const row=(await pool.query<MediaAssetRow>('SELECT * FROM media_assets WHERE id=$1',[id])).rows[0];
    if (!row) throw new MediaLifecycleError("Media not found",404,"media_not_found");
    if (row.owner_id!==ownerId) throw new MediaLifecycleError("Media belongs to another account",403,"media_owner_mismatch");
    return row;
  }
  async prepareUpload(ownerId:string,input:{purpose:string;mimeType:string;size:number;filename:string}) {
    if (!(MEDIA_PURPOSES as readonly string[]).includes(input.purpose)) throw new MediaLifecycleError("Unsupported media purpose",400,"invalid_media_purpose");
    const purpose=input.purpose as MediaPurpose,mime=input.mimeType.toLowerCase();
    if (!mediaMimeAllowed(purpose,mime)) throw new MediaLifecycleError("Unsupported media type for this purpose",415,"unsupported_media_type");
    const limit=purposeLimits(purpose,mime).maxBytes;
    if (!Number.isSafeInteger(input.size)||input.size<=0) throw new MediaLifecycleError("A positive media size is required",400,"invalid_media_size");
    if (input.size>limit) throw new MediaLifecycleError("Media exceeds its purpose limit",413,"media_too_large");
    await this.moderator.assertReady();
    const id=randomUUID(),intent:MediaUploadIntent={id,ownerId,purpose,publicId:`yor-talks/${ownerId}/${id}`,resourceType:mime.startsWith('image/')?'image':'video',declaredMimeType:mime,declaredBytes:input.size};
    const grant=await this.provider.prepareUpload(intent);
    await pool.query(`INSERT INTO media_assets(id,owner_id,purpose,public_id,resource_type,declared_mime,declared_bytes,upload_expires_at,cleanup_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '1 hour',now()+interval '1 hour')`,[id,ownerId,purpose,intent.publicId,intent.resourceType,mime,input.size]);
    return {id,mediaId:id,status:'pending',purpose,mimeType:mime,maxFileSize:limit,mode:grant.directAllowed?'direct':'server',
      uploadUrl:grant.directAllowed?grant.uploadUrl:`/api/media/${id}/upload`,...(grant.directAllowed?{fields:grant.fields}:{})};
  }
  async upload(ownerId:string,id:string,file:{buffer:Buffer;mimetype:string}) {
    const row=await this.owned(ownerId,id);
    if (file.mimetype!==row.declared_mime||file.buffer.length!==row.declared_bytes) throw new MediaLifecycleError("Media does not match the reservation",415,"media_metadata_mismatch");
    const sha256=createHash('sha256').update(file.buffer).digest('hex');
    if(row.deletion_status!=='none'||(row.status!=='approved'&&Date.parse(row.upload_expires_at)<Date.now())) throw new MediaLifecycleError("Upload is no longer pending",409,"media_upload_closed");
    // An HTTP response can be lost after the upload commits. A retry may
    // acknowledge those exact owner-bound bytes, without writing the provider
    // again or reopening verification, rejection, or deletion state.
    if(['uploaded','verifying','approved','failed'].includes(row.status)) {
      if(row.sha256!==sha256)throw new MediaLifecycleError("Media bytes do not match the original upload",415,"media_metadata_mismatch");
      return mediaResult(row);
    }
    if(row.status!=='pending')throw new MediaLifecycleError("Upload is no longer pending",409,"media_upload_closed");
    const token=randomUUID(),claimed=await pool.query(`UPDATE media_assets SET verification_token=$2,verification_until=now()+interval '2 minutes'
      WHERE id=$1 AND status='pending' AND deletion_status='none' AND (verification_until IS NULL OR verification_until<now()) RETURNING *`,[id,token]);
    if (!claimed.rowCount) throw new MediaLifecycleError("Upload is already in progress",409,"media_upload_in_progress");
    try {
      await this.provider.uploadBuffer(mediaIntent(row),file.buffer);
      const result=await pool.query<MediaAssetRow>(`UPDATE media_assets SET status='uploaded',sha256=$3,verification_token=NULL,verification_until=NULL,updated_at=now()
        WHERE id=$1 AND verification_token=$2 AND status='pending' AND deletion_status='none' RETURNING *`,[id,token,sha256]);
      if (!result.rowCount) throw new MediaLifecycleError("Upload reservation was revoked",409,"media_upload_closed");
      return mediaResult(result.rows[0]!);
    } catch(error) {
      await pool.query(`UPDATE media_assets SET verification_token=NULL,verification_until=NULL,last_error=$3 WHERE id=$1 AND verification_token=$2`,[id,token,mediaError(error).code]);
      throw mediaError(error);
    }
  }
  async finalizeUpload(ownerId:string,id:string):Promise<MediaUploadResult> {
    const row=await this.owned(ownerId,id);
    if (['approved','rejected','deleted'].includes(row.status)) return mediaResult(row);
    const token=randomUUID(),claim=await pool.query(`UPDATE media_assets SET verification_token=$2,verification_until=now()+interval '2 minutes',updated_at=now()
      WHERE id=$1 AND status IN ('pending','uploaded','verifying','failed') AND deletion_status='none' AND upload_expires_at>now()
      AND (verification_until IS NULL OR verification_until<now()) RETURNING *`,[id,token]);
    if (!claim.rowCount) {
      const current=await this.owned(ownerId,id);
      if (Date.parse(current.upload_expires_at)<Date.now()) throw new MediaLifecycleError("Upload expired",410,"media_upload_expired");
      return mediaResult(current);
    }
    try {
      const verified=await this.provider.verifyUpload(mediaIntent(row),mediaIdentity(row));
      const verifiedSha=createHash('sha256').update(verified.buffer).digest('hex');
      if(verified.sha256!==verifiedSha||(row.sha256!==null&&row.sha256!==verifiedSha))throw new MediaVerificationError('Uploaded bytes changed before verification');
      await pool.query(`UPDATE media_assets SET status='uploaded' WHERE id=$1 AND verification_token=$2 AND deletion_status='none'`,[id,token]);
      const active=await pool.query(`UPDATE media_assets SET status='verifying',provider_asset_id=$3,provider_version=$4,provider_format=$5,
        verified_mime=$6,verified_bytes=$7,sha256=$8,width=$9,height=$10,duration_seconds=$11,updated_at=now()
        WHERE id=$1 AND verification_token=$2 AND deletion_status='none' RETURNING id`,
        [id,token,verified.assetId,verified.version,verified.format,verified.mimeType,verified.bytes,verified.sha256,verified.width??null,verified.height??null,verified.duration??null]);
      if (!active.rowCount) throw new MediaLifecycleError("Media reservation was revoked",409,"media_upload_closed");
      const decision=await this.moderator.moderate(verified,row.purpose);
      if (!decision||!['approve','reject','uncertain'].includes(decision.decision)||!Array.isArray(decision.reasons)||decision.reasons.some(reason=>typeof reason!=='string')) throw new MediaModerationUnavailableError();
      if (decision.decision==='approve'&&decision.reasons.length) throw new MediaModerationUnavailableError();
      if (decision.decision==='uncertain') throw new MediaModerationUnavailableError();
      await this.provider.verifyIdentity(verified);
      const rejected=decision.decision==='reject';
      const final=await pool.query<MediaAssetRow>(`UPDATE media_assets SET status=$3,moderation_json=$4,deletion_status=$5,
        cleanup_at=CASE WHEN $5='pending' THEN now() ELSE now()+interval '24 hours' END,
        verification_token=NULL,verification_until=NULL,last_error=NULL,updated_at=now(),finalized_at=COALESCE(finalized_at,now())
        WHERE id=$1 AND verification_token=$2 AND verification_until>now() AND deletion_status='none' RETURNING *`,
        [id,token,rejected?'rejected':'approved',decision,rejected?'pending':'none']);
      if (!final.rowCount) throw new MediaLifecycleError("Verification lease expired or media was revoked",409,"media_verification_superseded");
      return mediaResult(final.rows[0]!);
    } catch(error) {
      const mapped=mediaError(error),permanent=error instanceof MediaVerificationError||error instanceof MediaTooLargeError;
      await pool.query(`UPDATE media_assets SET status=$3,deletion_status=$4,cleanup_at=CASE WHEN $4='pending' THEN now() ELSE upload_expires_at END,
        verification_token=NULL,verification_until=NULL,last_error=$5,updated_at=now(),
        finalized_at=CASE WHEN $3='rejected' THEN COALESCE(finalized_at,now()) ELSE finalized_at END
        WHERE id=$1 AND verification_token=$2 AND deletion_status='none'`,
        [id,token,permanent?'rejected':'failed',permanent?'pending':'none',mapped.code]);
      throw mapped;
    }
  }
  async processUpload(ownerId:string,file:{buffer:Buffer;mimetype:string;originalname:string},purpose:string):Promise<MediaUploadResult> {
    const prepared=await this.prepareUpload(ownerId,{purpose,mimeType:file.mimetype,size:file.buffer.length,filename:file.originalname});
    await this.upload(ownerId,prepared.id,file);
    return this.finalizeUpload(ownerId,prepared.id);
  }
  async deleteUpload(ownerId:string,id:string) {
    await this.owned(ownerId,id);
    await runInDatabaseTransaction(async tx=>{
      await tx.execute(sql`SELECT id FROM users WHERE id=${ownerId}::uuid FOR KEY SHARE`);
      await tx.execute(sql`SELECT id FROM media_assets WHERE id=${id}::uuid FOR UPDATE`);
      // This separate statement sees references committed while the asset lock
      // was being acquired. A single UPDATE/subquery snapshot can miss them.
      const result=await tx.execute(sql`UPDATE media_assets SET status='deleted',deletion_status='pending',cleanup_at=now(),verification_token=NULL,verification_until=NULL,updated_at=now()
        WHERE id=${id}::uuid AND owner_id=${ownerId}::uuid AND NOT EXISTS(SELECT 1 FROM media_references WHERE media_id=${id}::uuid) RETURNING id`);
      if(!result.rowCount)throw new MediaLifecycleError("Published media must be removed through its content",409,"media_in_use");
    });
  }
  async cleanup(limit=25):Promise<{deleted:number;failed:number}> {
    const bounded=Math.max(1,Math.min(100,Math.floor(limit)));
    // Expired Stories kept in a Highlight retain their media. Soft-deleted and
    // expired messages release media through the same last-reference trigger.
    await pool.query(`DELETE FROM media_references r USING messages m WHERE r.entity_type='messages' AND r.entity_id=m.id
      AND (m.deleted_at IS NOT NULL OR m.expires_at<=now())`);
    await pool.query(`DELETE FROM media_references r USING stories s WHERE r.entity_type='stories' AND r.entity_id=s.id AND s.expires_at<=now()
      AND NOT s.is_highlight AND s.highlight_id IS NULL AND NOT EXISTS(SELECT 1 FROM highlight_items h WHERE h.story_id=s.id)`);
    const claimed=await runInDatabaseTransaction(async tx=>{
      const candidates=await tx.execute(sql`SELECT * FROM media_assets WHERE cleanup_at<=now()
        AND (deletion_status='pending' OR (deletion_status='deleted' AND upload_expires_at+interval '1 hour'>now())
          OR (deletion_status='none' AND status IN ('pending','uploaded','verifying','failed','approved')))
        AND (deletion_until IS NULL OR deletion_until<now()) AND (verification_until IS NULL OR verification_until<now())
        AND NOT EXISTS(SELECT 1 FROM media_references WHERE media_id=media_assets.id)
        ORDER BY cleanup_at,id FOR UPDATE SKIP LOCKED LIMIT ${bounded}`);
      const rows:Array<MediaAssetRow&{deletion_token:string;deletion_attempts:number}>=[];
      for(const candidate of candidates.rows as unknown as MediaAssetRow[]) {
        const token=randomUUID();
        const updated=await tx.execute(sql`UPDATE media_assets SET
          status=CASE WHEN status='rejected' THEN status ELSE 'deleted' END,deletion_status='pending',
          deletion_token=${token}::uuid,deletion_until=now()+interval '2 minutes',deletion_attempts=deletion_attempts+1,
          verification_token=NULL,verification_until=NULL,updated_at=now()
          WHERE id=${candidate.id}::uuid AND NOT EXISTS(SELECT 1 FROM media_references WHERE media_id=${candidate.id}::uuid) RETURNING *`);
        if(updated.rows[0])rows.push(updated.rows[0] as unknown as typeof rows[number]);
      }
      return rows;
    });
    let deleted=0,failed=0;
    for(const row of claimed) {
      try {
        await this.provider.deletePendingUpload(mediaIntent(row));
        await pool.query(`UPDATE media_assets SET status=CASE WHEN status='rejected' THEN status ELSE 'deleted' END,
          deletion_status='deleted',deletion_token=NULL,deletion_until=NULL,last_error=NULL,cleanup_at=now()+interval '5 minutes',updated_at=now()
          WHERE id=$1 AND deletion_token=$2`,[row.id,row.deletion_token]);
        deleted++;
      }catch {
        await pool.query(`UPDATE media_assets SET deletion_token=NULL,deletion_until=NULL,last_error='media_delete_failed',
          cleanup_at=now()+$3*interval '1 second',updated_at=now() WHERE id=$1 AND deletion_token=$2`,
          [row.id,row.deletion_token,Math.min(3600,2**Math.min(row.deletion_attempts,9)*5)]);
        failed++;
      }
    }
    return {deleted,failed};
  }
}
