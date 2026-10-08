import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsPresent } from 'framer-motion';
import { useLocation } from 'wouter';
import { Mic } from 'lucide-react';
import { useAppStore, type Message } from '@/lib/store';
import { approvedMessageDeliveryUrl, readFreshMessageDelivery } from '@/lib/message-delivery';

export function MessageAttachment({ message }: { message: Message }) {
  const [location] = useLocation();
  const present = useIsPresent();
  const mountedRef = useRef(true);
  const contextRef = useRef({ location, present, sequence: 0 });
  const attemptedRef = useRef(false);
  const refreshingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeRef = useRef(0);
  const playingRef = useRef(false);
  const rateRef = useRef(1);
  const resumeRef = useRef<{ time: number; playing: boolean; rate: number; muted: boolean; volume: number } | null>(null);
  const [delivery, setDelivery] = useState<{ previous: string | null | undefined; url: string } | null>(null);
  const [recovery, setRecovery] = useState<'idle' | 'pending' | 'failed'>('idle');
  if (contextRef.current.location !== location || contextRef.current.present !== present) contextRef.current.sequence++;
  contextRef.current.location = location;
  contextRef.current.present = present;
  const original = approvedMessageDeliveryUrl(message);
  const source = original && delivery && delivery.previous === message.mediaUrl ? delivery.url : original;
  const latestRef = useRef({ message, source });
  latestRef.current = { message, source };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const renew = useCallback(async (explicit = false) => {
    if (!mountedRef.current || !contextRef.current.present || refreshingRef.current) return;
    if (!explicit && attemptedRef.current) { setRecovery('failed'); return; }
    attemptedRef.current = true;
    const captured = latestRef.current;
    const sequence = contextRef.current.sequence;
    const sessionUser = useAppStore.getState().currentUser;
    const audio = audioRef.current;
    if (audio && !resumeRef.current) resumeRef.current = {
      time: audio.currentTime || timeRef.current, playing: playingRef.current,
      rate: rateRef.current, muted: audio.muted, volume: audio.volume,
    };
    refreshingRef.current = true;
    setRecovery('pending');
    let applied = false;
    try {
      const url = await readFreshMessageDelivery({ ...captured.message, mediaUrl: captured.source });
      const latest = latestRef.current;
      if (!mountedRef.current || !contextRef.current.present || contextRef.current.sequence !== sequence
        || useAppStore.getState().currentUser !== sessionUser || latest.source !== captured.source
        || latest.message.id !== captured.message.id || latest.message.conversationId !== captured.message.conversationId
        || latest.message.senderId !== captured.message.senderId || latest.message.mediaId !== captured.message.mediaId
        || latest.message.mediaType !== captured.message.mediaType || !approvedMessageDeliveryUrl(latest.message)) return;
      setDelivery({ previous: captured.message.mediaUrl, url });
      setRecovery('idle');
      applied = true;
    } catch {
      // Keep the attachment, caption, native playback state and composer draft.
    } finally {
      refreshingRef.current = false;
      if (mountedRef.current && !applied) setRecovery('failed');
    }
  }, []);

  const restoreAudio = useCallback(() => {
    const audio = audioRef.current;
    const resume = resumeRef.current;
    if (!audio || !resume || audio.readyState < 2 || !contextRef.current.present) return;
    audio.currentTime = Number.isFinite(audio.duration) ? Math.min(resume.time, Math.max(0, audio.duration - 0.01)) : resume.time;
    audio.playbackRate = resume.rate;
    audio.muted = resume.muted;
    audio.volume = resume.volume;
    playingRef.current = resume.playing;
    resumeRef.current = null;
    if (resume.playing) void audio.play().catch(() => {
      // Normal browser interaction requirements still apply to playback.
    });
  }, []);

  const status = source ? recovery : 'failed';
  return (
    <div aria-busy={status === 'pending'}>
      {message.mediaType === 'audio' ? (
        <div className="operator-message-audio">
          <span><Mic aria-hidden="true" /></span>
          <audio ref={audioRef} controls src={source ?? undefined} preload="metadata" aria-label="Voice note"
            onError={() => void renew()}
            onCanPlay={restoreAudio}
            onRateChange={event => {
              if (!resumeRef.current && event.currentTarget.readyState >= 2) rateRef.current = event.currentTarget.playbackRate;
            }}
            onTimeUpdate={event => {
              if (!resumeRef.current && event.currentTarget.readyState >= 2 && event.currentTarget.currentTime > 0) timeRef.current = event.currentTarget.currentTime;
            }}
            onSeeked={event => {
              if (!resumeRef.current && event.currentTarget.readyState >= 2) timeRef.current = event.currentTarget.currentTime;
            }}
            onPlay={() => { playingRef.current = true; }}
            onPause={event => {
              if (!refreshingRef.current && !resumeRef.current && event.currentTarget.readyState >= 2 && !event.currentTarget.error) playingRef.current = false;
            }}
          />
        </div>
      ) : <img className="operator-message-image" src={source ?? undefined} alt="Shared attachment" loading="lazy" onError={() => void renew()} />}
      {status === 'pending' ? <p role="status">Refreshing attachment…</p> : status === 'failed' ? (
        <div role="alert">
          <p>Attachment could not load. Your message is still here.</p>
          <button type="button" className="mt-2 underline" onClick={() => void renew(true)}>Retry attachment</button>
        </div>
      ) : null}
    </div>
  );
}
