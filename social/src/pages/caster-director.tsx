import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tv, Video, Sparkles, CheckCircle2, 
  Send, Radio, Eye, Crosshair, Copy, Grid3X3 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ObserverFeed {
  id: string;
  name: string;
  source: string;
  resolution: string;
  status: string;
}

const FEEDS: ObserverFeed[] = [
  { id: 'cam-1', name: 'POV 1: Entry Fragger Alpha', source: 'NDI Feed 1080p60', resolution: '1920x1080 @ 60FPS', status: 'LIVE ON PROGRAM' },
  { id: 'cam-2', name: 'POV 2: Sniper Overlook Bravo', source: 'NDI Feed 1080p60', resolution: '1920x1080 @ 60FPS', status: 'PREVIEW READY' },
  { id: 'cam-3', name: 'POV 3: Tactical Aerial Drone', source: 'Wireless SRT 1080p60', resolution: '1920x1080 @ 60FPS', status: 'PREVIEW READY' },
  { id: 'cam-4', name: 'POV 4: Full Map Radar & Zone Flow', source: 'HDMI Capture 4K30', resolution: '3840x2160 @ 30FPS', status: 'PREVIEW READY' },
];

export default function CasterDirectorDeck() {
  const [feeds, setFeeds] = useState<ObserverFeed[]>(FEEDS);
  const [activeProgram, setActiveProgram] = useState<string>('cam-1');

  const handleSwitchProgram = (id: string, name: string) => {
    sounds.playPop();
    setActiveProgram(id);
    toast.success(`🔴 Broadcast Program Output switched to ${name}!`);
  };

  const handleCopyDirectorSource = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/multiview-director?session=scrims_finals`);
    toast.success('📋 Multiview Observer Director NDI / OBS URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Caster Multiview Director Deck</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">4-Quadrant Observer Feeds, Instant Program Out Switcher & NDI Audio Tally</p>
          </div>
        </div>

        <Button
          onClick={handleCopyDirectorSource}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy Multiview OBS URL
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* 4-Quadrant Multiview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {feeds.map((feed) => {
            const isProgram = activeProgram === feed.id;
            return (
              <div
                key={feed.id}
                className={cn(
                  "surface-1 p-5 rounded-3xl border flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isProgram ? "border-red-500/80 bg-red-500/5 shadow-red-500/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-lg font-mono font-bold text-[0.65rem]",
                      isProgram ? "bg-red-500 text-white animate-pulse" : "bg-muted text-muted-foreground"
                    )}>
                      {isProgram ? '🔴 ON AIR PROGRAM' : 'PREVIEW'}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{feed.resolution}</span>
                  </div>

                  <h3 className="font-display font-black text-lg text-foreground">{feed.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground">{feed.source}</p>
                </div>

                <div className="pt-2">
                  {isProgram ? (
                    <Button disabled className="w-full rounded-xl font-bold text-xs h-10 bg-red-500 text-white">
                      🔴 Live Broadcasting
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSwitchProgram(feed.id, feed.name)}
                      className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                    >
                      🎬 Cut to Program Output
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
