import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Scale, FileText, CheckCircle2, 
  IndianRupee, Lock, UserCheck, Sparkles, Download, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface DisputeCase {
  id: string;
  brand: string;
  creator: string;
  escrowAmount: number;
  status: 'In Review' | 'Arbitration Hearing' | 'Resolved & Released';
  milestone: string;
}

const DISPUTES: DisputeCase[] = [
  { id: 'disp-101', brand: 'Nexus Tech India', creator: '@vortex_sniper', escrowAmount: 75000, status: 'In Review', milestone: 'Reel Post Analytics Delivery' },
  { id: 'disp-102', brand: 'Hydra Energy Bharat', creator: '@mumbai_mavericks', escrowAmount: 120000, status: 'Arbitration Hearing', milestone: 'Tournament Jersey Placement' },
];

export default function DisputeHub() {
  const [cases, setCases] = useState<DisputeCase[]>(DISPUTES);

  const handleResolveCase = (id: string, brand: string) => {
    sounds.playChime();
    triggerConfetti();
    setCases(prev => prev.map(c => c.id === id ? { ...c, status: 'Resolved & Released' } : c));
    toast.success(`⚖️ Escrow dispute with ${brand} resolved! Funds released to creator wallet.`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator Brand Dispute & Escrow Arbitration</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Neutral Mediation, Evidence Locker & Legally Binding Settlements</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Lock className="w-3.5 h-3.5 text-emerald-400" /> Escrow Vault: SECURED
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <h3>Active Escrow Disputes</h3>
          </div>

          <div className="space-y-4">
            {cases.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "surface-1 p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl transition-all",
                  c.status === 'Resolved & Released' ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{c.id}</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full font-mono text-[0.65rem] font-bold",
                      c.status === 'Resolved & Released' ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      {c.status}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-lg text-foreground">{c.brand} ↔ {c.creator}</h4>
                  <p className="text-xs font-mono text-muted-foreground">Milestone: {c.milestone}</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right font-mono text-xs">
                    <span className="text-muted-foreground uppercase text-[0.6rem] block">Escrow Amount</span>
                    <strong className="font-display font-black text-xl text-emerald-400">₹{c.escrowAmount.toLocaleString()} INR</strong>
                  </div>

                  {c.status === 'Resolved & Released' ? (
                    <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Settlement Executed
                    </span>
                  ) : (
                    <Button
                      onClick={() => handleResolveCase(c.id, c.brand)}
                      className="rounded-2xl font-bold text-xs h-10 px-4 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" /> Arbitrate & Release
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
