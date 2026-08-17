import { useState, useEffect } from 'react';
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

interface DhabaOrder {
  id: string;
  item: string;
  price: number;
  emoji: string;
  cooked: boolean;
}

const ORDERS: DhabaOrder[] = [
  { id: 'o-1', item: 'Butter Tandoori Naan', price: 60, emoji: '🫓', cooked: false },
  { id: 'o-2', item: 'Paneer Butter Masala', price: 280, emoji: '🍲', cooked: false },
  { id: 'o-3', item: 'Dal Makhani Slow-Simmered', price: 220, emoji: '🥣', cooked: false },
  { id: 'o-4', item: 'Kullad Sweet Lassi with Malai', price: 90, emoji: '🥛', cooked: false },
];

export default function DhabaRush() {
  const [orders, setOrders] = useState<DhabaOrder[]>(ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [chefKarma, setChefKarma] = useState(350);

  const handleCookItem = (id: string, item: string, price: number) => {
    sounds.playPop();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, cooked: true } : o));
    setRevenue(r => r + price);
    setChefKarma(k => k + 50);
    toast.success(`🍳 ${item} cooked hot & fresh! Served to highway traveler (+₹${price})`);

    // If all cooked
    if (orders.filter(o => o.id !== id && !o.cooked).length === 0) {
      sounds.playChime();
      triggerConfetti();
      toast.success('🌟 DHABA RUSH COMPLETED! All 4 orders served with 5-Star Dhaba Chef Rating!');
    }
  };

  const handleResetKitchen = () => {
    sounds.playPop();
    setOrders(ORDERS.map(o => ({ ...o, cooked: false })));
    toast.info('🔄 New highway traveler bus arrived! Fresh orders in queue.');
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
            <h1 className="text-xl font-bold font-display text-foreground">Desi Highway Dhaba Rush Simulator</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Tandoor Naan, Paneer Handi & Kullad Lassi Culinary Kitchen</p>
          </div>
        </div>

        <Button onClick={handleResetKitchen} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Customer Bus
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Telemetry Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Dhaba Daily Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Master Chef Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{chefKarma} XP</strong>
          </div>
        </div>

        {/* Kitchen Cooking Stations */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-amber-400" />
            <h3>Active Cooking Stations & Highway Orders</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className={cn(
                  "surface-1 p-5 rounded-3xl border flex items-center justify-between shadow-lg transition-all",
                  o.cooked ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{o.emoji}</span>
                  <div>
                    <h4 className="font-display font-bold text-base text-foreground">{o.item}</h4>
                    <span className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</span>
                  </div>
                </div>

                {o.cooked ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Hot
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleCookItem(o.id, o.item, o.price)}
                    className="rounded-xl font-bold text-xs h-10 px-4 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    <Flame className="w-3.5 h-3.5 mr-1" /> Cook & Serve
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
