import { createElement, useCallback, useEffect, useRef, useState, type AudioHTMLAttributes, type ImgHTMLAttributes, type VideoHTMLAttributes } from 'react';
import { getStoredTokens, onStoredTokensChange } from './api-client';

const mediaPath = /^\/api\/media\/[0-9a-f-]{36}\/content$/i;
function protectedMediaUrl(sourceUrl: string): URL | undefined {
  try {
    const apiOrigin = new URL(import.meta.env.VITE_API_BASE_URL || '/api', window.location.origin).origin;
    const url = new URL(sourceUrl, apiOrigin);
    return [apiOrigin, window.location.origin].includes(url.origin) && mediaPath.test(url.pathname)
      && Boolean(url.searchParams.get('token')) && !url.username && !url.password && !url.hash ? url : undefined;
  } catch { return undefined; }
}
export function isGovernedMediaReference(sourceUrl: string): boolean {
  try { return new URL(sourceUrl, window.location.origin).pathname.startsWith('/api/media/'); }
  catch { return sourceUrl.startsWith('/api/media/'); }
}

/** Fetch a short-lived media grant with the current access token; never persist the returned object URL. */
export async function fetchProtectedMedia(sourceUrl: string, signal?: AbortSignal): Promise<{ objectUrl: string; dispose(): void }> {
  const url = protectedMediaUrl(sourceUrl);
  if (!url) throw new Error('This media reference is invalid.');
  const tokens = getStoredTokens();
  const response = await fetch(url.href, {
    method: 'GET', credentials: 'include', signal,
    headers: tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('This media is no longer available.');
  const blob = await response.blob();
  if (!blob.size) throw new Error('This media is empty.');
  const objectUrl = URL.createObjectURL(blob);
  let disposed = false;
  return { objectUrl, dispose() { if (!disposed) { URL.revokeObjectURL(objectUrl); disposed = true; } } };
}

/** Hook that owns and revokes each short-lived object URL on replacement, logout or unmount. */
export function useProtectedMediaSource(sourceUrl: string | null | undefined, onError?: () => void): string | undefined {
  const [resolved, setResolved] = useState<{ source: string; value: string } | undefined>();
  useEffect(() => {
    let active = true;
    let generation = 0;
    let controller: AbortController | undefined;
    let current: { objectUrl: string; dispose(): void } | undefined;
    const load = () => {
      const requestGeneration = ++generation;
      controller?.abort();
      controller = undefined;
      current?.dispose();
      current = undefined;
      if (!sourceUrl) { setResolved(undefined); return; }
      if (!protectedMediaUrl(sourceUrl)) {
        if (isGovernedMediaReference(sourceUrl)) { setResolved(undefined); onError?.(); return; }
        setResolved({ source: sourceUrl, value: sourceUrl }); return;
      }
      setResolved(undefined);
      const requestController = new AbortController();
      controller = requestController;
      const isCurrent = () => active && generation === requestGeneration && !requestController.signal.aborted;
      void fetchProtectedMedia(sourceUrl, requestController.signal).then(result => {
        if (!isCurrent()) { result.dispose(); return; }
        current = result;
        setResolved({ source: sourceUrl, value: result.objectUrl });
      }).catch(() => { if (isCurrent()) { setResolved(undefined); onError?.(); } });
    };
    load();
    const unsubscribe = onStoredTokensChange(load);
    return () => { active = false; unsubscribe(); controller?.abort(); current?.dispose(); };
  }, [onError, sourceUrl]);
  if (!sourceUrl) return undefined;
  if (!protectedMediaUrl(sourceUrl)) return isGovernedMediaReference(sourceUrl) ? undefined : sourceUrl;
  return resolved?.source === sourceUrl ? resolved.value : undefined;
}

// Use the element's existing React error handler for failed authenticated fetches.
// A stable callback prevents inline onError props from restarting media requests.
function useMediaFailureEvent<T extends HTMLElement>() {
  const element = useRef<T>(null);
  const onError = useCallback(() => element.current?.dispatchEvent(new Event('error')), []);
  return { element, onError };
}

export function ProtectedMediaImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  const { element, onError } = useMediaFailureEvent<HTMLImageElement>();
  const src = useProtectedMediaSource(props.src, onError);
  return createElement('img', { ...props, src, ref: element });
}

export function ProtectedMediaAudio(props: AudioHTMLAttributes<HTMLAudioElement>) {
  const { element, onError } = useMediaFailureEvent<HTMLAudioElement>();
  const src = useProtectedMediaSource(props.src, onError);
  return createElement('audio', { ...props, src, ref: element });
}

export function ProtectedMediaVideo(props: VideoHTMLAttributes<HTMLVideoElement>) {
  const { element, onError } = useMediaFailureEvent<HTMLVideoElement>();
  const src = useProtectedMediaSource(props.src, onError);
  const poster = useProtectedMediaSource(props.poster, onError);
  return createElement('video', { ...props, src, poster, ref: element });
}
