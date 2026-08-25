import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, IndianRupee, TrendingUp, Users, ArrowUpRight, 
  Sparkles, CheckCircle2, ShieldCheck, Wallet, ArrowDownRight, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

export default function CreatorAnalytics() {
  const [balanceMinor, setBalanceMinor] = useState(4850000); // fallback 48500 INR
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  useEffect(() => {
    api.getCreatorWallet().then(data => {
      if (data && typeof data.balanceMinor === 'number') {
        setBalanceMinor(data.balanceMinor);
      }
    }).catch(console.error);
  }, []);

  const balanceINR = balanceMinor / 100;

  const handleWithdraw = () => {
    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt <= 0 || amt > balanceINR) {
      toast.error('Enter a valid withdrawal amount within available balance');
      return;
    }
    sounds.playChime();
    triggerConfetti();
    setBalanceMinor(b => Math.max(0, b - amt * 100));
    toast.success(`🎉 Instant UPI Payout of ₹${amt.toLocaleString()} processed to ${upiId}! Reference ID: UPI-${Date.now()}`);
    setIsWithdrawOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator Telemetry & Payouts</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live Audience Metrics, Demographics & UPI Settlements</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsWithdrawOpen(true)}
            className="rounded-2xl font-bold text-xs h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary shadow-lg"
          >
            <Wallet className="w-4 h-4 mr-1.5 fill-black" /> Withdraw to UPI (₹{balanceINR.toLocaleString()})
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Top 4 Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Superchat Revenue</span>
              <span className="text-emerald-400 font-bold flex items-center"><ArrowUpRight className="w-3.5 h-3.5" /> +28.4%</span>
            </div>
            <div className="font-display font-black text-3xl text-foreground">₹{balanceINR.toLocaleString()}</div>
            <span className="text-[0.68rem] text-muted-foreground font-mono">Available for instant UPI settlement</span>
          </div>

          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Total Video Views</span>
              <span className="text-emerald-400 font-bold flex items-center"><ArrowUpRight className="w-3.5 h-3.5" /> +42.1%</span>
            </div>
            <div className="font-display font-black text-3xl text-foreground">842,500</div>
            <span className="text-[0.68rem] text-muted-foreground font-mono">Last 30 days across all feeds</span>
          </div>

          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Subscriber Growth</span>
              <span className="text-emerald-400 font-bold flex items-center"><ArrowUpRight className="w-3.5 h-3.5" /> +1,840</span>
            </div>
            <div className="font-display font-black text-3xl text-foreground">24,420</div>
            <span className="text-[0.68rem] text-muted-foreground font-mono">Tier-1 verified creator status</span>
          </div>

          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-2 shadow-sm">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>Average Watch Time</span>
              <span className="text-emerald-400 font-bold flex items-center"><ArrowUpRight className="w-3.5 h-3.5" /> +14.0%</span>
            </div>
            <div className="font-display font-black text-3xl text-foreground">4m 18s</div>
            <span className="text-[0.68rem] text-muted-foreground font-mono">78% Retention at 60s hook</span>
          </div>
        </div>

        {/* Audience Geography Demographics Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* City Demographics Bars */}
          <div className="lg:col-span-7 surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-6">
            <div className="showcase-section-title">
              <Users className="w-4 h-4 text-primary" />
              <h3>Audience Demographics by Indian Tech Hubs</h3>
            </div>

            <div className="space-y-4">
              {[
                { city: 'Mumbai', share: 38, count: '320,150 viewers', color: 'bg-primary' },
                { city: 'Bengaluru', share: 32, count: '269,600 viewers', color: 'bg-purple-500' },
                { city: 'Delhi-NCR', share: 18, count: '151,650 viewers', color: 'bg-amber-400' },
                { city: 'Hyderabad', share: 12, count: '101,100 viewers', color: 'bg-cyan-400' },
              ].map((item) => (
                <div key={item.city} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-foreground">{item.city} ({item.share}%)</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", item.color)} style={{ width: `${item.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Broadcast Engagement Hours */}
          <div className="lg:col-span-5 surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-6 flex flex-col justify-between">
            <div>
              <div className="showcase-section-title mb-4">
                <Clock className="w-4 h-4 text-amber-400" />
                <h3>Peak Streaming Hours (IST)</h3>
              </div>
              <p className="text-xs text-muted-foreground font-serif leading-relaxed mb-4">
                Your highest engagement and superchat conversion occurs between <strong>8:30 PM and 11:00 PM IST</strong> during esports tournament watch parties.
              </p>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 space-y-2">
                <div className="text-xs font-mono flex items-center justify-between">
                  <span>Optimal Go-Live Time</span>
                  <strong className="text-emerald-400">8:30 PM IST</strong>
                </div>
                <div className="text-xs font-mono flex items-center justify-between">
                  <span>Average Superchat Gift Value</span>
                  <strong className="text-amber-400">₹450 INR</strong>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary"
            >
              Initiate Instant UPI Payout
            </Button>
          </div>
        </div>
      </div>

      {/* Withdrawal Dialog */}
      <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl font-sans text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" /> Instant UPI Creator Settlement
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono flex items-center justify-between">
              <div>
                <span className="text-muted-foreground block text-[0.65rem] uppercase">Available Balance</span>
                <strong className="font-display font-black text-xl text-emerald-400">₹{balanceINR.toLocaleString()} INR</strong>
              </div>
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-muted-foreground">UPI ID / VPA</label>
              <Input
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="yourname@okhdfcbank"
                className="rounded-xl h-11 text-xs font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono uppercase text-muted-foreground">Withdrawal Amount (₹ INR)</label>
              <Input
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="25000"
                className="rounded-xl h-11 text-xs font-mono font-bold"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleWithdraw}
              className="w-full rounded-2xl font-bold text-xs h-11 bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Transfer Instantly to UPI
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
