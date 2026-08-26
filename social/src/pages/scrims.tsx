import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Swords, CheckCircle2, XCircle, Key,
  Copy, Trophy, Sparkles, MapPin, Radio, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

interface MapItem {
  id: string;
  name: string;
  game: 'BGMI' | 'Valorant';
  imageUrl: string;
  bannedBy?: string;
  pickedBy?: string;
}

const ESPORTS_MAPS: MapItem[] = [
  { id: 'm1', name: 'Erangel 2.0', game: 'BGMI', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop' },
  { id: 'm2', name: 'Miramar Desert', game: 'BGMI', imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop' },
  { id: 'm3', name: 'Sanhok Jungle', game: 'BGMI', imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=600&auto=format&fit=crop' },
  { id: 'm4', name: 'Ascent (Venice)', game: 'Valorant', imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop' },
  { id: 'm5', name: 'Bind (Morocco)', game: 'Valorant', imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=600&auto=format&fit=crop' },
  { id: 'm6', name: 'Haven (Bhutan)', game: 'Valorant', imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop' },
];

export default function Scrims() {
  const [maps, setMaps] = useState<MapItem[]>(ESPORTS_MAPS);
  const [currentTurn, setCurrentTurn] = useState<'Team A' | 'Team B'>('Team A');
  const [vetoStep, setVetoStep] = useState(1);

  const handleBanMap = (mapId: string) => {
    sounds.playPop();
    setMaps(prev => prev.map(m => m.id === mapId ? { ...m, bannedBy: currentTurn } : m));
    setCurrentTurn(t => t === 'Team A' ? 'Team B' : 'Team A');
    setVetoStep(s => s + 1);
    toast.info(`Map ban saved in this browser for ${currentTurn}. This practice veto is not a live tournament result.`);
  };

  const handlePickMap = (mapId: string) => {
    sounds.playChime();
    setMaps(prev => prev.map(m => m.id === mapId ? { ...m, pickedBy: currentTurn } : m));
    setCurrentTurn(t => t === 'Team A' ? 'Team B' : 'Team A');
    setVetoStep(s => s + 1);
    toast.info(`Map pick saved in this browser for ${currentTurn}. This practice veto is not a live tournament result.`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Scrims & Map Veto Hub</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Practice map pick/ban phase · live credentials require a tournament session</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Radio className="w-3.5 h-3.5 text-amber-400" /> Practice Lobby
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Match Header & Turn Indicator */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-primary">
              <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" />
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-[0.62rem] font-mono text-primary font-bold uppercase">Team Alpha</span>
              <h4 className="font-display font-bold text-foreground text-sm">GodLike Esports India</h4>
            </div>
          </div>

          <div className="px-5 py-2 rounded-2xl bg-muted/60 border border-border/40 text-center font-mono">
            <span className="text-[0.62rem] text-muted-foreground uppercase block">Current Veto Action</span>
            <strong className="text-amber-400 font-bold text-xs">{currentTurn}&apos;s Turn (Step {vetoStep}/5)</strong>
          </div>

          <div className="flex items-center gap-3 justify-end text-right">
            <div>
              <span className="text-[0.62rem] font-mono text-rose-400 font-bold uppercase">Team Bravo</span>
              <h4 className="font-display font-bold text-foreground text-sm">Soul Gaming Clan</h4>
            </div>
            <Avatar className="w-12 h-12 border-2 border-rose-500">
              <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop" />
              <AvatarFallback>B</AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Custom Room Secret Key Card */}
        <div className="surface-1 p-5 rounded-3xl border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-foreground">Custom Lobby Credentials</h4>
              <p className="text-xs font-mono text-muted-foreground">Credentials appear only after a verified tournament service assigns a live match</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-300">
              <Info className="h-3.5 w-3.5" /> No active credentials
            </span>
          </div>
        </div>

        {/* Map Veto Grid */}
        <div className="space-y-4">
          <div className="showcase-section-title">
            <MapPin className="w-4 h-4 text-primary" />
            <h3>Map Pool & Practice Veto</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "surface-1 rounded-3xl border overflow-hidden p-4 space-y-3 transition-all relative",
                  m.bannedBy ? "border-rose-500/50 opacity-40 grayscale" : m.pickedBy ? "border-emerald-500 bg-emerald-500/10 shadow-lg glow-neon-primary" : "border-border/40 hover:border-primary/40"
                )}
              >
                <div className="aspect-video rounded-2xl overflow-hidden bg-black relative">
                  <img src={m.imageUrl} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full text-[0.62rem] font-mono font-bold bg-black/60 backdrop-blur-md text-white">
                    {m.game}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-sm text-foreground">{m.name}</h4>
                  {m.bannedBy && (
                    <span className="text-[0.65rem] font-mono text-rose-400 font-bold">Banned by {m.bannedBy}</span>
                  )}
                  {m.pickedBy && (
                    <span className="text-[0.65rem] font-mono text-emerald-400 font-bold">PICKED BY {m.pickedBy}</span>
                  )}
                </div>

                {!m.bannedBy && !m.pickedBy && (
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleBanMap(m.id)}
                      variant="outline"
                      className="flex-1 rounded-xl text-[0.68rem] font-bold text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Ban Map
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePickMap(m.id)}
                      className="flex-1 rounded-xl text-[0.68rem] font-bold bg-emerald-500 hover:bg-emerald-600 text-black"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Pick Map
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
