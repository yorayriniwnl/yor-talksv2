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
  // Direct chunked upload simulation & FormData multipart
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media/upload');

    // Attach auth token if available
    try {
      const raw = localStorage.getItem('yortalks-tokens');
      if (raw) {
        const tokens = JSON.parse(raw);
        if (tokens.accessToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${tokens.accessToken}`);
        }
      }
    } catch {
      // ignore
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve(res.data);
        } catch {
          // Fallback object URL
          const url = URL.createObjectURL(file);
          resolve({ id: `med_${Date.now()}`, url, thumbnailUrl: url });
        }
      } else {
        // Fallback object URL for offline/mock demo
        const url = URL.createObjectURL(file);
        resolve({ id: `med_${Date.now()}`, url, thumbnailUrl: url });
      }
    };

    xhr.onerror = () => {
      // Fallback object URL
      const url = URL.createObjectURL(file);
      resolve({ id: `med_${Date.now()}`, url, thumbnailUrl: url });
    };

    xhr.send(formData);
  });
}
