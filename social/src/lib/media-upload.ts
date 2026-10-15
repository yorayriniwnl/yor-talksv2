import { toast } from 'sonner';
import { api, type MediaPurpose, type MediaUploadPhase, type UploadedMedia } from './api-client';

const uploadLabels: Record<MediaUploadPhase, string> = {
  preparing: 'Preparing your media…',
  uploading: 'Uploading your media…',
  checking: 'Checking your media before publication…',
};

export async function uploadApprovedMedia(file: File, purpose: MediaPurpose): Promise<UploadedMedia> {
  let notice: string | number | undefined;
  try {
    return await api.uploadMedia(file, purpose, phase => {
      notice = toast.loading(uploadLabels[phase], { id: notice });
    });
  } finally {
    if (notice !== undefined) toast.dismiss(notice);
  }
}
