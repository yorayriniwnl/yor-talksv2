import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore, type Video } from '@/lib/store';
import { applyFreshVideoDelivery, hasUploadedVideoDelivery, readFreshVideoDelivery } from '@/lib/video-delivery';

export function ReelVideoPlayer({ video, active, muted, playbackSpeed, paused = false }: {
  video: Video; active: boolean; muted: boolean; playbackSpeed: number; paused?: boolean;
}) {
  const playerRef = useRef<HTMLVideoElement>(null);
  const mountedRef = useRef(true);
  const activeRef = useRef(active);
  const selectionSequenceRef = useRef(0);
  const videoRef = useRef(video);
  const attemptedRef = useRef(false);
  const refreshingRef = useRef(false);
  const lastTimeRef = useRef(0);
  const playbackIntentRef = useRef(true);
  const resumeRef = useRef<{ time: number; playing: boolean } | null>(null);
  const [delivery, setDelivery] = useState<{ previous: string; videoUrl: string; thumbnailUrl: string } | null>(null);
  const [recovery, setRecovery] = useState<'idle' | 'pending' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);
  if (activeRef.current !== active) selectionSequenceRef.current++;
  activeRef.current = active;
  videoRef.current = video;
  const source = delivery?.previous === video.videoUrl ? delivery.videoUrl : video.videoUrl;
  const poster = delivery?.previous === video.videoUrl ? delivery.thumbnailUrl : video.thumbnailUrl;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refreshDelivery = useCallback(async (explicit = false) => {
    if (!activeRef.current || refreshingRef.current) return;
    if (!explicit && attemptedRef.current) {
      setRecovery('failed');
      return;
    }
    attemptedRef.current = true;
    const original = videoRef.current;
    if (!hasUploadedVideoDelivery(original)) {
      setRecovery('failed');
      return;
    }
    const sessionUser = useAppStore.getState().currentUser;
    const selectionSequence = selectionSequenceRef.current;
    const player = playerRef.current;
    resumeRef.current ??= {
      time: player?.currentTime || lastTimeRef.current,
      playing: playbackIntentRef.current,
    };
    refreshingRef.current = true;
    setRecovery('pending');
    let applied = false;
    try {
      const fresh = await readFreshVideoDelivery(original);
      if (!mountedRef.current || !activeRef.current || selectionSequenceRef.current !== selectionSequence || videoRef.current.videoUrl !== original.videoUrl
        || useAppStore.getState().currentUser !== sessionUser) return;
      setDelivery({ previous: original.videoUrl, ...fresh });
      applyFreshVideoDelivery(original, fresh);
      applied = true;
      setRecovery('idle');
    } catch {
      // Keep the selection and playback position for an explicit user retry.
    } finally {
      refreshingRef.current = false;
      if (mountedRef.current && !applied) setRecovery('failed');
    }
  }, []);

  const restorePlayback = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.readyState >= 1 && !player.error) setRecovery('idle');
    const resume = resumeRef.current;
    if (resume && player.readyState < 2) return;
    if (resume) {
      player.currentTime = Number.isFinite(player.duration) ? Math.min(resume.time, Math.max(0, player.duration - 0.01)) : resume.time;
      playbackIntentRef.current = resume.playing;
      resumeRef.current = null;
    }
    if (activeRef.current && playbackIntentRef.current) void player.play().catch(() => {
      // Autoplay remains subject to the browser's usual interaction policy.
    });
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.muted = muted;
    player.playbackRate = playbackSpeed;
    if (active) {
      if (paused) {
        player.pause();
      } else {
        if (player.error) void refreshDelivery();
        else restorePlayback();
      }
    } else {
      player.pause();
      player.currentTime = 0;
      lastTimeRef.current = 0;
      playbackIntentRef.current = true;
      setProgress(0);
    }
  }, [active, muted, playbackSpeed, paused, source, refreshDelivery, restorePlayback]);

  return (
    <>
      <video
        ref={playerRef}
        src={source}
        poster={poster}
        className="operator-reel-video"
        muted={muted}
        loop
        playsInline
        preload={active ? 'auto' : 'metadata'}
        aria-label={video.title}
        aria-busy={recovery === 'pending'}
        onLoadedMetadata={restorePlayback}
        onCanPlay={restorePlayback}
        onTimeUpdate={event => {
          // A media network reset can emit timeupdate at zero before error.
          // Keep the last decoded position; deliberate seeks (including zero)
          // update it separately below.
          if (!resumeRef.current && event.currentTarget.readyState >= 2 && event.currentTarget.currentTime > 0) lastTimeRef.current = event.currentTarget.currentTime;
          if (event.currentTarget.duration) {
            setProgress((event.currentTarget.currentTime / event.currentTarget.duration) * 100);
          }
        }}
        onSeeked={event => {
          if (!resumeRef.current && event.currentTarget.readyState >= 2) lastTimeRef.current = event.currentTarget.currentTime;
        }}
        onPlay={() => { playbackIntentRef.current = true; }}
        onPause={event => {
          if (activeRef.current && event.currentTarget.readyState >= 2 && !refreshingRef.current && !resumeRef.current && !event.currentTarget.error) playbackIntentRef.current = false;
        }}
        onError={() => { if (activeRef.current) void refreshDelivery(); }}
      />
      {active && recovery !== 'idle' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-6 text-center text-white" onClick={event => event.stopPropagation()}>
          {recovery === 'pending' ? <p role="status">Refreshing video playback…</p> : (
            <div role="alert">
              <p>Video could not load. Your playback position is saved.</p>
              <button type="button" className="mt-3 rounded-lg border border-white/50 px-4 py-2" onClick={() => void refreshDelivery(true)}>Retry video</button>
            </div>
          )}
        </div>
      )}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30 pointer-events-none">
          <div className="h-full bg-primary transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      )}
    </>
  );
}
