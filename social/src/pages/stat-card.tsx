import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Sparkles, CheckCircle2, 
  Download, Share2, Crown, Swords, Shield, Target, Award, UserRound 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface StatMetrics {
  playerName: string;
  clanTag: string;
  kills: number;
  damage: number;
  kdRatio: number;
  clutchesWon: number;
  mvpRating: string;
}

export default function StatCardGenerator() {
  const [metrics, setMetrics] = useState<StatMetrics>({
    playerName: 'JONATHAN',
    clanTag: 'GODLIKE',
    kills: 14,
    damage: 2840,
    kdRatio: 3.5,
    clutchesWon: 3,
    mvpRating: '9.8 / 10 (S-TIER MVP)',
  });

  const handleExportCard = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🖼️ 4K High-Res Esports Match MVP Stat Card exported for Instagram & Twitter!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports MVP Stat Card Generator</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Tournament MVP Match Stats, K/D Ratio, Damage Matrix & 4K Social Export</p>
          </div>
        </div>

        <Button
          onClick={handleExportCard}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export 4K Stat Card
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Stat Card Graphic Canvas */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
                <Crown className="w-3.5 h-3.5" /> MATCH MVP OF THE DAY
              </div>
              <h2 className="font-display font-black text-4xl text-foreground tracking-tight">
                [{metrics.clanTag}] {metrics.playerName}
              </h2>
              <p className="text-sm font-mono text-muted-foreground">Grand Finals • Map 4 Erangel • WWCD Champions</p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/40 border border-border/40 text-center font-mono">
              <span className="text-muted-foreground uppercase text-[0.65rem] block">Performance Index</span>
              <strong className="font-display font-black text-2xl text-emerald-400">{metrics.mvpRating}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 font-mono text-center">
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
              <span className="text-muted-foreground text-[0.65rem] uppercase block">Total Frags</span>
              <span className="font-display font-black text-3xl text-primary">{metrics.kills}</span>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
              <span className="text-muted-foreground text-[0.65rem] uppercase block">Damage Dealt</span>
              <span className="font-display font-black text-3xl text-orange-400">{metrics.damage}</span>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
              <span className="text-muted-foreground text-[0.65rem] uppercase block">K/D Ratio</span>
              <span className="font-display font-black text-3xl text-cyan-400">{metrics.kdRatio}</span>
            </div>
            <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
              <span className="text-muted-foreground text-[0.65rem] uppercase block">1v3 Clutches</span>
              <span className="font-display font-black text-3xl text-amber-400">{metrics.clutchesWon}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
