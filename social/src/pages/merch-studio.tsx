import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, Sparkles, Palette, Type, ShieldCheck, 
  IndianRupee, Download, CheckCircle2, RotateCcw, Shirt 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

const JERSEY_COLORS = [
  { id: 'saffron', name: 'Saffron Laser 🇮🇳', bg: 'bg-gradient-to-tr from-orange-600 to-amber-500', hex: '#ea580c' },
  { id: 'black', name: 'Stealth Obsidian 🖤', bg: 'bg-gradient-to-tr from-zinc-950 to-zinc-800', hex: '#18181b' },
  { id: 'cyan', name: 'Cyberpunk Neon ⚡', bg: 'bg-gradient-to-tr from-cyan-600 to-blue-600', hex: '#0284c7' },
  { id: 'crimson', name: 'Esports Crimson 🔥', bg: 'bg-gradient-to-tr from-red-600 to-rose-500', hex: '#dc2626' },
];

export default function MerchStudio() {
  const [gamerTag, setGamerTag] = useState('AYUSH #07');
  const [selectedColor, setSelectedColor] = useState(JERSEY_COLORS[0]);
  const [jerseyType, setJerseyType] = useState<'pro-jersey' | 'hoodie'>('pro-jersey');
  const [selectedBadge, setSelectedBadge] = useState('🔱');

  const handleOrder = () => {
    toast.info('Merchandise checkout is not connected yet. No order or payment was created.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator Merchandise & Jersey Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Custom Clan Esports Jerseys & Apparel Customizer</p>
          </div>
        </div>

        <Button
          onClick={handleOrder}
          className="rounded-2xl font-bold text-xs bg-muted text-muted-foreground"
        >
          <IndianRupee className="w-3.5 h-3.5 mr-1" /> Checkout unavailable
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* 3D/2D Jersey Visualizer Column */}
          <div className="lg:col-span-6 flex justify-center py-6">
            <div className={cn(
              "relative w-80 h-96 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-between border-4 border-white/20 select-none transition-all duration-500",
              selectedColor.bg
            )}>
              {/* Collar Detail */}
              <div className="w-24 h-8 bg-zinc-900/60 rounded-b-2xl border border-white/20 flex items-center justify-center text-[0.6rem] font-mono text-white">
                YOR PRO
              </div>

              {/* Clan Badge Hologram */}
              <div className="text-4xl filter drop-shadow-[0_0_12px_rgba(255,255,255,0.6)] animate-pulse my-auto">
                {selectedBadge}
              </div>

              {/* Gamer Tag Lettering */}
              <div className="text-center space-y-1 mb-4">
                <h3 className="font-display font-black text-2xl text-white tracking-widest drop-shadow-md uppercase">
                  {gamerTag}
                </h3>
                <span className="text-[0.65rem] font-mono font-bold text-white/80 bg-black/40 px-3 py-0.5 rounded-full">
                  OFFICIAL GUILD ATHLETE
                </span>
              </div>
            </div>
          </div>

          {/* Customizer Editor Column */}
          <div className="lg:col-span-6 space-y-6">
            {/* Tag Input */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <Type className="w-4 h-4 text-primary" />
                <h3>Custom Gamer Tag & Number</h3>
              </div>

              <Input
                value={gamerTag}
                onChange={(e) => setGamerTag(e.target.value.toUpperCase())}
                maxLength={16}
                className="rounded-xl font-bold font-mono text-sm uppercase h-11"
              />
            </div>

            {/* Color Palette Chooser */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <Palette className="w-4 h-4 text-amber-400" />
                <h3>Team Color Palette</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {JERSEY_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedColor(c);
                    }}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-bold text-left transition-all flex items-center gap-2.5",
                      selectedColor.id === c.id ? "border-primary bg-primary/20 shadow-md" : "border-border/40 hover:bg-muted/40"
                    )}
                  >
                    <span style={{ backgroundColor: c.hex }} className="w-4 h-4 rounded-full inline-block border border-white/20" />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Clan Badge Selector */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-3 shadow-sm">
              <div className="showcase-section-title">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3>Clan Chest Emblem</h3>
              </div>

              <div className="flex gap-2">
                {['🔱', '👑', '⚡', '🏆', '🔥', '🦁'].map((badge) => (
                  <button
                    key={badge}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedBadge(badge);
                    }}
                    className={cn(
                      "w-11 h-11 rounded-2xl text-xl flex items-center justify-center border transition-all",
                      selectedBadge === badge ? "border-amber-400 bg-amber-500/20 scale-110 shadow" : "border-border/40 hover:bg-muted/40"
                    )}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
