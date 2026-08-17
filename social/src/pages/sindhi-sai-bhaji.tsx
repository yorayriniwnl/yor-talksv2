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

interface SaiBhajiOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: SaiBhajiOrder[] = [
  { id: 'sb-1', customer: 'Ulhasnagar Sindhi Heritage Community', stall: 'Kailash Parbat Heritage', combo: 'Authentic Sindhi Sai Bhaji + Caramelized Bhuga Chawal & Aloo Tuk 🍛🫓', price: 390, served: false },
  { id: 'sb-2', customer: 'Karachi Darbar Sindhi Families', stall: 'Tharu Mukhi Sindhi Rasoi', combo: 'Spinach Khatta Suva Sai Bhaji + Koki & Fried Sindhi Papad 🫓✨', price: 430, served: false },
  { id: 'sb-3', customer: 'Ajmer Sharif Sindhi Pilgrims', stall: 'Sindhudurg Royal Kitchen', combo: 'Nutritious Green Sai Bhaji + Ghee Phulkas & Boondi Raita 🍚🥗', price: 350, served: false },
];

export default function SindhiSaiBhajiRush() {
  const [orders, setOrders] = useState<SaiBhajiOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [sindhiKarma, setSindhiKarma] = useState(8000);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setSindhiKarma(k => k + 340);
    toast.success(`🥗 Authentic Sindhi Sai Bhaji & Bhuga Chawal served fresh to ${customer}! (+₹${price})`);
  };

  const handleSimmerSaiBhaji = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 Fresh spinach, khatte palak, aromatic suva dill, chana dal, tomatoes & green chilies simmering in cooker!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-green-600 to-amber-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Sindhi Sai Bhaji & Bhuga Chawal Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Slow-Cooked Spinach, Suva Dill, Khatte Palak, Chana Dal & Caramelized Bhuga Chawal</p>
          </div>
        </div>

        <Button onClick={handleSimmerSaiBhaji} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Simmer Sai Bhaji
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Sindhi Heritage Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Sindh Culinary Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{sindhiKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-emerald-600" />
            <h3>Sindhi Sai Bhaji & Bhuga Chawal Orders</h3>
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
                  <p className="text-xs font-mono text-emerald-400">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Sai Bhaji
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🥗 Serve Sindhi Sai Bhaji
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
