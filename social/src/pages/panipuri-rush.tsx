import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, Flame, Sparkles, CheckCircle2, 
  IndianRupee, Clock, Award, Star, Play, RotateCcw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface CustomerPlate {
  id: string;
  customer: string;
  waterType: 'Teekha Pudina 🌶️' | 'Meetha Imli 🍯' | 'Mixed Khatta Meetha ✨';
  purisServed: number;
  completed: boolean;
}

const INITIAL_PLATES: CustomerPlate[] = [
  { id: 'c-1', customer: 'College Student Duo', waterType: 'Teekha Pudina 🌶️', purisServed: 3, completed: false },
  { id: 'c-2', customer: 'Techie on Chai Break', waterType: 'Mixed Khatta Meetha ✨', purisServed: 4, completed: false },
  { id: 'c-3', customer: 'Aunty & Family', waterType: 'Meetha Imli 🍯', purisServed: 2, completed: false },
];

export default function PanipuriRush() {
  const [plates, setPlates] = useState<CustomerPlate[]>(INITIAL_PLATES);
  const [revenue, setRevenue] = useState(0);
  const [vendorKarma, setVendorKarma] = useState(420);

  const handleServePuri = (id: string, customer: string) => {
    sounds.playPop();
    setPlates(prev => prev.map(p => {
      if (p.id === id) {
        const nextCount = p.purisServed + 1;
        if (nextCount >= 6) {
          sounds.playChime();
          triggerConfetti();
          setRevenue(r => r + 40);
          setVendorKarma(k => k + 60);
          toast.success(`🎉 Plate of 6 Golgappe completed for ${customer}! (+₹40 + Sukha Puri Served!)`);
          return { ...p, purisServed: 6, completed: true };
        }
        return { ...p, purisServed: nextCount };
      }
      return p;
    }));
  };

  const handleNewRound = () => {
    sounds.playPop();
    setPlates(INITIAL_PLATES.map(p => ({ ...p, purisServed: 0, completed: false })));
    toast.info('🔄 Fresh crowd of street foodies arrived at the stall!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-amber-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Street Panipuri & Golgappa Rush</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Crispy Puris, Teekha Pudina Paani & Sukha Puri Finale</p>
          </div>
        </div>

        <Button onClick={handleNewRound} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Street Crowd
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Stall Earnings</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Vendor Karma XP</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{vendorKarma} XP</strong>
          </div>
        </div>

        {/* Customer Plates Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3>Active Panipuri Plates (6 Puris per plate)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plates.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "surface-1 p-5 rounded-3xl border flex flex-col justify-between shadow-lg space-y-4 transition-all",
                  p.completed ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"
                )}
              >
                <div className="space-y-1">
                  <span className="text-[0.65rem] font-mono text-muted-foreground block">{p.waterType}</span>
                  <h4 className="font-display font-bold text-base text-foreground">{p.customer}</h4>
                  <p className="text-xs font-mono text-emerald-400 font-bold">{p.purisServed} / 6 Puris</p>
                </div>

                {p.completed ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Plate Done + Sukha Puri
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServePuri(p.id, p.customer)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🥄 Serve Next Puri ({p.purisServed + 1}/6)
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
