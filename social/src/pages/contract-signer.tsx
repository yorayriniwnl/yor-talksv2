import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSignature, IndianRupee, Send, CheckCircle2, 
  Sparkles, ShieldCheck, Download, Award, UserCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function ContractSigner() {
  const [playerName, setPlayerName] = useState('Aman "Vortex" Sharma');
  const [role, setRole] = useState('Entry Fragger / IGL');
  const [salary, setSalary] = useState(150000);
  const [prizeSplit, setPrizeSplit] = useState('80% Player / 20% Org');
  const [tenure, setTenure] = useState('12 Months (1 Year)');
  const [isSigned, setIsSigned] = useState(false);

  const handleSignAndDispatch = () => {
    sounds.playChime();
    triggerConfetti();
    setIsSigned(true);
    toast.success(`📜 Official Pro Contract dispatched to ${playerName}! (${prizeSplit}, ₹${salary.toLocaleString()}/mo)`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Contract Signer & Offer Terminal</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Formal Pro Roster Agreement, Prize Splits & Digital Stylus Seal</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Legal Template: VERIFIED
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Contract Terms Customizer */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl font-sans">
            <div className="showcase-section-title">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <h3>Player & Offer Parameters</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Player Legal Name / Gamertag:</span>
                <Input
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Roster Role:</span>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Monthly Base Retainer (₹ INR):</span>
                <Input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(parseFloat(e.target.value) || 0)}
                  className="rounded-xl font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <span className="text-muted-foreground block mb-1">Prize Pool Split:</span>
                  <select
                    value={prizeSplit}
                    onChange={(e) => setPrizeSplit(e.target.value)}
                    className="w-full h-10 rounded-xl bg-background border border-border/60 px-3 font-mono text-xs"
                  >
                    <option>80% Player / 20% Org</option>
                    <option>70% Player / 30% Org</option>
                    <option>90% Player / 10% Org</option>
                  </select>
                </div>

                <div>
                  <span className="text-muted-foreground block mb-1">Contract Tenure:</span>
                  <select
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    className="w-full h-10 rounded-xl bg-background border border-border/60 px-3 font-mono text-xs"
                  >
                    <option>6 Months Season</option>
                    <option>12 Months (1 Year)</option>
                    <option>24 Months (2 Years)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Legal Contract Preview Document */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl font-sans">
            <div className="showcase-section-title">
              <FileSignature className="w-4 h-4 text-primary" />
              <h3>Official Roster Agreement</h3>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-border/40 font-mono text-xs space-y-3">
              <div className="text-center border-b border-border/40 pb-2">
                <span className="font-display font-black text-sm text-foreground uppercase block">BHARAT ESPORTS FEDERATION</span>
                <span className="text-[0.65rem] text-muted-foreground">STANDARD PRO ATHLETE CONTRACT</span>
              </div>

              <p className="text-zinc-300">
                This agreement binds <strong>{playerName}</strong> as official <strong>{role}</strong> under a monthly retainer of <strong className="text-emerald-400">₹{salary.toLocaleString()} INR</strong>.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[0.68rem] text-zinc-400">
                <span>• Prize Split: {prizeSplit}</span>
                <span>• Duration: {tenure}</span>
                <span>• Bootcamp: Bengaluru HQ</span>
                <span>• Health: Full Ergonomics Cover</span>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-[0.65rem] text-muted-foreground">STATUS: {isSigned ? 'SIGNED & DISPATCHED' : 'AWAITING DISPATCH'}</span>
                {isSigned ? (
                  <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Legally Bound
                  </span>
                ) : (
                  <Button
                    onClick={handleSignAndDispatch}
                    className="rounded-xl font-bold text-xs h-9 px-4 bg-primary text-primary-foreground glow-neon-primary"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" /> Seal & Dispatch Offer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
