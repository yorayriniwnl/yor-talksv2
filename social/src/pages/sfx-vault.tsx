import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, Volume2, Download, Play, CheckCircle2, 
  Sparkles, ShieldCheck, Zap, Disc, Waves, Radio 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SFXTrack {
  id: string;
  name: string;
  category: string;
  duration: string;
  bpm: string;
}

const TRACKS: SFXTrack[] = [
  { id: 'sfx-1', name: 'Desi Dhol Tasha Drop Stinger', category: 'Hype Intros', duration: '4.2s', bpm: '138 BPM' },
  { id: 'sfx-2', name: 'Sacred Shankh Horn Clutch Stinger', category: 'Clutch Finishers', duration: '3.8s', bpm: 'Ambient' },
  { id: 'sfx-3', name: 'Wankhede Stadium Crowd Roar', category: 'Atmosphere', duration: '8.5s', bpm: 'Stadium' },
  { id: 'sfx-4', name: 'English Willow Cricket Bat Crack 6', category: 'Hits & Impacts', duration: '1.2s', bpm: 'Impact' },
  { id: 'sfx-5', name: 'Teentaal Rapid Tabla Roll', category: 'Transitions', duration: '2.9s', bpm: '160 BPM' },
  { id: 'sfx-6', name: 'Royal Victory Shehnai Fanfare', category: 'Winner Celebration', duration: '5.4s', bpm: '120 BPM' },
];

export default function SFXVault() {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlayPreview = (id: string, name: string) => {
    sounds.playPop();
    setPlayingId(id);
    toast.info(`🔊 Playing preview: "${name}"`);
    setTimeout(() => {
      setPlayingId(null);
    }, 2500);
  };

  const handleDownloadAll = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📦 High-Definition WAV & OBS Stinger ZIP Archive downloaded (24-bit 48kHz)!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports SFX & Streamer Stinger Vault</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Royalty-Free Desi Dhol, Shankh Horns, Tabla Rolls & 48kHz WAVs</p>
          </div>
        </div>

        <Button
          onClick={handleDownloadAll}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Download OBS Sound Pack ZIP
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {TRACKS.map((t) => (
            <div
              key={t.id}
              className="surface-1 p-5 rounded-3xl border border-border/40 flex items-center justify-between shadow-lg space-x-3"
            >
              <div className="space-y-1">
                <span className="text-[0.65rem] font-mono text-muted-foreground block uppercase">{t.category} • {t.duration}</span>
                <h4 className="font-display font-bold text-sm text-foreground">{t.name}</h4>
                <span className="text-[0.68rem] font-mono text-primary font-bold">{t.bpm}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={playingId === t.id ? 'default' : 'outline'}
                  onClick={() => handlePlayPreview(t.id, t.name)}
                  className="rounded-xl h-10 px-3 font-mono text-xs"
                >
                  {playingId === t.id ? (
                    <span className="text-pink-400 font-bold flex items-center gap-1">
                      <Waves className="w-3.5 h-3.5 animate-pulse" /> Playing
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Play className="w-3.5 h-3.5" /> Preview
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
