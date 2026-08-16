import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Boxes, Trophy, Disc, Radio, Users, Sparkles, 
  Smile, Flame, Volume2, ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface MetaversePlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  avatar: string;
  emote?: string;
}

export default function Metaverse() {
  const currentUser = useAppStore((s) => s.currentUser);

  const [playerPos, setPlayerPos] = useState({ x: 240, y: 180 });
  const [currentEmote, setCurrentEmote] = useState<string | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<MetaversePlayer[]>([
    { id: 'p1', name: 'Tanmay_Bhat', x: 120, y: 100, avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', emote: '🔥' },
    { id: 'p2', name: 'Hydra_Dynamo', x: 380, y: 220, avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', emote: '🔱' },
    { id: 'p3', name: 'Mortal_Soul', x: 300, y: 80, avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop', emote: '👑' },
  ]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 15;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        setPlayerPos(p => ({ ...p, y: Math.max(30, p.y - step) }));
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        setPlayerPos(p => ({ ...p, y: Math.min(320, p.y + step) }));
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setPlayerPos(p => ({ ...p, x: Math.max(30, p.x - step) }));
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setPlayerPos(p => ({ ...p, x: Math.min(540, p.x + step) }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerDanceEmote = (emote: string) => {
    sounds.playPop();
    setCurrentEmote(emote);
    triggerConfetti();
    toast.success(`Emote triggered in 3D Cyber Café!`);
    setTimeout(() => setCurrentEmote(null), 3000);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Cyber Café 3D Spatial Metaverse</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Virtual Esports Lounge, DJ Booth & Proximity Hangout</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Users className="w-3.5 h-3.5 text-primary" /> 4 Players Live in Room
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Virtual Room Stage */}
        <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-2xl p-6 relative select-none">
          <div className="relative w-full h-96 bg-zinc-950 rounded-2xl border border-border/60 overflow-hidden">
            {/* Grid Floor Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />

            {/* Zone 1: DJ Sound Booth */}
            <div className="absolute top-4 left-6 p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-center font-mono text-xs">
              <Disc className="w-6 h-6 text-purple-400 mx-auto animate-spin" />
              <span className="text-[0.6rem] text-purple-300 font-bold block mt-1">DJ Booth (Bhangra Synth)</span>
            </div>

            {/* Zone 2: Bharat Trophy Pedestal */}
            <div className="absolute top-4 right-6 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-center font-mono text-xs">
              <Trophy className="w-6 h-6 text-amber-400 mx-auto animate-bounce" />
              <span className="text-[0.6rem] text-amber-300 font-bold block mt-1">₹25L Trophy Pedestal</span>
            </div>

            {/* Zone 3: Live Esports Screen Projection */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-center font-mono text-xs">
              <Radio className="w-4 h-4 text-cyan-400 inline mr-1.5 animate-pulse" />
              <span className="text-cyan-300 font-bold">Main Stage Arena Screen (GodLike vs Soul)</span>
            </div>

            {/* Other Online Players */}
            {otherPlayers.map((p) => (
              <div
                key={p.id}
                style={{ left: p.x, top: p.y }}
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
              >
                {p.emote && (
                  <span className="text-lg bg-black/80 px-2 py-0.5 rounded-full border border-white/20 mb-1 animate-bounce">
                    {p.emote}
                  </span>
                )}
                <Avatar className="w-10 h-10 border-2 border-border shadow-md">
                  <AvatarImage src={p.avatar} />
                  <AvatarFallback>{p.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-[0.6rem] font-mono font-bold text-zinc-400 mt-1 bg-black/60 px-1.5 rounded">
                  {p.name}
                </span>
              </div>
            ))}

            {/* Current User Player Avatar */}
            <div
              style={{ left: playerPos.x, top: playerPos.y }}
              className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition-all duration-100 z-20"
            >
              {currentEmote && (
                <span className="text-2xl bg-amber-500/80 px-2 py-0.5 rounded-full mb-1 animate-bounce shadow-lg">
                  {currentEmote}
                </span>
              )}
              <Avatar className="w-12 h-12 border-2 border-primary glow-neon-primary shadow-2xl">
                <AvatarImage src={currentUser?.avatarUrl} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <span className="text-[0.65rem] font-mono font-black text-emerald-400 mt-1 bg-black/80 px-2 py-0.5 rounded-full border border-emerald-500/40">
                You ({currentUser?.displayName || 'Ayush'})
              </span>
            </div>
          </div>
        </div>

        {/* Emotes & Interaction Deck */}
        <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="showcase-section-title">
              <Smile className="w-4 h-4 text-amber-400" />
              <h3>Spatial Emote Triggers</h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground">Move with WASD or Arrow Keys</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            {[
              { emote: '🪕', label: 'Desi Bhangra' },
              { emote: '🔥', label: 'Clutch Fire' },
              { emote: '🔱', label: 'Trishul Aura' },
              { emote: '👑', label: 'Crown GG' },
              { emote: '☕', label: 'Chai Cheer' },
            ].map((btn) => (
              <Button
                key={btn.label}
                onClick={() => triggerDanceEmote(btn.emote)}
                variant="outline"
                className="rounded-2xl font-bold text-xs h-11 px-5 hover:bg-primary/20 hover:border-primary"
              >
                <span className="text-lg mr-2">{btn.emote}</span> {btn.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
