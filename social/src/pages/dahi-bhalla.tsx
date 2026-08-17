import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, Sparkles, CheckCircle2, 
  IndianRupee, Clock, Award, Star, RotateCcw, Heart, Flame 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface DahiBhallaOrder {
  id: string;
  customer: string;
  chaatCorner: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: DahiBhallaOrder[] = [
  { id: 'db-1', customer: 'Chandni Chowk Old Delhi Walkers', chaatCorner: 'Natraj Dahi Bhalla Corner', combo: 'Melt-in-Mouth Fluffy Bhallas + Thick Sweet Dahi + Red Saunth 🥣', price: 120, served: false },
  { id: 'db-2', customer: 'Bengali Market Connaught Place Shoppers', chaatCorner: 'Nathu Sweets New Delhi', combo: 'Special Dahi Papdi Chaat + Bhuna Jeera + Fresh Anar Pomegranate 🍎', price: 150, served: false },
  { id: 'db-3', customer: 'Lajpat Nagar Central Market Foodies', chaatCorner: 'Sindhi Dahi Vada Corner', combo: 'Double Soft Bhallas + Spicy Mint Coriander Chutney + Kala Namak 🌿', price: 130, served: false },
];

export default function DahiBhallaRush() {
  const [orders, setOrders] = useState<DahiBhallaOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [delhiKarma, setDelhiKarma] = useState(1850);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setDelhiKarma(k => k + 100);
    toast.success(`🥣 Chilled Sweet Dahi Bhalla served fresh with saunth & anar to ${customer}! (+₹${price})`);
  };

  const handleNewDahiMatka = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🥣 Chilled sweetened creamy dahi whipped! Soft urad dal bhallas ready in water.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-rose-400 to-red-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Dahi Bhalla Chandni Chowk Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Fluffy Urad Vadas, Thick Creamy Dahi, Red Saunth Chutney & Bhuna Jeera</p>
          </div>
        </div>

        <Button onClick={handleNewDahiMatka} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Dahi Matka
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Chandni Chowk Daily Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Purani Dilli Chaat Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{delhiKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Utensils className="w-4 h-4 text-amber-400" />
            <h3>Chandni Chowk Chaat Corner Customer Queue</h3>
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
                  <span className="text-xs font-mono text-muted-foreground">{o.chaatCorner}</span>
                  <h4 className="font-display font-bold text-base text-foreground">{o.customer}</h4>
                  <p className="text-xs font-mono text-amber-400">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Shahi
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🥣 Ladle Thick Dahi & Serve
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
