import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Headphones, Mic, MicOff, Volume2, VolumeX, 
  Sparkles, Radio, Shield, Users, Sliders, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface SquadMember {
  id: string;
  name: string;
  role: string;
  isSpeaking: boolean;
  isMuted: boolean;
  volume: number;
  avatar: string;
}

const INITIAL_MEMBERS: SquadMember[] = [
  {
    id: 'sm-1',
    name: 'Scout Cyber (You)',
    role: 'Assaulter / Scout',
    isSpeaking: true,
    isMuted: false,
    volume: 100,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'sm-2',
    name: 'Mortal Soul',
    role: 'IGL / Shotcaller',
    isSpeaking: false,
    isMuted: false,
    volume: 90,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'
  },
  {
    id: 'sm-3',
    name: 'Viper Clutch',
    role: 'Support / DMR',
    isSpeaking: true,
    isMuted: false,
    volume: 85,
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop'
  }
];

export default function SquadCommsRoom() {
  const [channel, setChannel] = useState<'war-room' | 'strat-room' | 'lounge'>('war-room');
  const [members, setMembers] = useState<SquadMember[]>(INITIAL_MEMBERS);
  const [isSelfMuted, setIsSelfMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  const toggleSelfMute = () => {
    sounds.playPop();
    setIsSelfMuted(!isSelfMuted);
    setMembers(prev => prev.map((m, idx) => idx === 0 ? { ...m, isMuted: !isSelfMuted } : m));
    toast.info(!isSelfMuted ? 'Mic Muted 🔇' : 'Mic Live 🎙️');
  };

  const toggleDeafen = () => {
    sounds.playPop();
    setIsDeafened(!isDeafened);
    toast.info(!isDeafened ? 'Audio Output Deafen Active' : 'Audio Output Live');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-cyan-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Squad Voice Comms & Spatial Matrix</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Ultra-Low Latency Opus Voice Comms for Clan Scrims</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" /> Ping: 12ms (Mumbai Node)
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Channel Selector Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-3 shadow-sm font-sans">
              <div className="showcase-section-title">
                <Users className="w-4 h-4 text-primary" />
                <h3>Voice Channels</h3>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'war-room', name: '🔊 #scrim-war-room-1', desc: '5/5 Pro Players' },
                  { id: 'strat-room', name: '🛡️ #coach-strategy-hq', desc: '2/5 Coaches' },
                  { id: 'lounge', name: '☕ #desi-chai-lounge', desc: '8 Active Hangout' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      sounds.playPop();
                      setChannel(ch.id as any);
                    }}
                    className={cn(
                      "w-full p-3 rounded-2xl border text-left transition-all",
                      channel === ch.id ? "border-primary bg-primary/20 shadow-md glow-neon-primary" : "surface-1 hover:bg-muted/40"
                    )}
                  >
                    <strong className="text-xs font-display text-foreground block">{ch.name}</strong>
                    <span className="text-[0.65rem] font-mono text-muted-foreground">{ch.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Controls */}
            <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-3 shadow-sm font-mono text-xs">
              <div className="flex gap-2">
                <Button
                  onClick={toggleSelfMute}
                  variant={isSelfMuted ? "destructive" : "outline"}
                  className="w-1/2 rounded-2xl text-xs font-bold h-11"
                >
                  {isSelfMuted ? <><MicOff className="w-3.5 h-3.5 mr-1" /> Unmute</> : <><Mic className="w-3.5 h-3.5 mr-1" /> Mute Mic</>}
                </Button>
                <Button
                  onClick={toggleDeafen}
                  variant={isDeafened ? "destructive" : "outline"}
                  className="w-1/2 rounded-2xl text-xs font-bold h-11"
                >
                  {isDeafened ? <><VolumeX className="w-3.5 h-3.5 mr-1" /> Undeafen</> : <><Volume2 className="w-3.5 h-3.5 mr-1" /> Deafen</>}
                </Button>
              </div>
            </div>
          </div>

          {/* Active Voice Channel Members */}
          <div className="lg:col-span-8 space-y-4">
            <div className="showcase-section-title">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3>Channel Roster ({channel.toUpperCase()})</h3>
            </div>

            <div className="space-y-3">
              {members.map((mem) => (
                <div
                  key={mem.id}
                  className={cn(
                    "surface-1 p-4 rounded-3xl border flex items-center justify-between transition-all",
                    mem.isSpeaking && !mem.isMuted ? "border-emerald-500 bg-emerald-500/10 shadow-lg glow-neon-primary" : "border-border/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-border">
                        <AvatarImage src={mem.avatar} />
                        <AvatarFallback>{mem.name[0]}</AvatarFallback>
                      </Avatar>
                      {mem.isSpeaking && !mem.isMuted && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
                      )}
                    </div>

                    <div>
                      <h4 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                        {mem.name}
                        {mem.isSpeaking && !mem.isMuted && (
                          <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            SPEAKING
                          </span>
                        )}
                      </h4>
                      <span className="text-xs font-mono text-muted-foreground">{mem.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs">
                    <span className="text-muted-foreground">{mem.volume}% Vol</span>
                    {mem.isMuted ? (
                      <MicOff className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Mic className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
