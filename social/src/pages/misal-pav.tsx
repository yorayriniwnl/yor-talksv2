import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, Flame, Sparkles, CheckCircle2, 
  IndianRupee, Clock, Award, Star, RotateCcw, Heart, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface MisalOrder {
  id: string;
  customer: string;
  katta: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: MisalOrder[] = [
  { id: 'mp-1', customer: 'Kolhapur Mahalaxmi Pilgrims', katta: 'Fadtare Misal Kendra', combo: 'Extra Spicy Lavangi Kat Misal + Crispy Farsan + 4 Butter Pavs 🌶️', price: 140, served: false },
  { id: 'mp-2', customer: 'FC Road Pune College Gang', katta: 'Katakirr Pune Katta', combo: 'Medium Kolhapuri Tarri Misal + Dahi Vati + Limbu Pyaaz 🍋', price: 160, served: false },
  { id: 'mp-3', customer: 'Mumbai Dadar Station Commuters', katta: 'Aaswad Maharashtrian Hub', combo: 'Special Puneri Matki Usal + Sev Farsan + Solkadhi 🥥', price: 150, served: false },
];

export default function MisalPavRush() {
  const [orders, setOrders] = useState<MisalOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [maharashtraKarma, setMaharashtraKarma] = useState(1790);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setMaharashtraKarma(k => k + 100);
    toast.success(`🌶️ Fiery Kolhapuri Zhatka Misal Pav served hot with red tarri to ${customer}! (+₹${price})`);
  };

  const handleNewTarriPot = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 Fiery Lavangi Kat Tarri boiling! Sprouted matki usal ready.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Misal Pav Kolhapuri Zhatka Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Sprouted Matki Usal, Fiery Red Lavangi Kat Tarri, Crunchy Farsan & Butter Pav</p>
          </div>
        </div>

        <Button onClick={handleNewTarriPot} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Tarri Pot
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Kolhapur Katta Daily Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Maharashtra Street Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{maharashtraKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-red-400" />
            <h3>Kolhapur Katta Morning Customer Queue</h3>
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
                  <span className="text-xs font-mono text-muted-foreground">{o.katta}</span>
                  <h4 className="font-display font-bold text-base text-foreground">{o.customer}</h4>
                  <p className="text-xs font-mono text-red-400">{o.combo}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Zhatka
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🌶️ Pour Red Tarri & Serve
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
