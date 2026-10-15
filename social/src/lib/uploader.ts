import { api, type MediaPurpose, type UploadedMedia } from '@/lib/api-client';

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

export type UploadResult = UploadedMedia;

export async function uploadMediaWithProgress(
  file: File,
  purpose: MediaPurpose,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  onProgress?.(5);
  const result = await api.uploadMedia(file, purpose);
  onProgress?.(100);
  return result;
}
