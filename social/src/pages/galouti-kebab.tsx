import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Sparkles, CheckCircle2, 
  IndianRupee, Clock, Award, Star, RotateCcw, Heart, Utensils 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface AwadhiOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: AwadhiOrder[] = [
  { id: 'gk-1', customer: 'Lucknow Chowk Heritage Connoisseurs', stall: 'Tunday Kababi Akbari Gate Chowk', combo: '160-Spice Smoked Galouti Kebabs + Saffron Milk Sheermal + Mint Chutney 🥩🫓', price: 240, served: false },
  { id: 'gk-2', customer: 'Hazratganj Royal Foodies', stall: 'Dastarkhwan Hazratganj', combo: 'Melt-in-Mouth Shami Galouti Kebab + Mughlai Ulta Tawa Paratha ✨🥩', price: 260, served: false },
  { id: 'gk-3', customer: 'Bara Imambara History Walkers', stall: 'Naushijaan Tulsi Theatre', combo: 'Kakori Seekh Kebab in Ghee Dhrung Smoke + Roomali Roti 🍖🔥', price: 210, served: false },
];

export default function GaloutiKebabRush() {
  const [orders, setOrders] = useState<AwadhiOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [awadhiKarma, setAwadhiKarma] = useState(3100);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setAwadhiKarma(k => k + 120);
    toast.success(`🥩 Melt-in-Mouth Awadhi Galouti Kebab on Sheermal served fresh to ${customer}! (+₹${price})`);
  };

  const handleNewCharcoalDhrung = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 Live clove & ghee charcoal dhrung smoking the 160-spice mince on the concave tawa!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-rose-600 to-red-700 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Galouti Kebab Chowk Tunday Express</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">160 Spices, Raw Papaya Tenderness, Ghee-Clove Dhungar Smoke & Saffron Sheermal</p>
          </div>
        </div>

        <Button onClick={handleNewCharcoalDhrung} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Ghee Dhungar
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Lucknow Chowk Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Awadhi Dastarkhwan Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{awadhiKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-rose-500" />
            <h3>Akbari Gate Chowk Galouti Kebab Orders</h3>
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
                    <CheckCircle2 className="w-4 h-4" /> Served Melt-in-Mouth
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🥩 Sear on Brass Tawa & Serve
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
