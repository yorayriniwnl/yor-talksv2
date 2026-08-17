import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, Volume2, Sparkles, Play, 
  RotateCcw, Disc, Radio, Download, Activity 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface TaalPreset {
  id: string;
  name: string;
  beats: number;
  description: string;
}

const TAALS: TaalPreset[] = [
  { id: 'teentaal', name: 'Teentaal (तीनताल)', beats: 16, description: 'Dha Dhin Dhin Dha | Dha Dhin Dhin Dha | Dha Tin Tin Ta | Ta Dhin Dhin Dha' },
  { id: 'keherwa', name: 'Keherwa (कहरवा)', beats: 8, description: 'Dha Ge Na Ti | Na Ke Dhi Na' },
  { id: 'dadra', name: 'Dadra (दादरा)', beats: 6, description: 'Dha Dhi Na | Dha Tu Na' },
  { id: 'roopak', name: 'Roopak (रूपक)', beats: 7, description: 'Tin Tin Na | Dhi Na | Dhi Na' },
];

export default function TablaSynth() {
  const [activeTaal, setActiveTaal] = useState<TaalPreset>(TAALS[0]);
  const [bpm, setBpm] = useState([120]);
  const [isPlayingTaal, setIsPlayingTaal] = useState(false);

  const handlePlayPad = (bol: string) => {
    sounds.playPop();
    toast.info(`🥁 Bol Triggered: ${bol}`);
  };

  const handleToggleLoop = () => {
    sounds.playPop();
    setIsPlayingTaal(!isPlayingTaal);
    if (!isPlayingTaal) {
      toast.success(`🎶 Playing ${activeTaal.name} at ${bpm[0]} BPM!`);
    } else {
      toast.info('⏹️ Percussion loop paused.');
    }
  };

  const handleExportBeat = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`🎵 ${activeTaal.name} HQ WAV Loop exported for Yor Talks Reels!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Tabla & Dholak Percussion Synthesizer</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-Time Indian Bols, Teentaal, Keherwa & Dadra Rhythm Generator</p>
          </div>
        </div>

        <Button
          onClick={handleExportBeat}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export WAV Loop
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Taal Preset Selector */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TAALS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                sounds.playPop();
                setActiveTaal(t);
              }}
              className={cn(
                "p-4 rounded-3xl surface-1 border text-left transition-all shadow-md",
                activeTaal.id === t.id ? "border-amber-400 bg-amber-400/10 shadow-lg" : "border-border/40 hover:border-border"
              )}
            >
              <h4 className="font-display font-bold text-sm text-foreground">{t.name}</h4>
              <p className="text-[0.65rem] text-muted-foreground font-mono">{t.beats} Beats (मात्रा)</p>
            </button>
          ))}
        </div>

        {/* Rhythm Details & BPM Slider */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl font-sans">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[0.65rem] text-muted-foreground uppercase font-mono block">Active Rhythm Cycle</span>
              <h3 className="font-display font-black text-xl text-foreground">{activeTaal.name} ({activeTaal.beats} Beats)</h3>
              <p className="text-xs font-mono text-amber-400 mt-1">{activeTaal.description}</p>
            </div>

            <Button
              onClick={handleToggleLoop}
              className={cn(
                "rounded-2xl font-bold text-xs h-11 px-6 shadow-lg",
                isPlayingTaal ? "bg-rose-600 text-white" : "bg-primary text-primary-foreground glow-neon-primary"
              )}
            >
              {isPlayingTaal ? '⏹️ Stop Loop' : '▶️ Play Taal Loop'}
            </Button>
          </div>

          <div className="pt-4 border-t border-border/40 font-mono text-xs">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Tempo Control (BPM)</span>
              <span className="text-amber-400 font-bold">{bpm[0]} BPM</span>
            </div>
            <Slider
              value={bpm}
              onValueChange={setBpm}
              min={60}
              max={240}
              step={1}
            />
          </div>
        </div>

        {/* Interactive Tabla Strike Pads */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl font-sans">
          <div className="showcase-section-title">
            <Activity className="w-4 h-4 text-rose-400" />
            <h3>Live Tabla & Bayan Strike Pads</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
            {['Dha (धा)', 'Dhin (धिं)', 'Ge (गे)', 'Na (ना)', 'Tin (तिं)', 'Ta (ता)', 'Ke (के)', 'Tete (टेटे)'].map((bol) => (
              <button
                key={bol}
                onClick={() => handlePlayPad(bol)}
                className="h-24 rounded-2xl border border-border/60 bg-muted/30 hover:bg-muted/60 active:scale-95 transition-all flex flex-col items-center justify-center font-bold text-sm text-foreground shadow-md hover:border-amber-400/60"
              >
                <Disc className="w-5 h-5 text-amber-400 mb-1.5 opacity-80" />
                {bol}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
