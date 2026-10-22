import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ListMusic, Music2, Pause, Play, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AMBIENT_PRESETS, AmbientAudioEngine } from '@/lib/ambient-audio';

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function GlobalAudioPlayer({ inline = false }: { inline?: boolean }) {
  const playerRef = useRef<HTMLElement>(null);
  const engineRef = useRef<AmbientAudioEngine | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const elapsedBeforePlayRef = useRef(0);
  const [presetId, setPresetId] = useState(AMBIENT_PRESETS[0]!.id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [volume, setVolume] = useState(35);
  const [muted, setMuted] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentPreset = AMBIENT_PRESETS.find((preset) => preset.id === presetId) ?? AMBIENT_PRESETS[0]!;

  useLayoutEffect(() => {
    if (inline || !playerRef.current) return;
    const positionCompanion = () => {
      const player = playerRef.current;
      if (player) document.documentElement.style.setProperty('--yor-ambient-player-height', `${player.getBoundingClientRect().height}px`);
    };
    let frame = 0;
    const schedulePosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(positionCompanion);
    };
    positionCompanion();
    const observer = new ResizeObserver(schedulePosition);
    observer.observe(playerRef.current);
    window.addEventListener('resize', schedulePosition);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedulePosition);
      document.documentElement.style.removeProperty('--yor-ambient-player-height');
    };
  }, [inline]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      if (startedAtRef.current !== null) {
        setElapsed(Math.floor(elapsedBeforePlayRef.current + (performance.now() - startedAtRef.current) / 1000));
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    engineRef.current?.setVolume(muted ? 0 : volume / 100);
  }, [volume, muted]);

  useEffect(() => () => {
    void engineRef.current?.dispose();
    engineRef.current = null;
  }, []);

  const togglePlayback = async () => {
    setError(null);
    if (isPlaying) {
      try {
        await engineRef.current?.pause();
        if (startedAtRef.current !== null) {
          elapsedBeforePlayRef.current += (performance.now() - startedAtRef.current) / 1000;
          startedAtRef.current = null;
        }
        setElapsed(Math.floor(elapsedBeforePlayRef.current));
        setIsPlaying(false);
      } catch {
        setError('Ambient audio could not be paused.');
      }
      return;
    }

    try {
      const engine = engineRef.current ?? new AmbientAudioEngine();
      engineRef.current = engine;
      engine.setVolume(muted ? 0 : volume / 100);
      await engine.play(currentPreset);
      startedAtRef.current = performance.now();
      setIsPlaying(true);
    } catch (cause) {
      setIsPlaying(false);
      setError(cause instanceof Error ? cause.message : 'Ambient audio could not be started.');
    }
  };

  const selectPreset = async (nextPresetId: string) => {
    const nextPreset = AMBIENT_PRESETS.find((preset) => preset.id === nextPresetId);
    if (!nextPreset) return;
    setPresetId(nextPreset.id);
    setShowPresets(false);
    setElapsed(0);
    elapsedBeforePlayRef.current = 0;
    setError(null);
    if (!isPlaying) return;
    try {
      await engineRef.current?.play(nextPreset);
      startedAtRef.current = performance.now();
    } catch (cause) {
      startedAtRef.current = null;
      setIsPlaying(false);
      setError(cause instanceof Error ? cause.message : 'The selected ambience could not be started.');
    }
  };

  return (
    <section ref={playerRef} aria-label="Ambient audio player" className={`${inline ? 'relative z-20 mx-3 mb-[calc(5.25rem+env(safe-area-inset-bottom))] mt-4 sm:ml-auto sm:mr-6 sm:w-[360px] lg:mb-6' : 'fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 sm:left-auto sm:right-6 sm:w-[360px] lg:bottom-6'} rounded-2xl border border-border/60 bg-background/95 p-3 text-foreground shadow-xl backdrop-blur-xl`}>
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Music2 className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{currentPreset.name}</p>
          <p className="truncate text-xs text-muted-foreground">{isPlaying ? `Playing · ${formatElapsed(elapsed)}` : 'Generated in this browser'}</p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label={muted ? 'Unmute ambient audio' : 'Mute ambient audio'} onClick={() => setMuted((value) => !value)}>
          {muted ? <VolumeX aria-hidden="true" className="h-4 w-4" /> : <Volume2 aria-hidden="true" className="h-4 w-4" />}
        </Button>
        <Button type="button" size="icon" aria-label={isPlaying ? 'Pause ambient audio' : 'Play ambient audio'} aria-pressed={isPlaying} onClick={() => void togglePlayback()}>
          {isPlaying ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Choose ambience" aria-expanded={showPresets} onClick={() => setShowPresets((value) => !value)}>
          {showPresets ? <X aria-hidden="true" className="h-4 w-4" /> : <ListMusic aria-hidden="true" className="h-4 w-4" />}
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <label htmlFor="ambient-audio-volume" className="shrink-0 text-xs text-muted-foreground">Volume</label>
        <input id="ambient-audio-volume" type="range" min="0" max="100" step="1" value={volume} aria-valuetext={`${volume}%`}
          onChange={(event) => { const value = Number(event.target.value); setVolume(value); if (value > 0) setMuted(false); }}
          className="h-1.5 min-w-0 flex-1 accent-primary" />
        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{muted ? 'Muted' : `${volume}%`}</span>
      </div>

      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      {showPresets && <div className="mt-3 space-y-1 border-t border-border/50 pt-3" role="group" aria-label="Generated soundscapes">
        {AMBIENT_PRESETS.map((preset) => <button key={preset.id} type="button" aria-pressed={currentPreset.id === preset.id} onClick={() => void selectPreset(preset.id)}
          className="block w-full rounded-xl px-3 py-2 text-left hover:bg-muted/50 aria-pressed:bg-primary/10">
          <span className="block text-sm font-medium">{preset.name}</span>
          <span className="block text-xs text-muted-foreground">{preset.description}</span>
        </button>)}
      </div>}

      <p className="sr-only" aria-live="polite">{isPlaying ? `Playing ${currentPreset.name}` : error || 'Ambient audio is paused'}</p>
    </section>
  );
}
