import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, Sparkles, CheckCircle2, 
  Play, RotateCcw, Clock, Crosshair, Copy, Video, FastForward, Rewind 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ReplayClip {
  id: string;
  title: string;
  player: string;
  game: string;
  duration: string;
  speed: string;
}

const CLIPS: ReplayClip[] = [
  { id: 'rep-1', title: '1v4 Pochinki Roof Clutch 360 Headshot', player: 'Scout_Alpha', game: 'BGMI Scrims Finals', duration: '14.2s', speed: '0.25x Slow-Mo' },
  { id: 'rep-2', title: 'A-Site Retake 1-Tap Operator Double Wallbang', player: 'Mortal_Viper', game: 'Valorant Challenger Cup', duration: '8.6s', speed: '0.50x Ultra Slow' },
  { id: 'rep-3', title: 'School Apartments Smoke Jump Defuse', player: 'JONATHAN_God', game: 'Skyesports Grand Slam', duration: '11.0s', speed: '0.25x Slow-Mo' },
];

export default function ReplayStudio() {
  const [clips, setClips] = useState<ReplayClip[]>(CLIPS);
  const [activeSpeed, setActiveSpeed] = useState<number>(0.5);

  const handlePlaySlowMo = (title: string, speed: number) => {
    sounds.playPop();
    toast.info(`🎬 Cueing Instant Replay: "${title}" at ${speed}x Speed`);
  };

  const handleCopyStingerSource = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/instant-replay?buffer=30s&pip=true`);
    toast.success('📋 Broadcast Replay Stinger & PiP Ingest URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Instant Replay & Slow-Mo Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Sub-Tick Replay Buffer, 0.25x Telemetry Breakdown & OBS PiP Ingest Deck</p>
          </div>
        </div>

        <Button
          onClick={handleCopyStingerSource}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Replay Source
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Playback Controls */}
        <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-mono text-muted-foreground uppercase text-[0.65rem]">Playback Slow-Mo Speed</span>
              <h3 className="font-display font-black text-lg text-foreground">Broadcast Scrubbing Engine</h3>
            </div>
            <div className="flex gap-2">
              {[0.25, 0.5, 1.0].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={activeSpeed === s ? 'default' : 'outline'}
                  onClick={() => {
                    sounds.playPop();
                    setActiveSpeed(s);
                    toast.info(`Playback speed set to ${s}x`);
                  }}
                  className={cn("rounded-xl font-mono text-xs", activeSpeed === s && "bg-primary text-primary-foreground font-bold")}
                >
                  {s}x Speed
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Clips Grid */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Film className="w-4 h-4 text-cyan-400" />
            <h3>Tournament Clutch Replay Buffer</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clips.map((c) => (
              <div
                key={c.id}
                className="surface-1 p-5 rounded-3xl border border-border/40 flex flex-col justify-between shadow-lg space-y-4"
              >
                <div className="space-y-1">
                  <span className="text-xs font-mono text-cyan-400">{c.game}</span>
                  <h4 className="font-display font-bold text-base text-foreground">{c.title}</h4>
                  <p className="text-xs font-mono text-muted-foreground">Player: {c.player} • {c.duration}</p>
                </div>

                <Button
                  onClick={() => handlePlaySlowMo(c.title, activeSpeed)}
                  className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Cue Replay ({activeSpeed}x)
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
