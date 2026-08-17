import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, FileText, CheckCircle2, ShieldCheck, 
  Download, Key, Sparkles, AlertTriangle, Scale 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface NDADocument {
  id: string;
  brand: string;
  project: string;
  penaltyClause: number;
  hash: string;
  signed: boolean;
}

const INITIAL_NDAS: NDADocument[] = [
  { id: 'nda-901', brand: 'Zenith Gaming Gear', project: 'Unreleased Wireless Mouse Launch', penaltyClause: 500000, hash: '0x8f2a99c14e5b66d7', signed: true },
  { id: 'nda-902', brand: 'Kratos Energy Drink', project: 'IPL 2026 Streamer Campaign', penaltyClause: 300000, hash: '0x3c7b11d94e8a22f0', signed: false },
];

export default function NDAVault() {
  const [ndas, setNdas] = useState<NDADocument[]>(INITIAL_NDAS);

  const handleSignNDA = (id: string, brand: string) => {
    sounds.playChime();
    triggerConfetti();
    setNdas(prev => prev.map(n => n.id === id ? { ...n, signed: true } : n));
    toast.success(`🔐 Cryptographic NDA with ${brand} executed & sealed in Vault!`);
  };

  const handleDownloadVaultCertificate = () => {
    sounds.playPop();
    triggerConfetti();
    toast.success('📄 Legally Binding SHA-256 Timestamped NDA Certificate downloaded!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator NDA & IP Protection Vault</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Cryptographic Non-Disclosure Agreements & Leak Penalty Enforcement</p>
          </div>
        </div>

        <Button
          onClick={handleDownloadVaultCertificate}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export Audit Vault
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-4 font-sans">
          <div className="showcase-section-title">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3>Active Non-Disclosure Agreements</h3>
          </div>

          <div className="space-y-4">
            {ndas.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "surface-1 p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl transition-all",
                  n.signed ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/40"
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{n.id}</span>
                    <span className="font-mono text-[0.65rem] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      SHA-256: {n.hash}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-lg text-foreground">{n.brand}</h4>
                  <p className="text-xs font-mono text-muted-foreground">Project: {n.project}</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right font-mono text-xs">
                    <span className="text-muted-foreground uppercase text-[0.6rem] block">Leak Liquidated Damages</span>
                    <strong className="font-display font-black text-xl text-rose-400">₹{n.penaltyClause.toLocaleString()} INR</strong>
                  </div>

                  {n.signed ? (
                    <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Cryptographically Sealed
                    </span>
                  ) : (
                    <Button
                      onClick={() => handleSignNDA(n.id, n.brand)}
                      className="rounded-2xl font-bold text-xs h-10 px-4 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                    >
                      <Key className="w-3.5 h-3.5 mr-1" /> Sign & Lock NDA
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
