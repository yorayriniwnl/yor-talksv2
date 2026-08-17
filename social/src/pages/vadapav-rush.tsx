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

interface VadaPavOrder {
  id: string;
  commuter: string;
  station: string;
  chutney: string;
  price: number;
  served: boolean;
}

const INITIAL_VADAPAVS: VadaPavOrder[] = [
  { id: 'vp-1', commuter: 'Local Train Dabbawala', station: 'Dadar Station Fast', chutney: 'Extra Sukha Garlic 🌶️', price: 25, served: false },
  { id: 'vp-2', commuter: 'Nariman Point Stockbroker', station: 'Churchgate Slow', chutney: 'Green Chutney + Mirchi 🫑', price: 30, served: false },
  { id: 'vp-3', commuter: 'Bandra College Crew', station: 'Bandra Terminus', chutney: 'Cheese Butter Blast 🧀', price: 45, served: false },
];

export default function VadaPavRush() {
  const [orders, setOrders] = useState<VadaPavOrder[]>(INITIAL_VADAPAVS);
  const [cash, setCash] = useState(0);
  const [mumbaiKarma, setMumbaiKarma] = useState(550);

  const handleServeVadaPav = (id: string, commuter: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setCash(c => c + price);
    setMumbaiKarma(k => k + 40);
    toast.success(`🍔 Hot Golden Batata Vada Pav served to ${commuter}! (+₹${price})`);
  };

  const handleNewTrainArrival = () => {
    sounds.playPop();
    setOrders(INITIAL_VADAPAVS.map(o => ({ ...o, served: false })));
    toast.info('🚂 Next Mumbai Local Train arrived! Station queue refreshed.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Vada Pav & Mumbai Express Rush</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Crispy Batata Vada, Sukha Lasun Masala & Fried Mirchi Express</p>
          </div>
        </div>

        <Button onClick={handleNewTrainArrival} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Next Local Train
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Telemetry Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Stall Daily Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{cash} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Mumbai Street Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{mumbaiKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3>Station Platform Orders Queue</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className={cn(
                  "surface-1 p-5 rounded-3xl border flex flex-col justify-between shadow-lg space-y-4 transition-all",
                  o.served ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"
                )}
              >
                <div className="space-y-1">
                  <span className="text-xs font-mono text-muted-foreground">{o.station}</span>
                  <h4 className="font-display font-bold text-base text-foreground">{o.commuter}</h4>
                  <p className="text-xs font-mono text-amber-400">{o.chutney}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Crispy
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeVadaPav(o.id, o.commuter, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🍔 Assemble & Serve Vada Pav
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
