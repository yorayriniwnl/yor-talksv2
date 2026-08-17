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

interface ThaliOrder {
  id: string;
  customer: string;
  stall: string;
  combo: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: ThaliOrder[] = [
  { id: 'dt-1', customer: 'Jaipur Heritage Palace Guests', stall: 'LMB Laxmi Mishthan Bhandar Johari Bazaar', combo: 'Unlimited Shahi Marwadi Thali (Dal Baati Churma + Gatte Ki Sabzi + Ker Sangri + Phulkas) 🍛🫓', price: 420, served: false },
  { id: 'dt-2', customer: 'Ahmedabad Manek Chowk Foodies', stall: 'Sasumaa Gujarati Thali Surat', combo: 'Unlimited Kathiyawadi Gujarati Thali (Sweet Kadhi + Undhiyu + Ringan No Olo + Basundi) ✨🥛', price: 390, served: false },
  { id: 'dt-3', customer: 'Udaipur City Palace Royal Walkers', stall: 'Natraj Dining Hall Udaipur', combo: 'Unlimited Mewari Bhojan (Sev Tamatar + Panchmel Dal + Bikaneri Papad + Chaas) 🍲🧈', price: 340, served: false },
];

export default function DesiThaliRush() {
  const [orders, setOrders] = useState<ThaliOrder[]>(INITIAL_ORDERS);
  const [revenue, setRevenue] = useState(0);
  const [bhojanKarma, setBhojanKarma] = useState(3550);

  const handleServeOrder = (id: string, customer: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setRevenue(r => r + price);
    setBhojanKarma(k => k + 140);
    toast.success(`🍛 Unlimited Shahi Thali with Ghee Phulkas & Chaas served fresh to ${customer}! (+₹${price})`);
  };

  const handleNewThaliSpread = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔥 12 Brass katoris filled with hot simmering dals, gatte & ghee-soaked phulkas!');
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
            <h1 className="text-xl font-bold font-display text-foreground">Desi Thali Unlimited Shudh Bhojanalaya</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">12-Katori Royal Brass Thali, Dal Baati, Gatte, Ker Sangri, Kadhi & Hot Phulkas</p>
          </div>
        </div>

        <Button onClick={handleNewThaliSpread} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Thali Spread
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Revenue Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Bhojanalaya Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{revenue} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Shudh Shakahari Karma</span>
            <strong className="font-display font-black text-3xl text-amber-400">+{bhojanKarma} XP</strong>
          </div>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Flame className="w-4 h-4 text-amber-500" />
            <h3>Johari Bazaar & Manek Chowk Unlimited Thali Orders</h3>
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
                    <CheckCircle2 className="w-4 h-4" /> Served Unlimited
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeOrder(o.id, o.customer, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🍛 Arrange Brass Platter & Serve
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
