import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Headphones, Mic, MicOff, Volume2, VolumeX, Users, Music2, 
  Sparkles, Radio, Disc, Play, Square, MessageSquare, Hand 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SpatialAvatar {
  id: string;
  name: string;
  avatar: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  isSpeaking?: boolean;
  role: 'speaker' | 'listener' | 'host';
}

const INITIAL_AVATARS: SpatialAvatar[] = [
  { id: '1', name: 'Ayush Roy', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', x: 50, y: 35, role: 'host', isSpeaking: true },
  { id: '2', name: 'Anya', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop', x: 38, y: 45, role: 'speaker' },
  { id: '3', name: 'Rohan Verma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', x: 62, y: 45, role: 'speaker' },
  { id: '4', name: 'Aditi Singh', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop', x: 25, y: 70, role: 'listener' },
  { id: '5', name: 'Marcus Vance', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop', x: 75, y: 70, role: 'listener' },
  { id: '6', name: 'Aravind Rao', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop', x: 30, y: 55, role: 'speaker' },
  { id: '7', name: 'Renata Silva', avatar: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=200&auto=format&fit=crop', x: 70, y: 55, role: 'speaker' },
  { id: '8', name: 'Kenji Sato', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop', x: 15, y: 80, role: 'listener' },
  { id: '9', name: 'Sakura Miyamoto', avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=200&auto=format&fit=crop', x: 85, y: 80, role: 'listener' },
  { id: '10', name: 'Mateo Rossi', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop', x: 42, y: 75, role: 'listener' },
];

export default function Lounge() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [avatars, setAvatars] = useState<SpatialAvatar[]>(INITIAL_AVATARS);
  const [myPos, setMyPos] = useState({ x: 50, y: 80 });
  const [isMuted, setIsMuted] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [activeTrack, setActiveTrack] = useState('Desi Cyber Lounge · Mumbai Midnight Beats');
  const stageRef = useRef<HTMLDivElement>(null);

  // Synthesized Soundboard Audio Engine
  const playSynthesizedPad = (type: 'sitar' | 'tabla' | 'laser' | 'horn') => {
    sounds.playPop();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'sitar') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.3); // D5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    } else if (type === 'tabla') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    } else if (type === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    } else if (type === 'horn') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(15, Math.min(90, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
    
    sounds.playSwoosh();
    setMyPos({ x, y });
  };

  const handleRaiseHand = () => {
    sounds.playPop();
    setHandRaised(!handRaised);
    toast.info(!handRaised ? '✋ Hand raised to speak on stage' : 'Lowered hand');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">देसी Spatial Audio Lounge</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">2D Proximity Voice & Collaborative Soundboard</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRaiseHand}
            variant={handRaised ? 'default' : 'outline'}
            className={cn("rounded-2xl font-bold text-xs", handRaised && "bg-amber-500 text-black border-amber-400")}
          >
            <Hand className="w-3.5 h-3.5 mr-1" />
            {handRaised ? 'Hand Raised' : 'Raise Hand'}
          </Button>

          <Button
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
            className={cn("rounded-2xl font-bold text-xs", isMuted ? "bg-rose-600 text-white" : "bg-emerald-600 text-white")}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5 mr-1" /> : <Mic className="w-3.5 h-3.5 mr-1" />}
            {isMuted ? 'Muted' : 'Mic Active'}
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Spatial Audio 2D Canvas Stage */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h3 className="font-display font-bold text-sm text-foreground">Spatial Audio Room: Bharat Tech & Chill</h3>
            </div>
            <p className="text-xs font-mono text-muted-foreground hidden sm:block">Click anywhere on the floor plan to move your spatial avatar</p>
          </div>

          {/* Interactive Floor Plan */}
          <div
            ref={stageRef}
            onClick={handleStageClick}
            className="relative w-full h-96 sm:h-[420px] rounded-2xl bg-zinc-950/90 border border-border/60 overflow-hidden cursor-crosshair shadow-inner select-none"
          >
            {/* Ambient Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

            {/* Center Stage Audio Emitter */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/60 flex items-center justify-center animate-pulse shadow-2xl">
                <Music2 className="w-8 h-8 text-primary" />
              </div>
              <span className="text-[0.65rem] font-mono font-bold text-primary mt-2 px-2.5 py-0.5 rounded-full bg-black/80 border border-primary/30">
                🎙️ Stage Audio Focal Center
              </span>
            </div>

            {/* Render Other Avatars */}
            {avatars.map((av) => (
              <motion.div
                key={av.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1, left: `${av.x}%`, top: `${av.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10"
              >
                <div className={cn("p-1 rounded-full border-2 transition-all", av.isSpeaking ? "border-emerald-400 ring-4 ring-emerald-400/30 scale-110" : "border-border/60 bg-zinc-900")}>
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={av.avatar} />
                    <AvatarFallback>{av.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-[0.62rem] font-mono font-bold text-white bg-black/80 px-2 py-0.5 rounded-full mt-1 border border-white/10 truncate max-w-[80px]">
                  {av.name}
                </span>
              </motion.div>
            ))}

            {/* Render My Draggable Avatar */}
            <motion.div
              animate={{ left: `${myPos.x}%`, top: `${myPos.y}%` }}
              transition={{ type: 'spring', damping: 20, stiffness: 250 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none"
            >
              <div className="p-1 rounded-full border-2 border-amber-400 bg-amber-500/20 ring-4 ring-amber-400/40 shadow-2xl scale-110">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={currentUser?.avatarUrl} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-[0.65rem] font-mono font-bold text-amber-300 bg-black/90 px-2.5 py-0.5 rounded-full mt-1 border border-amber-400/40">
                ⭐ You (Spatial Listener)
              </span>
            </motion.div>
          </div>
        </div>

        {/* Interactive Desi Live Soundboard */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-sm">
          <div className="showcase-section-title mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3>Interactive Live Soundboard (देसी पैड्स)</h3>
          </div>
          <p className="text-xs text-muted-foreground font-mono mb-6">Trigger real-time synthesized acoustic pads to hype the speaker and stage.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Button
              onClick={() => playSynthesizedPad('sitar')}
              className="h-20 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
            >
              <span className="text-lg">🪕</span>
              <span className="font-display font-bold text-xs mt-1">Sitar Riff</span>
            </Button>

            <Button
              onClick={() => playSynthesizedPad('tabla')}
              className="h-20 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30"
            >
              <span className="text-lg">🥁</span>
              <span className="font-display font-bold text-xs mt-1">Tabla 808 Drop</span>
            </Button>

            <Button
              onClick={() => playSynthesizedPad('laser')}
              className="h-20 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30"
            >
              <span className="text-lg">⚡</span>
              <span className="font-display font-bold text-xs mt-1">Cyber Laser</span>
            </Button>

            <Button
              onClick={() => playSynthesizedPad('horn')}
              className="h-20 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30"
            >
              <span className="text-lg">🎺</span>
              <span className="font-display font-bold text-xs mt-1">Victory Horn</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
