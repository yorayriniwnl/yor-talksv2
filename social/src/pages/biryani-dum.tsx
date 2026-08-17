import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Sparkles, CheckCircle2, IndianRupee, 
  Utensils, Clock, Award, Star, RotateCcw, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface BiryaniHandi {
  id: string;
  name: string;
  riceType: string;
  dumState: 'Sealing Atta Dough' | 'Slow Coal Dum Cooking' | 'Fragrant Dum Broken!';
  price: number;
  completed: boolean;
}

const INITIAL_HANDIS: BiryaniHandi[] = [
  { id: 'b-1', name: 'Hyderabadi Zafrani Mutton Dum Biryani', riceType: 'Long-Grain Aged Basmati + Saffron', dumState: 'Sealing Atta Dough', price: 420, completed: false },
  { id: 'b-2', name: 'Lucknowi Nawabi Chicken Dum Handi', riceType: 'Kewra & Cardamom Infused', dumState: 'Slow Coal Dum Cooking', price: 360, completed: false },
];

export default function BiryaniDumSimulator() {
  const [handis, setHandis] = useState<BiryaniHandi[]>(INITIAL_HANDIS);
  const [earnings, setEarnings] = useState(0);
  const [ustadKarma, setUstadKarma] = useState(620);

  const handleBreakDum = (id: string, name: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setHandis(prev => prev.map(h => h.id === id ? { ...h, dumState: 'Fragrant Dum Broken!', completed: true } : h));
    setEarnings(e => e + price);
    setUstadKarma(k => k + 80);
    toast.success(`🍲 ROYAL DUM BROKEN! ${name} served piping hot with Mirchi ka Salan (+₹${price})`);
  };

  const handleNewDawat = () => {
    sounds.playPop();
    setHandis(INITIAL_HANDIS.map(h => ({ ...h, completed: false })));
    toast.info('👑 Royal Dawat banquet guests arrived! Fresh handis ready for Dum cooking.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Biryani Handi Dum Simulator</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Slow Charcoal Dum, Atta Dough Parda & Royal Zafran Layering</p>
          </div>
        </div>

        <Button onClick={handleNewDawat} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Dawat Banquet
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Earnings Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Dawat Banquet Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{earnings} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Master Ustad Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{ustadKarma} XP</strong>
          </div>
        </div>

        {/* Handis Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Utensils className="w-4 h-4 text-amber-400" />
            <h3>Active Clay Handis on Slow Charcoal Coal</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {handis.map((h) => (
              <div
                key={h.id}
                className={cn(
                  "surface-1 p-6 rounded-3xl border flex flex-col justify-between shadow-lg space-y-4 transition-all",
                  h.completed ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🍲</span>
                    <span className="text-xs font-mono text-amber-400 font-bold">{h.dumState}</span>
                  </div>
                  <h4 className="font-display font-bold text-lg text-foreground">{h.name}</h4>
                  <p className="text-xs font-mono text-muted-foreground">{h.riceType}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{h.price} INR</p>
                </div>

                {h.completed ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Royal Dum Served
                  </span>
                ) : (
                  <Button
                    onClick={() => handleBreakDum(h.id, h.name, h.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🔥 Break Atta Parda & Serve Dum
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
