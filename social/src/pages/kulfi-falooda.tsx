import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IceCream, Flame, Sparkles, CheckCircle2, 
  IndianRupee, Clock, Award, Star, RotateCcw, Heart, Droplets 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface KulfiOrder {
  id: string;
  customer: string;
  location: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: KulfiOrder[] = [
  { id: 'kf-1', customer: 'Old Delhi Summer Night Walkers', location: 'Kucha Pati Ram', combo: 'Zafrani Pista Matka Kulfi + Rose Falooda Sev 🍧', price: 160, served: false },
  { id: 'kf-2', customer: 'Ahmedabad Law Garden Foodies', location: 'Manek Chowk Fast', combo: 'Rabri Malai Kulfi Slice + Sabja Seeds + Roohafza 🌹', price: 190, served: false },
  { id: 'kf-3', customer: 'Mumbai Chowpatty Ice Lovers', location: 'Girgaon Sand', combo: 'Kesar Pista Kulfi Falooda Plate + Almond Flakes 🌰', price: 220, served: false },
];

export default function KulfiFaloodaRush() {
  const [orders, setOrders] = useState<KulfiOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [summerKarma, setSummerKarma] = useState(890);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setSummerKarma(k => k + 65);
    toast.success(`🍧 Chilled Royal Kulfi Falooda served to ${customer}! (+₹${price})`);
  };

  const handleNewMatkaBatch = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🧊 Fresh earthen matka kulfi batch unmolded! Falooda chilled.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <IceCream className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Kulfi Falooda Matka Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Earthen Pot Matka Kulfi, Chilled Rose Falooda Sev & Sabja Seeds</p>
          </div>
        </div>

        <Button onClick={handleNewMatkaBatch} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Matka Batch
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Kulfi Stall Daily Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Summer Foodie Karma</span>
            <strong className="font-display font-black text-3xl text-pink-400">+{summerKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Droplets className="w-4 h-4 text-pink-400" />
            <h3>Matka Kulfi Customer Queue</h3>
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
                  <span className="text-xs font-mono text-muted-foreground">{o.location}</span>
                  <h4 className="font-display font-bold text-base text-foreground">{o.customer}</h4>
                  <p className="text-xs font-mono text-pink-400">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Chilled
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🍧 Layer Falooda & Serve
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
