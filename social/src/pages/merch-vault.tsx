import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shirt, Package, Truck, Sparkles, CheckCircle2, 
  Send, ShieldCheck, Tag, Box, Award 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface JerseyItem {
  id: string;
  player: string;
  jerseyName: string;
  patches: string;
  rfidTag: string;
  dispatched: boolean;
}

const INITIAL_JERSEYS: JerseyItem[] = [
  { id: 'j-1', player: 'Jonathan Gaming #01', jerseyName: 'GodLike Esports 2025 LAN Gold Pro Kit', patches: 'Tricolor Crest 🇮🇳 + ROG Sponsor Badge', rfidTag: 'RFID-9842-GL', dispatched: true },
  { id: 'j-2', player: 'Manya #07', jerseyName: 'Team Soul BMPS Champions Edition', patches: 'MVP Golden Star ⭐ + S8UL Crest', rfidTag: 'RFID-7712-SOUL', dispatched: false },
  { id: 'j-3', player: 'Sensei #04', jerseyName: 'Revenant Esports Official Match Jersey', patches: 'Tournament Patch + Monster Badge', rfidTag: 'RFID-3310-RVT', dispatched: false },
];

export default function MerchVault() {
  const [jerseys, setJerseys] = useState<JerseyItem[]>(INITIAL_JERSEYS);

  const handleDispatchKit = (id: string, player: string) => {
    sounds.playChime();
    triggerConfetti();
    setJerseys(prev => prev.map(j => j.id === id ? { ...j, dispatched: true } : j));
    toast.success(`📦 Official Match Pro Kit dispatched via BlueDart Express courier to ${player}!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Jersey Locker & Merch Vault</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">RFID Tracking, Custom Sponsor Patches & BlueDart Logistics</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Truck className="w-3.5 h-3.5 text-emerald-400" /> BlueDart Courier: SYNCED
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-4 font-sans">
          {jerseys.map((j) => (
            <div
              key={j.id}
              className={cn(
                "surface-1 p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between shadow-xl gap-4 transition-all",
                j.dispatched ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"
              )}
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-amber-400 block">{j.rfidTag}</span>
                <h3 className="font-display font-black text-lg text-foreground">{j.jerseyName}</h3>
                <p className="text-xs font-mono text-muted-foreground">Player: <strong className="text-foreground">{j.player}</strong> • {j.patches}</p>
              </div>

              {j.dispatched ? (
                <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Dispatched via BlueDart
                </span>
              ) : (
                <Button
                  onClick={() => handleDispatchKit(j.id, j.player)}
                  className="rounded-xl font-bold text-xs h-10 px-5 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> Dispatch Pro Kit
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
