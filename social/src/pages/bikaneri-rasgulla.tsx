import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  Award,
  Share2,
  RotateCcw,
  Heart,
  ChevronRight,
  Droplet,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface RasgullaBatch {
  id: string;
  spongeLevel: number; // 1-100%
  syrupClarity: number; // 1-100%
  aromaSaffron: number; // 1-100%
  temperature: number; // °C
  pricePerDoz: number;
}

export default function BikaneriRasgullaPage() {
  const [stage, setStage] = useState<'knead-chenna' | 'roll-spheres' | 'rolling-syrup-boil' | 'kesar-milk-soak' | 'served'>('knead-chenna');
  const [chennaSmoothness, setChennaSmoothness] = useState(30);
  const [boilDuration, setBoilDuration] = useState(12);
  const [totalRevenue, setTotalRevenue] = useState(4850);
  const [batchesServed, setBatchesServed] = useState(18);

  const handleKneadChenna = () => {
    sounds.playPop();
    setChennaSmoothness((prev) => Math.min(prev + 25, 100));
    if (chennaSmoothness >= 75) {
      setStage('roll-spheres');
      toast.success('🥛 Fresh Cow Milk Chenna kneaded to velvet smooth, crack-free consistency!');
    } else {
      toast.info('👐 Palm kneading chenna to release whey and create uniform texture...');
    }
  };

  const handleRollSpheres = () => {
    sounds.playPop();
    setStage('rolling-syrup-boil');
    toast.success('⚪ Hand-rolled 12 perfectly symmetrical, crack-free spongy chenna spheres!');
  };

  const handleRollingSyrupBoil = () => {
    sounds.playPop();
    setStage('kesar-milk-soak');
    toast.success('🔥 Boiled in rolling clarified light sugar syrup for 14 minutes until doubled in size & porous!');
  };

  const handleKesarMilkSoak = () => {
    sounds.playChime();
    triggerConfetti();
    setStage('served');
    const earned = 480;
    setTotalRevenue((r) => r + earned);
    setBatchesServed((b) => b + 1);
    toast.success(`👑 BIKANERI KESAR SPONGE RASGULLA BATCH COMPLETED! (+₹${earned})`);
  };

  const handleNewBatch = () => {
    sounds.playPop();
    setChennaSmoothness(30);
    setStage('knead-chenna');
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl surface-1 border border-border/40 shadow-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 text-stone-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
            <Crown className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400 bg-clip-text text-transparent">
                Bikaneri Kesar Rasgulla Express
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Heritage Confectionery
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Desi Cow Milk Chenna Velvet Kneading, Rolling Syrup Expansion & Saffron Rosewater Soak
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="surface-2 px-4 py-2 rounded-2xl border border-border/40">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Halwai Revenue</span>
            <span className="text-xl font-black text-amber-400">₹{totalRevenue}</span>
          </div>
          <div className="surface-2 px-4 py-2 rounded-2xl border border-border/40">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Batches Served</span>
            <span className="text-xl font-black text-emerald-400">{batchesServed} Dozen</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface-1 rounded-3xl p-6 border border-border/40 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Utensils className="w-5 h-5 text-amber-400" />
                Live Halwai Crafting Station
              </h3>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Stage {stage === 'knead-chenna' ? '1/4' : stage === 'roll-spheres' ? '2/4' : stage === 'rolling-syrup-boil' ? '3/4' : stage === 'kesar-milk-soak' ? '4/4' : 'Complete'}
              </span>
            </div>

            <div className="relative aspect-video rounded-2xl bg-gradient-to-b from-stone-950 to-amber-950/40 border border-amber-500/20 p-6 flex flex-col items-center justify-center text-center overflow-hidden">
              <AnimatePresence mode="wait">
                {stage === 'knead-chenna' && (
                  <motion.div
                    key="knead-chenna"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3">
                      <Droplet className="w-10 h-10 text-amber-400 animate-pulse" />
                    </div>
                    <h4 className="text-lg font-bold text-amber-300 mb-1">Step 1: Palm Knead Velvet Chenna</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                      Knead freshly coagulated cow milk chenna with your palm until all graininess dissolves and natural fats release ({chennaSmoothness}% smooth).
                    </p>
                    <div className="w-48 bg-stone-800 rounded-full h-2.5 mb-4 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all"
                        style={{ width: `${chennaSmoothness}%` }}
                      />
                    </div>
                    <Button
                      onClick={handleKneadChenna}
                      className="bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold gap-2 shadow-lg shadow-amber-500/25"
                    >
                      <Utensils className="w-4 h-4" /> Knead Chenna with Palm
                    </Button>
                  </motion.div>
                )}

                {stage === 'roll-spheres' && (
                  <motion.div
                    key="roll-spheres"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mb-3">
                      <Sparkles className="w-10 h-10 text-yellow-400 animate-bounce" />
                    </div>
                    <h4 className="text-lg font-bold text-yellow-300 mb-1">Step 2: Roll Crack-Free Spheres</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                      Divide the velvety chenna into equal 15g portions and gently roll between palms to form mirror-smooth spheres without surface cracks.
                    </p>
                    <Button
                      onClick={handleRollSpheres}
                      className="bg-yellow-500 hover:bg-yellow-600 text-stone-950 font-bold gap-2 shadow-lg shadow-yellow-500/25"
                    >
                      <Sparkles className="w-4 h-4" /> Roll 12 Spherical Chenna Balls
                    </Button>
                  </motion.div>
                )}

                {stage === 'rolling-syrup-boil' && (
                  <motion.div
                    key="rolling-syrup-boil"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mb-3">
                      <Flame className="w-10 h-10 text-orange-400 animate-pulse" />
                    </div>
                    <h4 className="text-lg font-bold text-orange-300 mb-1">Step 3: Rolling Syrup High-Boil</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                      Drop into rolling boiling clarified sugar-water syrup (108°C). The rapid boiling creates internal air pockets, swelling balls to 2.2x volume.
                    </p>
                    <Button
                      onClick={handleRollingSyrupBoil}
                      className="bg-orange-500 hover:bg-orange-600 text-stone-950 font-bold gap-2 shadow-lg shadow-orange-500/25"
                    >
                      <Flame className="w-4 h-4 fill-current" /> High-Heat Rolling Boil (14 Mins)
                    </Button>
                  </motion.div>
                )}

                {stage === 'kesar-milk-soak' && (
                  <motion.div
                    key="kesar-milk-soak"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-3">
                      <Crown className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h4 className="text-lg font-bold text-emerald-300 mb-1">Step 4: Chilled Kesar Saffron & Rosewater Soak</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                      Transfer hot spongy rasgullas into iced saffron rosewater chashni infused with green cardamom pods to lock in spongy texture.
                    </p>
                    <Button
                      onClick={handleKesarMilkSoak}
                      className="bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold gap-2 shadow-lg shadow-emerald-500/25"
                    >
                      <Crown className="w-4 h-4 fill-current" /> Chill in Kesar Saffron Chashni
                    </Button>
                  </motion.div>
                )}

                {stage === 'served' && (
                  <motion.div
                    key="served"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-yellow-400 flex items-center justify-center mb-3 text-stone-950 shadow-xl shadow-amber-500/30">
                      <Award className="w-10 h-10 fill-current" />
                    </div>
                    <h4 className="text-xl font-black text-amber-300 mb-1">Bikaneri Kesar Rasgulla Batch Ready!</h4>
                    <p className="text-xs text-muted-foreground max-w-sm mb-4">
                      Ultra-spongy, melt-in-mouth Bikaneri rasgullas served chilled with golden saffron strands (+₹480).
                    </p>
                    <Button
                      onClick={handleNewBatch}
                      variant="outline"
                      className="border-amber-500/40 hover:bg-amber-500/10 text-amber-300 gap-2"
                    >
                      <RotateCcw className="w-4 h-4" /> Start Next Chenna Batch
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Quality Metrics & Confectionery Insights */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              Batch Quality Index
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Real-time confectionery physics evaluation
            </p>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-border/40">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-muted-foreground">Sponge Rebound Elasticity</span>
                  <span className="text-emerald-400">99.4%</span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-[99%]" />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-border/40">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-muted-foreground">Syrup Light Clarity</span>
                  <span className="text-amber-400">96.8%</span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full w-[96%]" />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-border/40">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-muted-foreground">Kashmiri Saffron Infusion</span>
                  <span className="text-orange-400">98.2%</span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-orange-400 h-full rounded-full w-[98%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-xs font-bold text-amber-300 block mb-1">👑 Master Halwai Secret</span>
            <p className="text-xs text-muted-foreground">
              Always knead chenna without over-warming with hand friction. Rapid temperature shock in chilled kesar syrup prevents collapse and locks in the legendary Bikaneri honeycomb sponge.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
