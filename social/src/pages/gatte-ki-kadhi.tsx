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

interface KadhiOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: KadhiOrder[] = [
  { id: 'gk-1', customer: 'Mandore Garden Heritage Walkers', stall: 'Marwar Village Rasoi', combo: 'Spiced Besan Gatte Ki Kadhi + Bajra Phulka & Cow Butter 🫓🍲', price: 370, served: false },
  { id: 'gk-2', customer: 'Osian Desert Temple Devotees', stall: 'Osian Thar Kadhi Sthal', combo: 'Mathania Chili Tempered Kadhi Gatta + Missi Roti & Lehsun Chutney 🫓🌶️', price: 410, served: false },
  { id: 'gk-3', customer: 'Bikaner Kote Gate Feasting Families', stall: 'Bikaner Traditional Handi', combo: 'Sour Chaas Kadhi Gatta + Steamed Rice & Ghee Jaggery 🍲✨', price: 330, served: false },
];

export default function GatteKiKadhiRush() {
  const [orders, setOrders] = useState<KadhiOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [kadhiKarma, setKadhiKarma] = useState(10000);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setKadhiKarma(k => k + 440);
    toast.success(`🍲 Royal Rajasthani Gatte Ki Kadhi served hot to ${customer}! (+₹${price})`);
  };

  const handleSimmerKadhiGatta = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 Simmering poached besan gattas in spiced sour buttermilk kadhi with rai, methi & Mathania mirch tadka!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-yellow-500 via-amber-500 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Rajasthani Gatte Ki Kadhi Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Poached Besan Gattas in Sour Chaas Kadhi, Mathania Mirch Tadka, Bajra Phulkas & Cow Butter</p>
          </div>
        </div>

        <Button onClick={handleSimmerKadhiGatta} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Simmer Kadhi Gatta
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Marwar Kadhi Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Desert Village Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{kadhiKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-yellow-500" />
            <h3>Marwar Gatte Ki Kadhi & Bajra Phulka Orders</h3>
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
                  <p className="text-xs font-mono text-yellow-500">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Gatte Ki Kadhi
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🍲 Serve Gatte Ki Kadhi
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
