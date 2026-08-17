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

interface KundapuriOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: KundapuriOrder[] = [
  { id: 'kk-1', customer: 'Kundapura Coastal Beach Foodies', stall: 'Kundapur Shetty Lunch Home', combo: 'Spicy Kori Kundapuri Chicken + Soft Lacey Neer Dosas 🍗🫓', price: 440, served: false },
  { id: 'kk-2', customer: 'Udupi Sri Krishna Matha Pilgrims', stall: 'Hotel Janatha Deluxe Udupi', combo: 'Coconut Curry Kori Kundapuri + Ghee Rice & Rasam 🍚✨', price: 460, served: false },
  { id: 'kk-3', customer: 'Malpe Port Sea Travellers', stall: 'Machali Seafood & Chicken Hub', combo: 'Fiery Byadgi Kori Kundapuri + Pundi Rice Dumplings 🫓🍗', price: 390, served: false },
];

export default function KoriKundapuriRush() {
  const [orders, setOrders] = useState<KundapuriOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [coastalKarma, setCoastalKarma] = useState(8200);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setCoastalKarma(k => k + 350);
    toast.success(`🍗 Fiery Kori Kundapuri Chicken served fresh to ${customer}! (+₹${price})`);
  };

  const handleRoastKundapuriMasala = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 Roasted Byadgi red chilies, coriander seeds, fresh coconut, peppercorns & garlic simmering with chicken!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-red-600 to-amber-800 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Kori Kundapuri & Neer Dosa Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Kundapur Roasted Byadgi Masala, Coconut Milk Gassi & Lacey Neer Dosas</p>
          </div>
        </div>

        <Button onClick={handleRoastKundapuriMasala} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Roast Byadgi Masala
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Karavali Coastal Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Kundapur Culinary Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{coastalKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-red-600" />
            <h3>Kundapur Kori Chicken & Neer Dosa Orders</h3>
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
                    <CheckCircle2 className="w-4 h-4" /> Served Kori Kundapuri
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🍗 Serve Kori Kundapuri
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
