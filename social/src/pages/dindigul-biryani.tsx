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

interface DindigulOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: DindigulOrder[] = [
  { id: 'dg-1', customer: 'Dindigul Rock Fort Travellers', stall: 'Thalappakatti Biryani Dindigul', combo: 'Seeraga Samba Mutton Biryani + Enna Kathirikai Dalcha 🍖🍛', price: 440, served: false },
  { id: 'dg-2', customer: 'Madurai Highway Foodies', stall: 'Venu Biryani Dindigul', combo: 'Country Chicken (Nattu Kozhi) Biryani + Spiced Pepper Salna ✨🍗', price: 380, served: false },
  { id: 'dg-3', customer: 'Kodaikanal Foothills Travellers', stall: 'Ponram Biryani Dindigul', combo: 'Special Dindigul Dum Biryani + Boiled Egg & Onion Raitha 🥚🌶️', price: 360, served: false },
];

export default function DindigulBiryaniRush() {
  const [orders, setOrders] = useState<DindigulOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [tamilNaduKarma, setTamilNaduKarma] = useState(5600);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setTamilNaduKarma(k => k + 235);
    toast.success(`🍗 Authentic Thalappakatti Dindigul Biryani served fresh to ${customer}! (+₹${price})`);
  };

  const handleSimmerSeeragaSamba = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 Fragrant Seeraga Samba rice, stone-ground chinna vengayam & tender mutton dum simmering on iron firewood cauldrons!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-700 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Dindigul Thalappakatti Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Seeraga Samba Rice, Chinna Vengayam, Nattu Kozhi, Dalcha & Ghee Dum</p>
          </div>
        </div>

        <Button onClick={handleSimmerSeeragaSamba} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Simmer Samba Dum
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Tamil Nadu Highway Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Dindigul Dum Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{tamilNaduKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-orange-500" />
            <h3>Dindigul & Madurai Seeraga Samba Biryani Orders</h3>
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
                    <CheckCircle2 className="w-4 h-4" /> Served Dindigul Dum
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🍗 Serve Seeraga Samba Biryani
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
