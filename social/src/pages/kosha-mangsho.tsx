import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Sparkles, CheckCircle2, 
  IndianRupee, Clock, Award, Star, RotateCcw, Heart, Utensils, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface KoshaOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: KoshaOrder[] = [
  { id: 'km-1', customer: 'Shyambazar Golbari Foodies', stall: 'Golbari Shyambazar Heritage', combo: 'Dark Rich Kosha Mangsho + Puffed Hot White Luchis 🍖🫓', price: 480, served: false },
  { id: 'km-2', customer: 'College Street Boi Para Scholars', stall: 'Kewpies Kitchen Kolkata', combo: 'Slow Roasted Mutton Kosha + Bengali Sweet Basanti Pulao 🍚🍛', price: 520, served: false },
  { id: 'km-3', customer: 'Park Street Night Walkers', stall: '6 Ballygunge Place', combo: 'Traditional Kosha Mangsho + Mishti Doi & Sandesh 🍮✨', price: 460, served: false },
];

export default function KoshaMangshoRush() {
  const [orders, setOrders] = useState<KoshaOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [bengalKarma, setBengalKarma] = useState(6500);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setBengalKarma(k => k + 270);
    toast.success(`🍖 Authentic Kolkata Kosha Mangsho served fresh to ${customer}! (+₹${price})`);
  };

  const handleRoastIronKadhai = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 Pungent mustard oil, caramelized dark onions, whole garam masala & succulent goat meat bhuna roasting in cast iron kadhai!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-700 via-red-800 to-amber-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Kolkata Kosha Mangsho Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Slow Roasted Mutton, Mustard Oil, Caramelized Onions, Hot Luchis & Basanti Pulao</p>
          </div>
        </div>

        <Button onClick={handleRoastIronKadhai} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Roast Iron Kadhai
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Kolkata Cabin Heritage Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Bengal Heritage Food Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{bengalKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-rose-600" />
            <h3>Kolkata Golbari Kosha Mangsho & Luchi Orders</h3>
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
                  <p className="text-xs font-mono text-rose-400">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Kosha Mangsho
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🍖 Serve Dark Bhuna Kosha Mangsho
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
