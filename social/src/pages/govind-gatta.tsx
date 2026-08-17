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

interface GovindOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: GovindOrder[] = [
  { id: 'gg-1', customer: 'Jaipur City Palace Royal Guests', stall: 'LMB Johari Bazaar Jaipur', combo: 'Shahi Stuffed Govind Gatta + Ghee Ajwaini Paratha 🫓🍛', price: 440, served: false },
  { id: 'gg-2', customer: 'Amer Fort Heritage Diplomats', stall: '1135 AD Amer Shahi Rasoi', combo: 'Mawa-Cashew Stuffed Gatta + Kesar Dahi Gravy & Jeera Pulao 🍚✨', price: 480, served: false },
  { id: 'gg-3', customer: 'Jodhpur Umaid Bhawan Travelers', stall: 'Shri Thal Royal Hall', combo: 'Desi Ghee Fried Govind Gatta + Mint Raita & Phulkas 🫓🥛', price: 390, served: false },
];

export default function GovindGattaRush() {
  const [orders, setOrders] = useState<GovindOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [jaipurKarma, setJaipurKarma] = useState(9200);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setJaipurKarma(k => k + 400);
    toast.success(`🍛 Royal Jaipur Govind Gatta Curry served fresh to ${customer}! (+₹${price})`);
  };

  const handleSimmerGovindGatta = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 Simmering mawa & dryfruit stuffed besan cylinders in velvety saffron-cardamom dahi gravy!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-500 to-orange-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Rajasthani Govind Gatta Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Mawa-Cashew Stuffed Besan Gattas, Saffron Dahi Gravy & Ajwaini Parathas</p>
          </div>
        </div>

        <Button onClick={handleSimmerGovindGatta} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Simmer Govind Gatta
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Jaipur Heritage Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Pink City Culinary Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{jaipurKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-orange-500" />
            <h3>Jaipur Shahi Govind Gatta & Paratha Orders</h3>
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
                  <p className="text-xs font-mono text-amber-500">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Govind Gatta
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🍛 Serve Govind Gatta
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
