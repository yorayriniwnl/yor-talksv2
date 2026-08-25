import { AlertTriangle, BarChart3, Clock, ShieldCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreatorAnalytics() {
  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-600 text-black flex items-center justify-center font-bold shadow-md">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Creator Telemetry & Payouts</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Beta feature status</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-400" />
          <h2 className="text-2xl font-bold font-display">Creator payouts are disabled for the college beta</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Payment processing, UPI settlement and production analytics are not
            connected yet. This page will remain unavailable until transactions
            are verified server-side and an analytics provider is configured.
          </p>
          <Button disabled className="rounded-2xl font-bold text-xs">
            <Wallet className="w-4 h-4 mr-1.5" /> Payouts unavailable
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-2">
            <ShieldCheck className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-bold text-sm">Verified payments</h3>
            <p className="text-xs text-muted-foreground">Not configured</p>
          </div>
          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-2">
            <BarChart3 className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-bold text-sm">Live analytics</h3>
            <p className="text-xs text-muted-foreground">Not connected</p>
          </div>
          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-bold text-sm">Expected availability</h3>
            <p className="text-xs text-muted-foreground">After beta validation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
