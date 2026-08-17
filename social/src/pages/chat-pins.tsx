import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pin, Sparkles, Copy, 
  Tv, MessageSquare, Heart, Crown, CheckCircle2, Shield, UserRound 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PinnedMessage {
  id: string;
  sender: string;
  badge: string;
  content: string;
  donation?: string;
  pinned: boolean;
}

const MESSAGES: PinnedMessage[] = [
  { id: 'pin-1', sender: 'Rohit_Gamer_99', badge: 'Tier 3 VIP Member', content: 'Bhai clutch was insane! Full support from Mumbai! 🇮🇳🔥', donation: '₹500 Superchat', pinned: true },
  { id: 'pin-2', sender: 'Esports_Caster_Aman', badge: 'Moderator', content: 'Next scrims lobby starts in 5 minutes guys! Stay tuned.', pinned: false },
  { id: 'pin-3', sender: 'Pooja_Sharma', badge: 'Loyal Fan 12 Mo', content: 'Congratulations on 100K subs milestone! 🎉👑', donation: '₹1000 Superchat', pinned: false },
];

export default function ChatPinsStudio() {
  const [messages, setMessages] = useState<PinnedMessage[]>(MESSAGES);

  const handleTogglePin = (id: string, sender: string) => {
    sounds.playPop();
    setMessages(prev => prev.map(m => m.id === id ? { ...m, pinned: !m.pinned } : m));
    toast.info(`📌 Pinned state updated for ${sender}'s message on stream!`);
  };

  const handleCopyPinsSource = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/chat-pins?theme=cyber_gold&fade=10s`);
    toast.success('📋 OBS Studio Transparent Chat Super-Pin Overlay URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Pin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Chat Highlights & Super-Pin Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Spotlight VIP Chat Bubbles, Superchat Badges & Transparent OBS Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyPinsSource}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Super-Pin URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Messages Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <h3>Live Chat Message Stream & Pinboard</h3>
          </div>

          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "surface-1 p-5 rounded-3xl border flex items-center justify-between shadow-lg transition-all",
                  m.pinned ? "border-amber-400 bg-amber-500/10 shadow-amber-500/20" : "border-border/40"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-foreground">{m.sender}</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono text-[0.65rem] font-bold">
                      {m.badge}
                    </span>
                    {m.donation && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[0.65rem] font-bold">
                        {m.donation}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{m.content}</p>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleTogglePin(m.id, m.sender)}
                  variant={m.pinned ? 'default' : 'outline'}
                  className={cn(
                    "rounded-xl font-mono text-xs font-bold",
                    m.pinned && "bg-amber-400 text-black hover:bg-amber-500"
                  )}
                >
                  <Pin className="w-3.5 h-3.5 mr-1" />
                  {m.pinned ? 'PINNED ON STREAM' : 'Pin Message'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
