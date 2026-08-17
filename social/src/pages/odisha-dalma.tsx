import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Sparkles, CheckCircle2, 
  IndianRupee, Clock, Award, Star, RotateCcw, Heart, Utensils, Sun 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface DalmaOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: DalmaOrder[] = [
  { id: 'od-1', customer: 'Puri Jagannath Temple Pilgrims', stall: 'Ananda Bazar Puri Heritage', combo: 'Temple Style Ghee Dalma + Steamed Arwa Rice & Kanika ✨🍲', price: 340, served: false },
  { id: 'od-2', customer: 'Bhubaneswar Old Town Travellers', stall: 'Dalma Restaurant Bhubaneswar', combo: 'Odia Vegetable Dalma + Hot Phulkas & Roasted Bhaja Jeera 🫓🍛', price: 380, served: false },
  { id: 'od-3', customer: 'Konark Sun Temple Visitors', stall: 'Nimapada Sweet Stall', combo: 'Caramelized Baked Chhena Poda + Ghee Dalma Combo 👑🍰', price: 360, served: false },
];

export default function OdishaDalmaRush() {
  const [orders, setOrders] = useState<DalmaOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [odiaKarma, setOdiaKarma] = useState(5800);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setOdiaKarma(k => k + 245);
    toast.success(`🍲 Authentic Odia Dalma served fresh to ${customer}! (+₹${price})`);
  };

  const handleTemperGheeChhunka = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 Desi ghee, panch phoron, dried red chilies & crushed roasted cumin-lanka gunda tempered in the dalma!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Odisha Dalma & Chhena Poda Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Toor Dal, Raw Papaya, Bhaja Jeera Lanka Gunda, Ghee Chhunka & Chhena Poda</p>
          </div>
        </div>

        <Button onClick={handleTemperGheeChhunka} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Temper Ghee Chhunka
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Puri & Bhubaneswar Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Jagannath Mahaprasad Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{odiaKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-amber-500" />
            <h3>Odisha Heritage Dalma & Chhena Poda Orders</h3>
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
                  <p className="text-xs font-mono text-amber-400">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Temple Dalma
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🍲 Ladle Temple Dalma & Serve
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
