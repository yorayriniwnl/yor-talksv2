import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, IndianRupee, Sparkles, CheckCircle2, 
  Send, ShieldCheck, Flame, Star, Award, Building2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface CampaignBrief {
  id: string;
  brand: string;
  budget: number;
  category: string;
  deliverable: string;
  deadline: string;
  status: 'open' | 'applied';
}

const CAMPAIGNS: CampaignBrief[] = [
  {
    id: 'cmp-1',
    brand: 'Red Bull Bharat ⚡',
    budget: 250000,
    category: 'Energy & Lifestyle',
    deliverable: '1x YouTube Dedicated Video + 2x Stream Shoutouts',
    deadline: 'In 5 Days',
    status: 'open'
  },
  {
    id: 'cmp-2',
    brand: 'OnePlus India Gaming 📱',
    budget: 180000,
    category: 'Hardware & Tech',
    deliverable: '1x 9:16 Reel + BGMI 120 FPS Benchmark Testing',
    deadline: 'In 3 Days',
    status: 'open'
  },
  {
    id: 'cmp-3',
    brand: 'Boat Rockerz Pro 🎧',
    budget: 95000,
    category: 'Audio & Peripherals',
    deliverable: '2x Twitch/YouTube Stream Spatial Audio Integrations',
    deadline: 'In 7 Days',
    status: 'open'
  }
];

export default function BrandDealsHub() {
  const [campaigns, setCampaigns] = useState<CampaignBrief[]>(CAMPAIGNS);

  const handleApply = (id: string, brandName: string) => {
    sounds.playChime();
    triggerConfetti();
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'applied' } : c));
    toast.success(`🎉 Sponsorship Proposal & Verified Media Kit pitched to ${brandName}!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator Brand Deal & Sponsorship Exchange</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Connect Directly with Brands for Verified Paid Sponsorships</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ₹5.25L Active Brand Escrow
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="space-y-4">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl hover:border-primary/40 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[0.65rem] font-mono font-bold">
                    {camp.category}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">Deadline: {camp.deadline}</span>
                </div>

                <h3 className="font-display font-black text-lg text-foreground">{camp.brand}</h3>
                <p className="text-xs font-sans text-muted-foreground">{camp.deliverable}</p>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-6 font-mono text-xs">
                <div className="text-right">
                  <span className="text-[0.65rem] text-muted-foreground uppercase block">Budget Pool</span>
                  <strong className="font-display font-black text-xl text-emerald-400">
                    ₹{camp.budget.toLocaleString()}
                  </strong>
                </div>

                {camp.status === 'applied' ? (
                  <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Pitch Submitted
                  </span>
                ) : (
                  <Button
                    onClick={() => handleApply(camp.id, camp.brand)}
                    className="rounded-2xl font-bold text-xs h-11 px-5 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Pitch
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
