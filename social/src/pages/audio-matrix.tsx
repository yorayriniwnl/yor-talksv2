import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sliders, Volume2, Mic, Music, Headphones, 
  Sparkles, CheckCircle2, Download, Radio, ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface AudioChannel {
  id: string;
  name: string;
  level: number;
  mute: boolean;
  bus: string;
}

const CHANNELS: AudioChannel[] = [
  { id: 'ch-1', name: '🎙️ Shure SM7B Mic (DSP Gate)', level: 85, mute: false, bus: 'Bus A (Stream)' },
  { id: 'ch-2', name: '🎮 Gaming PC HDMI In', level: 90, mute: false, bus: 'Bus A (Stream)' },
  { id: 'ch-3', name: '💬 Discord Squad Comms', level: 75, mute: false, bus: 'Bus B (Headphones)' },
  { id: 'ch-4', name: '🎵 Spotify Stream Music', level: 60, mute: false, bus: 'Bus A + B' },
];

export default function AudioMatrix() {
  const [channels, setChannels] = useState<AudioChannel[]>(CHANNELS);

  const handleExportProfile = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎛️ Dual-PC Wave Link / Voicemeeter XML DSP Routing Profile exported!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Dual-PC Audio Matrix & DSP Routing</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Virtual Submix Buses, Sidechain Ducking & ASIO Hardware Channels</p>
          </div>
        </div>

        <Button
          onClick={handleExportProfile}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export DSP XML
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="surface-1 p-6 rounded-3xl border border-border/40 flex flex-col justify-between shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-base text-foreground">{ch.name}</h4>
                  <span className="text-xs font-mono text-muted-foreground">{ch.bus}</span>
                </div>
                <span className="font-mono font-bold text-xs text-primary">{ch.level}%</span>
              </div>

              <div className="w-full bg-muted/40 rounded-full h-3 overflow-hidden p-0.5 border border-border/40">
                <div
                  className="bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${ch.level}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
