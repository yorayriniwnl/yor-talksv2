import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Radio, Mic, MicOff, Hand, MessageSquare, 
  Sparkles, Users, Flame, Volume2, ShieldCheck, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

interface Speaker {
  id: string;
  name: string;
  role: string;
  avatar: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface PodcastStage {
  id: string;
  title: string;
  genre: string;
  listeners: number;
  speakers: Speaker[];
}

const STAGES: PodcastStage[] = [
  {
    id: 'stg-1',
    title: 'VCT Masters Scrims & Tactical Meta Debrief 🎮',
    genre: 'Esports & Gaming',
    listeners: 1420,
    speakers: [
      { id: 's1', name: 'Aravind Rao', role: 'Host · Radiant Duelist', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', isSpeaking: true, isMuted: false },
      { id: 's2', name: 'Yuki Tanaka', role: 'Co-Host · FGC Champion', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', isSpeaking: false, isMuted: false },
      { id: 's3', name: 'Devansh D.', role: 'Guest · Analyst', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop', isSpeaking: false, isMuted: true }
    ]
  },
  {
    id: 'stg-2',
    title: 'Frontier AI Agents, WebGPU & Spatial Interfaces 🤖',
    genre: 'AI & Neural Tech',
    listeners: 2890,
    speakers: [
      { id: 's4', name: 'Ayush Roy', role: 'Host · Yor Talks Architect', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', isSpeaking: true, isMuted: false },
      { id: 's5', name: 'Marcus Vance', role: 'Co-Host · Systems Researcher', avatar: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=200&auto=format&fit=crop', isSpeaking: false, isMuted: false },
      { id: 's6', name: 'Aditi Singh', role: 'Guest · ML Engineer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop', isSpeaking: false, isMuted: false }
    ]
  },
  {
    id: 'stg-3',
    title: 'Modular Synthesis, Eurorack & Sound Design Masterclass 🎛️',
    genre: 'Music & Audio',
    listeners: 980,
    speakers: [
      { id: 's7', name: 'Renata Silva', role: 'Host · Modular Artist', avatar: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=200&auto=format&fit=crop', isSpeaking: true, isMuted: false },
      { id: 's8', name: 'Clara Vogel', role: 'Co-Host · Berlin Techno DJ', avatar: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop', isSpeaking: false, isMuted: false }
    ]
  },
  {
    id: 'stg-4',
    title: 'Damascus Metallurgy, Heat Treatment & Japanese Cutlery ⚔️',
    genre: 'Craftsmanship & Blades',
    listeners: 1650,
    speakers: [
      { id: 's9', name: 'Thorin Lindqvist', role: 'Host · Master Bladesmith', avatar: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?q=80&w=200&auto=format&fit=crop', isSpeaking: true, isMuted: false },
      { id: 's10', name: 'Hiroshi Tanaka', role: 'Co-Host · Kyoto Knife Master', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', isSpeaking: false, isMuted: false }
    ]
  }
];

export default function PodcastStudio() {
  const [selectedStageId, setSelectedStageId] = useState<string>('stg-1');
  const [isHandRaised, setIsHandRaised] = useState(false);

  const activeStage = STAGES.find(s => s.id === selectedStageId) || STAGES[0];
  const speakers = activeStage.speakers;

  const handleRaiseHand = () => {
    sounds.playChime();
    setIsHandRaised(!isHandRaised);
    if (!isHandRaised) {
      toast.info('✋ Hand marked in this stage preview. No host notification was sent.');
    } else {
      toast.info('Hand lowered in this stage preview.');
    }
  };

  const handleReact = (emoji: string) => {
    sounds.playPop();
    toast.info(`Reaction ${emoji} recorded in this stage preview. No live event was sent.`);
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
            <p className="text-[0.68rem] text-muted-foreground font-mono">Audio stage preview · live panel transport is not connected yet</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isHandRaised ? 'default' : 'outline'}
            onClick={handleRaiseHand}
            className={cn("rounded-2xl font-bold text-xs", isHandRaised && "bg-amber-500 text-black glow-neon-primary")}
          >
            <Hand className="w-3.5 h-3.5 mr-1" /> {isHandRaised ? 'Hand Marked ✋' : 'Mark Hand (Preview)'}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Stage Selector Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedStageId(s.id)}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-semibold transition-all whitespace-nowrap border shrink-0 text-left flex flex-col gap-0.5",
                selectedStageId === s.id
                  ? "bg-primary text-primary-foreground border-primary glow-neon-primary font-bold shadow-md"
                  : "surface-1 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <span>{s.title}</span>
              <span className="text-[0.65rem] opacity-75 font-mono">🎧 {s.listeners.toLocaleString()} listening · {s.genre}</span>
            </button>
          ))}
        </div>

        {/* Stage Speakers Grid */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" /> LIVE STAGE SPEAKERS ({speakers.length} / 6 SLOTS)
            </span>
            <span className="text-xs font-mono text-muted-foreground">🎧 {activeStage.listeners.toLocaleString()} Active Listeners</span>
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
