import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Mic, MicOff, Hand, MessageSquare, 
  Sparkles, Users, Flame, Volume2, ShieldCheck, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface Speaker {
  id: string;
  name: string;
  role: string;
  avatar: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

export default function PodcastStudio() {
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [speakers, setSpeakers] = useState<Speaker[]>([
    {
      id: 's1',
      name: 'Tanmay &quot;Scout&quot; Cyber',
      role: 'Host · Esports Legend',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      isSpeaking: true,
      isMuted: false
    },
    {
      id: 's2',
      name: 'Naman &quot;Mortal&quot; Mathur',
      role: 'Co-Host · Soul Gaming',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
      isSpeaking: false,
      isMuted: false
    },
    {
      id: 's3',
      name: 'Animesh &quot;Thug&quot; Agarwal',
      role: 'Guest · 8Bit Creatives',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
      isSpeaking: false,
      isMuted: true
    }
  ]);

  const handleRaiseHand = () => {
    sounds.playChime();
    setIsHandRaised(!isHandRaised);
    if (!isHandRaised) {
      toast.success('✋ Hand raised! Host has been notified to bring you onto the stage.');
    } else {
      toast.info('Hand lowered.');
    }
  };

  const handleReact = (emoji: string) => {
    sounds.playPop();
    triggerConfetti();
    toast.success(`Sent live reaction ${emoji}!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Live Audio Stage & Podcast</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live Voice Panels, Esports Debates & Interactive Audience</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isHandRaised ? 'default' : 'outline'}
            onClick={handleRaiseHand}
            className={cn("rounded-2xl font-bold text-xs", isHandRaised && "bg-amber-500 text-black glow-neon-primary")}
          >
            <Hand className="w-3.5 h-3.5 mr-1" /> {isHandRaised ? 'Hand Raised ✋' : 'Raise Hand'}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Stage Speakers Grid */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" /> LIVE STAGE SPEAKERS (3 / 6 SLOTS)
            </span>
            <span className="text-xs font-mono text-muted-foreground">🎧 1,420 Active Listeners</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {speakers.map((sp) => (
              <div
                key={sp.id}
                className={cn(
                  "p-6 rounded-3xl border flex flex-col items-center text-center space-y-3 transition-all relative",
                  sp.isSpeaking ? "border-primary bg-primary/10 shadow-lg glow-neon-primary scale-105" : "border-border/40 bg-muted/20"
                )}
              >
                <div className="relative">
                  <Avatar className={cn("w-20 h-20 border-2", sp.isSpeaking ? "border-primary ring-4 ring-primary/40 animate-pulse" : "border-border")}>
                    <AvatarImage src={sp.avatar} />
                    <AvatarFallback>{sp.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border flex items-center justify-center text-xs">
                    {sp.isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-500" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </div>

                <div>
                  <h4 className="font-display font-bold text-sm text-foreground">{sp.name}</h4>
                  <span className="text-[0.65rem] font-mono text-muted-foreground">{sp.role}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Live AI Bilingual Subtitle Teleprompter */}
          <div className="p-4 rounded-2xl bg-black/60 border border-border/40 font-mono text-xs text-zinc-300 space-y-1">
            <span className="text-[0.6rem] text-primary uppercase block font-bold">Live AI Speech Transcript (Hindi / English)</span>
            <p className="italic">
              &quot;...Next season ka BGMI roadmap is looking crazy. Total 4 Tier-1 LANs announced across Mumbai, Delhi, and Bengaluru with ₹3 Crore prize pool.&quot;
            </p>
          </div>

          {/* Audience Reaction Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-border/30">
            <span className="text-xs font-mono text-muted-foreground">Send Live Stage Reactions:</span>
            <div className="flex gap-2">
              {['🔥', '🚀', '🔱', '👑', '☕', '❤️'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="w-10 h-10 rounded-2xl bg-muted/40 hover:bg-muted/80 text-lg flex items-center justify-center transition-transform hover:scale-125 active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
