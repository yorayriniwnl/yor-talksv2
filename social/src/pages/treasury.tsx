import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, IndianRupee, ShieldCheck, ArrowUpRight, 
  ArrowDownLeft, Sparkles, CheckCircle2, Flame, Users, Send 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface GrantProposal {
  id: string;
  title: string;
  requestedAmt: number;
  recipient: string;
  votesFor: number;
  votesAgainst: number;
  status: 'active' | 'approved' | 'executed';
}

export default function ClanTreasury() {
  const [inrBalance] = useState<number | null>(null);
  const [karmaPool] = useState<number | null>(null);
  const [proposals] = useState<GrantProposal[]>([]);

  const handleVote = (id: string, type: 'for' | 'against') => {
    void id;
    void type;
    toast.info('Treasury voting is not connected to a server ledger yet.');
  };

  const handleExecutePayout = (id: string, amt: number) => {
    void id;
    void amt;
    toast.info('Treasury payouts are not available. No money was transferred.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Guild Multi-Sig Treasury</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Treasury preview — balances, voting, and payouts are not connected yet</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Treasury unavailable
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Treasury Reserves Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-2 shadow-xl">
            <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-emerald-400" /> Liquid INR Guild Reserves
            </span>
            <div className="font-display font-black text-3xl text-emerald-400">
              {inrBalance === null ? '—' : `₹${inrBalance.toLocaleString('en-IN')} INR`}
            </div>
            <p className="text-[0.68rem] text-muted-foreground font-mono">A connected treasury ledger is required before balances or yields can be shown.</p>
          </div>

          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-2 shadow-xl">
            <span className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" /> Clan Karma Reserve Pool
            </span>
            <div className="font-display font-black text-3xl text-amber-400">
              {karmaPool === null ? '—' : `${karmaPool.toLocaleString()} XP`}
            </div>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Karma reserves will appear after a verified guild ledger is connected.</p>
          </div>
        </div>

        {/* Multi-Sig Grant Proposals */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-6 shadow-sm">
          <div className="showcase-section-title">
            <Users className="w-4 h-4 text-primary" />
            <h3>Active Multi-Sig Grant Deployments</h3>
          </div>

          <div className="space-y-4">
            {proposals.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/50 p-8 text-center">
                <p className="text-sm font-semibold text-foreground">No verified proposals are available.</p>
                <p className="mt-1 text-xs text-muted-foreground">Connect an audited treasury ledger before displaying proposals, votes, or payout actions.</p>
              </div>
            ) : proposals.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-2xl border border-border/40 space-y-3 bg-muted/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-display font-bold text-base text-foreground">{p.title}</h4>
                    <span className="text-xs font-mono text-muted-foreground">Recipient: {p.recipient}</span>
                  </div>

                  <div className="font-display font-black text-lg text-emerald-400">
                    ₹{p.requestedAmt.toLocaleString()} INR
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/20 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400">👍 {p.votesFor} For</span>
                    <span className="text-rose-400">👎 {p.votesAgainst} Against</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {p.status === 'active' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleVote(p.id, 'for')} disabled className="rounded-xl text-xs h-8">
                          Vote Yes
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleVote(p.id, 'against')} disabled className="rounded-xl text-xs h-8">
                          Vote No
                        </Button>
                      </>
                    )}
                    {p.status === 'approved' && (
                      <Button size="sm" onClick={() => handleExecutePayout(p.id, p.requestedAmt)} disabled className="rounded-xl font-bold text-xs h-8 bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary">
                        Payout unavailable
                      </Button>
                    )}
                    {p.status === 'executed' && (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Executed on Chain
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
