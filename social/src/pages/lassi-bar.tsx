import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coffee, Sparkles, CheckCircle2, IndianRupee, 
  Flame, Award, RotateCcw, Heart, Droplets 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface LassiOrder {
  id: string;
  customer: string;
  flavor: string;
  emoji: string;
  price: number;
  served: boolean;
}

const INITIAL_ORDERS: LassiOrder[] = [
  { id: 'l-1', customer: 'Bhangra Dancers Squad', flavor: 'Royal Kesar Pista Malai', emoji: '🥛', price: 120, served: false },
  { id: 'l-2', customer: 'Highway Roadtrippers', flavor: 'Alphonso Mango Cream Blast', emoji: '🥭', price: 140, served: false },
  { id: 'l-3', customer: 'Desi Uncleji Group', flavor: 'Rose Rooh Afza Kulhad', emoji: '🌹', price: 90, served: false },
];

export default function LassiBar() {
  const [orders, setOrders] = useState<LassiOrder[]>(INITIAL_ORDERS);
  const [earnings, setEarnings] = useState(0);
  const [churnCount, setChurnCount] = useState(12);

  const handleServeLassi = (id: string, flavor: string, price: number) => {
    sounds.playChime();
    triggerConfetti();
    setOrders(prev => prev.map(o => o.id === id ? { ...o, served: true } : o));
    setEarnings(e => e + price);
    toast.success(`🥛 Earthen Terracotta Kulhad of ${flavor} served thick & chilled! (+₹${price})`);
  };

  const handleMadhaniChurn = () => {
    sounds.playPop();
    setChurnCount(c => c + 1);
    toast.info('🥣 Wooden Madhani Churned! Malai layer whipped thick & creamy.');
  };

  const handleNewCustomers = () => {
    sounds.playPop();
    setOrders(INITIAL_ORDERS.map(o => ({ ...o, served: false })));
    toast.info('🔄 Fresh batch of thirsty Punjabi travelers arrived at the bar!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Desi Punjabi Lassi & Kulhad Bar</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Wooden Madhani Churning, Malai Whipping & Terracotta Kulhad Express</p>
          </div>
        </div>

        <Button onClick={handleNewCustomers} variant="outline" className="rounded-2xl text-xs font-mono">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> New Customers
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Earnings Bar */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Kulhad Bar Revenue</span>
            <strong className="font-display font-black text-3xl text-emerald-400">₹{earnings} INR</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Madhani Churn Cycles</span>
            <strong className="font-display font-black text-3xl text-amber-400">{churnCount} Churns</strong>
          </div>
        </div>

        {/* Churn Action */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 text-center space-y-3 max-w-md mx-auto shadow-xl">
          <Droplets className="w-8 h-8 text-amber-400 mx-auto animate-bounce" />
          <h3 className="font-display font-bold text-lg text-foreground">Wooden Madhani Churning Pot</h3>
          <p className="text-xs font-mono text-muted-foreground">Whip the curd, malai, and crushed ice for maximum froth!</p>
          <Button
            onClick={handleMadhaniChurn}
            className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            🥣 Churn Madhani (+Froth XP)
          </Button>
        </div>

        {/* Orders Queue */}
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3>Kulhad Lassi Orders in Queue</h3>
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
                  <span className="text-3xl block mb-1">{o.emoji}</span>
                  <h4 className="font-display font-bold text-base text-foreground">{o.flavor}</h4>
                  <p className="text-xs font-mono text-muted-foreground">{o.customer}</p>
                  <p className="text-xs font-mono text-emerald-400 font-bold">₹{o.price} INR</p>
                </div>

                {o.served ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Served Chilled
                  </span>
                ) : (
                  <Button
                    onClick={() => handleServeLassi(o.id, o.flavor, o.price)}
                    className="w-full rounded-xl font-bold text-xs h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    🥛 Pour & Serve Kulhad
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
