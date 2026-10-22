import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Pause, Play } from 'lucide-react';
import { useProtectedMediaSource } from '@/lib/protected-media';

interface AudioWaveformPlayerProps {
  duration?: string;
  src?: string;
}

function audioTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function AudioWaveformPlayer({ duration, src }: AudioWaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [position, setPosition] = useState(0);
  const [length, setLength] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [retryVersion, setRetryVersion] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const handleMediaError = useCallback(() => { setIsPlaying(false); setIsBuffering(false); setFailed(true); }, [retryVersion]);
  const source = useProtectedMediaSource(src, handleMediaError);

  useEffect(() => {
    setFailed(false);
    setPosition(0);
    setLength(0);
    setIsPlaying(false);
    setIsBuffering(false);
  }, [src]);

  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) audioRef.current?.pause(); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  const togglePlay = async () => {
    if (failed) {
      setFailed(false);
      setRetryVersion((version) => version + 1);
      return;
    }
    const audio = audioRef.current;
    if (!audio || !source) return;
    if (!audio.paused) { audio.pause(); return; }
    setFailed(false);
    setIsBuffering(true);
    try {
      audio.playbackRate = speed;
      await audio.play();
    } catch {
      handleMediaError();
    }
  };

  return (
    <div className="my-2 flex max-w-sm items-center gap-3 rounded-2xl border border-border/40 bg-surface-1 p-3.5 font-sans shadow-sm" onClick={(event) => event.stopPropagation()}>
      <audio
        key={`${src}-${retryVersion}`}
        ref={audioRef}
        src={source}
        preload="metadata"
        onLoadedMetadata={(event) => setLength(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onDurationChange={(event) => setLength(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onPlaying={() => { setIsPlaying(true); setIsBuffering(false); }}
        onWaiting={() => setIsBuffering(true)}
        onPause={() => { setIsPlaying(false); setIsBuffering(false); }}
        onEnded={() => { setIsPlaying(false); setIsBuffering(false); }}
        onError={handleMediaError}
      />
      <button
        type="button"
        onClick={() => void togglePlay()}
        disabled={(!source && !failed) || isBuffering}
        aria-label={isBuffering ? 'Loading voice note' : isPlaying ? 'Pause voice note' : failed ? 'Retry voice note' : 'Play voice note'}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
      >
        {isBuffering ? <Loader2 className="h-5 w-5 animate-spin" /> : isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 font-semibold text-foreground"><Mic className="h-3.5 w-3.5 text-primary" /> Voice note</span>
          <span className="tabular-nums">{audioTime(position)} / {length ? audioTime(length) : duration || '—'}</span>
        </div>
        <input
          type="range"
          min={0}
          max={length || 1}
          step={0.1}
          value={Math.min(position, length || 0)}
          disabled={!length || failed}
          aria-label="Voice note playback position"
          aria-valuetext={`${audioTime(position)} of ${audioTime(length)}`}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (audioRef.current) audioRef.current.currentTime = next;
            setPosition(next);
          }}
          className="h-8 w-full cursor-pointer accent-primary disabled:opacity-40"
        />
        {(failed || !src) && <p role="status" className="text-xs text-muted-foreground">{src ? 'Audio could not play. Try again.' : 'Audio is unavailable.'}</p>}
      </div>
      <button type="button" aria-label={`Playback speed: ${speed} times. Change speed`} onClick={() => {
        const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
        setSpeed(next);
        if (audioRef.current) audioRef.current.playbackRate = next;
      }} className="h-11 min-w-11 rounded-xl text-xs font-semibold tabular-nums text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{speed}×</button>
    </div>
  );
}
