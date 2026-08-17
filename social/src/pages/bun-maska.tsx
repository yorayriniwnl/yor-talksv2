import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, Flame, Sparkles, CheckCircle2, 
  IndianRupee, Clock, Award, Star, RotateCcw, Heart, Utensils 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface IraniOrder {
  id: string;
  customer: string;
  cafe: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: IraniOrder[] = [
  { id: 'bm-1', customer: 'Morning Marine Drive Walkers', cafe: 'Kyani & Co. Dhobi Talao', combo: 'Crusty Brun Maska + Double Butter Layer + Hot Irani Mawa Chai 🧈☕', price: 90, served: false },
  { id: 'bm-2', customer: 'Fort Heritage Book Lovers', cafe: 'Cafe Military Fort Express', combo: 'Tutti-Frutti Bun Jam Maska + Cardamom Condensed Milk Chai 🍓🍞', price: 100, served: false },
  { id: 'bm-3', customer: 'Vile Parle College Group', cafe: 'B. Merwan Grant Road Katta', combo: 'Soft Bun Maska + Mawa Cake Slice + Extra Chai Cutting 🍰☕', price: 120, served: false },
];

export default function BunMaskaRush() {
  const [orders, setOrders] = useState<IraniOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [iraniKarma, setIraniKarma] = useState(2100);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setIraniKarma(k => k + 80);
    toast.success(`☕ Hot Bun Maska dunked in Irani Chai served fresh to ${customer}! (+₹${price})`);
  };

  const handleNewBatch = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🧈 Freshly baked soft brun buns sliced! Irani mawa chai boiling in copper samovar.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-700 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Bun Maska Chai Irani Cafe Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Crusty Brun Buns, Salted Amul Butter, Tutti-Frutti Jam & Hot Irani Mawa Chai</p>
          </div>
        </div>

        <Button onClick={handleNewBatch} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Samovar Batch
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Vintage Irani Cafe Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Aamchi Mumbai Heritage Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{iraniKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Coffee className="w-4 h-4 text-amber-400" />
            <h3>Vintage Marble-Top Table Customer Orders</h3>
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
                  <span className="text-xs font-mono text-muted-foreground">{o.cafe}</span>
                  <h4 className="font-display font-bold text-base text-foreground">{o.customer}</h4>
                  <p className="text-xs font-mono text-amber-400">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Hot
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🧈 Slather Butter & Serve Chai
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
