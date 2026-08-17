import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, IndianRupee, Flame, Crown, Heart, 
  Send, Music, CheckCircle2, Gift, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface Superchat {
  id: string;
  sender: string;
  amount: number;
  message: string;
  tier: 'shagan' | 'dhol' | 'toofan' | 'maharaja';
  avatar: string;
  timestamp: string;
}

const INITIAL_CHATS: Superchat[] = [
  {
    id: 'sc-1',
    sender: 'Aman Sharma',
    amount: 5001,
    message: 'MAHARAJA SUPERCHAT! GODLIKE CLUTCH IN ROUND 14 🔥🇮🇳',
    tier: 'maharaja',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    timestamp: 'Just now'
  },
  {
    id: 'sc-2',
    sender: 'Rohan Verma',
    amount: 501,
    message: 'Toofan clutch bhai! Best sniper in South Asia! 🚀',
    tier: 'toofan',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    timestamp: '2m ago'
  },
  {
    id: 'sc-3',
    sender: 'Kavita Nair',
    amount: 101,
    message: 'Chai on me stream team! ☕🥁',
    tier: 'dhol',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
    timestamp: '5m ago'
  }
];

export default function SuperchatStudio() {
  const [chats, setChats] = useState<Superchat[]>(INITIAL_CHATS);
  const [amount, setAmount] = useState(251);
  const [message, setMessage] = useState('Desi Dhol Banger on Stream! 🔥');

  const handleSendSuperchat = () => {
    if (!message.trim()) return;
    sounds.playChime();
    triggerConfetti();

    let tier: Superchat['tier'] = 'dhol';
    if (amount <= 51) tier = 'shagan';
    else if (amount <= 251) tier = 'dhol';
    else if (amount <= 1100) tier = 'toofan';
    else tier = 'maharaja';

    const newSC: Superchat = {
      id: Date.now().toString(),
      sender: 'You (Gamer Prime)',
      amount,
      message: message.trim(),
      tier,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop',
      timestamp: 'Just now'
    };

    setChats([newSC, ...chats]);
    toast.success(`🎉 Sent ₹${amount} Superchat to Stream Broadcast!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Live Superchat & Desi Dhol Celebration Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Stream Donations with Animated Brass, Dhols & Instant UPI</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Instant Sound Alerts & Full Screen FX
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Superchat Builder Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-5 shadow-xl">
              <div className="showcase-section-title">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <h3>Choose Superchat Tier</h3>
              </div>

              {/* Tier Quick Select */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                {[
                  { label: 'Shagan ✨', amt: 51, color: 'border-cyan-500/40 text-cyan-400' },
                  { label: 'Chai Dhol 🥁', amt: 251, color: 'border-amber-500/40 text-amber-400' },
                  { label: 'Toofan Blast 🎆', amt: 501, color: 'border-orange-500/40 text-orange-400' },
                  { label: 'Maharaja King 👑', amt: 5001, color: 'border-pink-500/40 text-pink-400' },
                ].map((t) => (
                  <button
                    key={t.amt}
                    onClick={() => {
                      sounds.playPop();
                      setAmount(t.amt);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border font-bold transition-all text-left",
                      amount === t.amt ? "bg-primary/20 border-primary ring-2 ring-primary/30" : "surface-1 hover:bg-muted/40",
                      t.color
                    )}
                  >
                    <span className="block text-[0.65rem] text-muted-foreground">{t.label}</span>
                    <strong className="text-sm">₹{t.amt}</strong>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <span className="text-[0.65rem] font-mono uppercase text-muted-foreground block">Superchat Message</span>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Send a hype cheer to the streamer..."
                  className="rounded-xl font-bold text-xs h-11"
                />
              </div>

              <Button
                onClick={handleSendSuperchat}
                className="w-full rounded-2xl font-bold text-xs h-12 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black shadow-lg glow-neon-primary"
              >
                <Send className="w-4 h-4 mr-2" /> Broadcast Superchat (₹{amount} UPI)
              </Button>
            </div>
          </div>

          {/* Superchat Live Feed Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="showcase-section-title">
              <Flame className="w-4 h-4 text-rose-500" />
              <h3>Live Stream Superchat Ticker</h3>
            </div>

            <div className="space-y-4">
              {chats.map((sc) => (
                <div
                  key={sc.id}
                  className={cn(
                    "rounded-3xl p-5 border shadow-2xl space-y-3 transition-all",
                    sc.tier === 'maharaja' && "bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-amber-400 ring-2 ring-amber-400/40",
                    sc.tier === 'toofan' && "bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-400",
                    sc.tier === 'dhol' && "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-400",
                    sc.tier === 'shagan' && "surface-1 border-border/40"
                  )}
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-white/20">
                        <AvatarImage src={sc.avatar} />
                        <AvatarFallback>{sc.sender[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-display font-bold text-sm text-foreground">{sc.sender}</h4>
                        <span className="text-[0.65rem] font-mono text-muted-foreground">{sc.timestamp}</span>
                      </div>
                    </div>

                    <div className="font-display font-black text-lg text-amber-300">
                      ₹{sc.amount.toLocaleString()}
                    </div>
                  </div>

                  <p className="text-sm font-sans font-bold text-foreground leading-relaxed">
                    {sc.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
