import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, IndianRupee, ShieldCheck, CheckCircle2, 
  Send, Sparkles, Receipt, Building, Download 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PrizePayout {
  rank: string;
  team: string;
  grossPrize: number;
  tdsDeduction: number;
  netPayout: number;
  paid: boolean;
}

const INITIAL_PAYOUTS: PrizePayout[] = [
  { rank: '🥇 1st Place (Champions)', team: 'GodLike Esports', grossPrize: 1000000, tdsDeduction: 300000, netPayout: 700000, paid: true },
  { rank: '🥈 2nd Place (Runners Up)', team: 'Team Soul / S8UL', grossPrize: 500000, tdsDeduction: 150000, netPayout: 350000, paid: false },
  { rank: '🥉 3rd Place', team: 'Revenant Esports', grossPrize: 250000, tdsDeduction: 75000, netPayout: 175000, paid: false },
];

export default function PrizePoolEscrow() {
  const [payouts, setPayouts] = useState<PrizePayout[]>(INITIAL_PAYOUTS);

  const handleDisbursePayout = (team: string, netAmount: number) => {
    sounds.playChime();
    triggerConfetti();
    setPayouts(prev => prev.map(p => p.team === team ? { ...p, paid: true } : p));
    toast.success(`💸 ₹${netAmount.toLocaleString()} INR net prize dispatched via Instant NEFT to ${team} after 30% Section 194B TDS!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Prize Pool Escrow & TDS Hub</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Section 194B (30% TDS) Compliance, Gross Purses & Instant NEFT Payouts</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Escrow Status: 100% FUNDED
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-4 font-sans">
          {payouts.map((p) => (
            <div
              key={p.rank}
              className={cn(
                "surface-1 p-6 rounded-3xl border flex flex-col md:flex-row md:items-center justify-between shadow-xl gap-4 transition-all",
                p.paid ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"
              )}
            >
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-amber-400 block">{p.rank}</span>
                <h4 className="font-display font-bold text-lg text-foreground">{p.team}</h4>
                <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1">
                  <span>Gross: ₹{p.grossPrize.toLocaleString()}</span>
                  <span className="text-red-400 font-semibold">TDS 30%: -₹{p.tdsDeduction.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-left md:text-right">
                  <span className="text-[0.65rem] font-mono text-muted-foreground uppercase block">Net Player Purse</span>
                  <strong className="font-display font-black text-2xl text-emerald-400">₹{p.netPayout.toLocaleString()} INR</strong>
                </div>

                {p.paid ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Disbursed
                  </span>
                ) : (
                  <Button
                    onClick={() => handleDisbursePayout(p.team, p.netPayout)}
                    className="rounded-xl font-bold text-xs h-10 px-5 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Disburse NEFT
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
