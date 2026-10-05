import { api } from './api-client';
import { useAppStore, type Video } from './store';

function deliveryAssetId(value: string): string | null {
  try {
    const apiOrigin = new URL(import.meta.env.VITE_API_BASE_URL || '/api', window.location.origin).origin;
    const url = new URL(value, apiOrigin);
    const match = /^\/api\/media\/([a-f0-9-]{36})\/content$/.exec(url.pathname);
    if (![apiOrigin, window.location.origin].includes(url.origin) || url.username || url.password || url.hash || !url.searchParams.get('token')) return null;
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function hasUploadedVideoDelivery(video: Video): boolean {
  return deliveryAssetId(video.videoUrl) !== null;
}

// Renew through the video's read policy, which rechecks the viewer's access.
// An expired grant never falls back to a provider URL or a broader media grant.
export async function readFreshVideoDelivery(video: Video): Promise<Pick<Video, 'videoUrl' | 'thumbnailUrl'>> {
  const assetId = deliveryAssetId(video.videoUrl);
  if (!assetId) throw new Error('This video could not load.');
  const fresh = await api.getVideo(video.id);
  if (fresh.id !== video.id || fresh.authorId !== video.authorId || deliveryAssetId(fresh.videoUrl) !== assetId
    || !deliveryAssetId(fresh.thumbnailUrl) || fresh.videoUrl === video.videoUrl) {
    throw new Error('A fresh video delivery grant is unavailable.');
  }
  return { videoUrl: fresh.videoUrl, thumbnailUrl: fresh.thumbnailUrl };
}

export function applyFreshVideoDelivery(video: Video, delivery: Pick<Video, 'videoUrl' | 'thumbnailUrl'>): void {
  useAppStore.setState(state => ({
    videos: state.videos.map(item => item.id === video.id && item.authorId === video.authorId && item.videoUrl === video.videoUrl
      ? { ...item, ...delivery } : item),
  }));
}
