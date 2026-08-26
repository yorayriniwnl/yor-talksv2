import { api } from '@/lib/api-client';

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

export interface UploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  hlsMasterUrl?: string;
}

export async function uploadMediaWithProgress(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  onProgress?.(5);
  const result = await api.uploadMedia(file);
  onProgress?.(100);
  return result;
}
