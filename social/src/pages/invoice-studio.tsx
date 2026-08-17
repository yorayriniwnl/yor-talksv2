import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, IndianRupee, Download, CheckCircle2, 
  Sparkles, Building2, ShieldCheck, Printer, Flame 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function InvoiceStudio() {
  const [clientName, setClientName] = useState('KRAFTON INDIA ESPORTS PVT LTD');
  const [campaignTitle, setCampaignTitle] = useState('BGMI Grand Finals Broadcast Sponsorship Integration');
  const [baseAmount, setBaseAmount] = useState(150000);
  const [isPaid, setIsPaid] = useState(false);

  const gstRate = 0.18;
  const gstAmount = baseAmount * gstRate;
  const totalAmount = baseAmount + gstAmount;

  const handleDownloadInvoice = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🧾 Formal GST Tax Invoice generated and downloaded in PDF format!');
  };

  const handleMarkPaid = () => {
    sounds.playChime();
    triggerConfetti();
    setIsPaid(true);
    toast.success(`🎉 Invoice marked as SETTLED via Instant UPI / NEFT!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator Tax Invoice & GST Billing Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">SAC 998311 Compliant Brand Sponsorship Invoices</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleDownloadInvoice}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Download Invoice PDF
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Invoice Visual Sheet Preview Column */}
          <div className="lg:col-span-7">
            <div className="surface-1 rounded-3xl p-8 border border-border/40 shadow-2xl space-y-6 bg-zinc-950 font-sans">
              <div className="flex items-center justify-between border-b border-border/40 pb-5">
                <div>
                  <h3 className="font-display font-black text-xl text-primary uppercase">TAX INVOICE</h3>
                  <span className="text-[0.65rem] font-mono text-muted-foreground">GSTIN: 29AAACH7409R1ZZ &middot; SAC: 998311</span>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-muted-foreground block text-[0.6rem] uppercase">Invoice Number</span>
                  <strong className="text-foreground">YOR-INV-2026-088</strong>
                </div>
              </div>

              {/* Billed To */}
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-muted-foreground text-[0.6rem] uppercase block mb-1">Billed To (Client):</span>
                  <strong className="text-foreground block">{clientName}</strong>
                  <span className="text-muted-foreground text-[0.65rem]">GSTIN: 27AABCK8901L1Z4</span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[0.6rem] uppercase block mb-1">Invoice Date:</span>
                  <strong className="text-foreground block">{new Date().toLocaleDateString('en-IN')}</strong>
                  <span className="text-muted-foreground text-[0.65rem]">Due: On Receipt</span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-2xl border border-border/40 overflow-hidden font-mono text-xs">
                <div className="p-3 bg-muted/40 font-bold flex justify-between">
                  <span>Description</span>
                  <span>Amount (INR)</span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>{campaignTitle}</span>
                    <strong>₹{baseAmount.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[0.68rem]">
                    <span>Central GST (CGST @ 9%)</span>
                    <span>₹{(gstAmount / 2).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[0.68rem]">
                    <span>State GST (SGST @ 9%)</span>
                    <span>₹{(gstAmount / 2).toLocaleString()}</span>
                  </div>
                </div>
                <div className="p-4 bg-muted/20 border-t border-border/30 flex justify-between font-display font-black text-base text-emerald-400">
                  <span>Total Amount Due:</span>
                  <span>₹{totalAmount.toLocaleString()} INR</span>
                </div>
              </div>

              {/* Settlement Status Banner */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">Instant UPI Payment VPA: creator@upi</span>
                {isPaid ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> PAID VIA UPI
                  </span>
                ) : (
                  <Button size="sm" onClick={handleMarkPaid} className="rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-600 text-black">
                    Mark Settled (UPI)
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Invoice Builder Form Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <Building2 className="w-4 h-4 text-primary" />
                <h3>Client & Campaign Details</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-mono uppercase text-muted-foreground">Brand Client Name</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value.toUpperCase())} className="rounded-xl font-bold text-xs uppercase" />
                </div>
                <div>
                  <Label className="text-xs font-mono uppercase text-muted-foreground">Campaign Deliverable</Label>
                  <Input value={campaignTitle} onChange={(e) => setCampaignTitle(e.target.value)} className="rounded-xl text-xs" />
                </div>
              </div>
            </div>

            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <h3>Sponsorship Fee & GST</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-muted-foreground">Base Fee</span>
                    <strong className="text-foreground">₹{baseAmount.toLocaleString()}</strong>
                  </div>
                  <input
                    type="range"
                    min="25000"
                    max="500000"
                    step="5000"
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-muted/40 font-mono text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>18% GST Added:</span>
                    <span className="text-foreground font-bold">₹{gstAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-400">
                    <span>Grand Total:</span>
                    <span>₹{totalAmount.toLocaleString()} INR</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
