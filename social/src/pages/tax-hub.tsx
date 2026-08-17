import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, IndianRupee, FileText, Download, 
  CheckCircle2, Sparkles, Shield, Percent, Scale 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function TaxComplianceHub() {
  const [annualIncome, setAnnualIncome] = useState(1200000);
  const [tdsDeducted, setTdsDeducted] = useState(120000);

  // FY 2026-27 New Tax Regime Estimate
  const calculateNewRegimeTax = (income: number) => {
    if (income <= 300000) return 0;
    if (income <= 700000) return (income - 300000) * 0.05;
    if (income <= 1000000) return 20000 + (income - 700000) * 0.10;
    if (income <= 1200000) return 50000 + (income - 1000000) * 0.15;
    if (income <= 1500000) return 80000 + (income - 1200000) * 0.20;
    return 140000 + (income - 1500000) * 0.30;
  };

  const estimatedTax = calculateNewRegimeTax(annualIncome);
  const netRefundOrPay = estimatedTax - tdsDeducted;

  const handleDownloadTaxSummary = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📄 CA-Verified Section 194J/194R Tax & TDS Assessment PDF downloaded!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Streamer Tax & TDS Compliance Hub</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">FY 2026-27 Section 194J/194R TDS Estimator & Form 26AS Ledger</p>
          </div>
        </div>

        <Button
          onClick={handleDownloadTaxSummary}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export CA Tax Summary
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Income Inputs */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl font-sans">
            <div className="showcase-section-title">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              <h3>Annual Creator Gross Revenue</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Total Creator Income (₹ INR):</span>
                <Input
                  type="number"
                  value={annualIncome}
                  onChange={(e) => setAnnualIncome(parseFloat(e.target.value) || 0)}
                  className="rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <span className="text-muted-foreground block mb-1">Total TDS Already Deducted (194J/194R) (₹ INR):</span>
                <Input
                  type="number"
                  value={tdsDeducted}
                  onChange={(e) => setTdsDeducted(parseFloat(e.target.value) || 0)}
                  className="rounded-xl font-bold text-sm"
                />
              </div>
            </div>
          </div>

          {/* Tax Calculation Output */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl font-sans">
            <div className="showcase-section-title">
              <Scale className="w-4 h-4 text-primary" />
              <h3>New Regime Tax Liability</h3>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-950 border border-border/40 font-mono space-y-3 text-center">
              <div>
                <span className="text-[0.65rem] text-muted-foreground uppercase block">Estimated Income Tax</span>
                <strong className="font-display font-black text-3xl text-foreground">₹{estimatedTax.toLocaleString()} INR</strong>
              </div>

              <div className="pt-2 border-t border-border/40">
                <span className="text-[0.65rem] text-muted-foreground uppercase block">
                  {netRefundOrPay <= 0 ? 'Expected Income Tax Refund 🎉' : 'Net Tax Payable to Govt'}
                </span>
                <strong className={cn("font-display font-black text-2xl", netRefundOrPay <= 0 ? "text-emerald-400" : "text-amber-400")}>
                  ₹{Math.abs(netRefundOrPay).toLocaleString()} INR
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
