import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, Flame, Sparkles, CheckCircle2, 
  IndianRupee, Clock, Award, Star, RotateCcw, Heart 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface KeralaOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: KeralaOrder[] = [
  { id: 'as-1', customer: 'Fort Kochi Sunset Tourists', stall: 'Kashi Art Cafe & Thattukada', combo: 'Lace-Edged Soft Appams + Coconut Milk Veg Stew + Fresh Curry Leaves 🥥🌿', price: 150, served: false },
  { id: 'as-2', customer: 'Munnar Tea Estate Backpackers', stall: 'Dhe Puttu & Appam Junction', combo: 'Double Egg Bullseye Appam + Rich Chicken Stew + Black Pepper Gravy 🥚🍗', price: 170, served: false },
  { id: 'as-3', customer: 'Kovalam Beach Surfers Group', stall: 'Mothers Veg Plaza Thiruvananthapuram', combo: 'Piping Hot Spongy Appams + Sweet Cardamom Coconut Milk Dip 🥥✨', price: 140, served: false },
];

export default function AppamStewRush() {
  const [orders, setOrders] = useState<KeralaOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [keralaKarma, setKeralaKarma] = useState(2350);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setKeralaKarma(k => k + 95);
    toast.success(`🥥 Lace-Edged Spongy Appam & Rich Coconut Stew served hot to ${customer}! (+₹${price})`);
  };

  const handleNewAppachattiBatch = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🍳 Curved Appachatti pans sizzling! Fresh coconut milk fermented batter ready to swirl.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Appam Stew Kerala Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Curved Appachatti Lace Hoppers, Spongy Center & Aromatic Coconut Milk Stew</p>
          </div>
        </div>

        <Button onClick={handleNewAppachattiBatch} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Appachatti Batch
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">God's Own Country Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Kerala Culinary Karma</span>
            <strong className="font-display font-black text-3xl text-teal-400">+{keralaKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Utensils className="w-4 h-4 text-emerald-400" />
            <h3>Fresh Coconut Stew Customer Orders</h3>
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
                  <span className="text-xs font-mono text-muted-foreground">{o.stall}</span>
                  <h4 className="font-display font-bold text-base text-foreground">{o.customer}</h4>
                  <p className="text-xs font-mono text-teal-400">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Spongy
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🥥 Swirl Appam & Serve Stew
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
