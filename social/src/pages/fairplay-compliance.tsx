import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Award, HeartHandshake, CheckCircle2, 
  FileCheck, Shield, Sparkles, AlertCircle, Download 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ComplianceItem {
  id: string;
  category: string;
  standard: string;
  status: 'Verified Clear' | 'Integrity Passed';
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { id: 'c-1', category: 'NADA / WADA Stimulant Screening', standard: 'Zero Banned Nootropics or Unprescribed Amphetamines', status: 'Verified Clear' },
  { id: 'c-2', category: 'Biometric LAN KYC Identity', standard: 'Aadhaar / Passport Esports Athlete Verification', status: 'Integrity Passed' },
  { id: 'c-3', category: 'Sub-Tick Input Telemetry', standard: 'Hardware USB Polling Integrity & Macro-Free Audit', status: 'Verified Clear' },
  { id: 'c-4', category: 'Esports Code of Conduct', standard: 'Anti-Toxicity, Fair Sportsmanship & Match-Fixing Ban', status: 'Integrity Passed' },
];

export default function FairPlayCompliance() {
  const [issued, setIssued] = useState(false);

  const handleIssueCertificate = () => {
    sounds.playChime();
    triggerConfetti();
    setIssued(true);
    toast.success('🏅 Official Bharat Esports Clean Athlete & Fair Play Integrity Certificate Issued!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Anti-Doping & Fair Play Hub</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">WADA / NADA Integrity Standards, Biometric Athlete KYC & USB Audits</p>
          </div>
        </div>

        <Button
          onClick={handleIssueCertificate}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Award className="w-3.5 h-3.5 mr-1" /> Issue Clean Athlete Pass
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {COMPLIANCE_ITEMS.map((item) => (
            <div
              key={item.id}
              className="surface-1 p-6 rounded-3xl border border-border/40 flex items-center justify-between shadow-xl"
            >
              <div className="space-y-1">
                <span className="text-[0.65rem] font-mono text-muted-foreground uppercase">{item.category}</span>
                <h4 className="font-display font-bold text-base text-foreground">{item.standard}</h4>
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
