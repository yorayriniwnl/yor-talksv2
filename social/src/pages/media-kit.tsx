import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Download, Share2, Sparkles, Trophy, 
  IndianRupee, Users, TrendingUp, CheckCircle2, ShieldCheck, Mail 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function MediaKit() {
  const currentUser = useAppStore((s) => s.currentUser);

  const handleDownloadDeck = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('Official Creator Sponsorship Media Kit (PDF) generated & downloaded!');
  };

  const handleShareLink = () => {
    sounds.playPop();
    navigator.clipboard.writeText(`https://yortalks.in/mediakit/${currentUser?.username || 'ayush'}`);
    toast.success('Public Sponsorship Deck link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator Media Kit & Rate Card</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Official Brand Sponsorship & Partnership Deck</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleShareLink}
            variant="outline"
            className="rounded-2xl font-bold text-xs"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" /> Copy Deck Link
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadDeck}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export PDF
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Creator Hero Header Card */}
        <div className="surface-1 rounded-3xl p-6 sm:p-8 border border-border/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar className="w-20 h-20 border-2 border-primary glow-neon-primary shadow-xl">
              <AvatarImage src={currentUser?.avatarUrl} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[0.62rem] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Verified Tier-1 Creator
                </span>
                <span className="text-xs font-mono text-muted-foreground">ID: YOR-PRO-2026</span>
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground">
                {currentUser?.displayName || 'Ayush Roy'}
              </h2>
              <p className="text-xs text-muted-foreground font-serif mt-0.5">
                Esports Athlete, WebGL Developer & Tech Content Creator · Bengaluru, India
              </p>
            </div>
          </div>

          <div className="text-right sm:border-l sm:border-border/30 sm:pl-6">
            <span className="text-[0.62rem] font-mono uppercase text-muted-foreground block">Verified Monthly Reach</span>
            <strong className="font-display font-black text-3xl text-primary">3.8M+</strong>
            <span className="text-[0.68rem] font-mono text-emerald-400 block font-bold">94% Indian Gen-Z Audience</span>
          </div>
        </div>

        {/* Verified Performance Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-1">
            <span className="text-[0.62rem] font-mono text-muted-foreground uppercase">Average Live Concurrents</span>
            <div className="font-display font-black text-2xl text-foreground">4,200 CCV</div>
            <span className="text-[0.68rem] text-muted-foreground font-mono">During BGMI / Valorant Watch Parties</span>
          </div>

          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-1">
            <span className="text-[0.62rem] font-mono text-muted-foreground uppercase">Reels & Video Views</span>
            <div className="font-display font-black text-2xl text-amber-400">840,000 / mo</div>
            <span className="text-[0.68rem] text-muted-foreground font-mono">Average 82% 30-second completion rate</span>
          </div>

          <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-1">
            <span className="text-[0.62rem] font-mono text-muted-foreground uppercase">Engagement Rate</span>
            <div className="font-display font-black text-2xl text-emerald-400">9.4% ER</div>
            <span className="text-[0.68rem] text-muted-foreground font-mono">3.2x higher than industry average</span>
          </div>
        </div>

        {/* Brand Sponsorship Rate Card */}
        <div className="surface-1 p-6 sm:p-8 rounded-3xl border border-border/40 shadow-sm space-y-6">
          <div className="showcase-section-title">
            <IndianRupee className="w-4 h-4 text-emerald-400" />
            <h3>Standard Sponsorship Rate Card (₹ INR)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/30 space-y-3">
              <div>
                <h4 className="font-display font-bold text-base text-foreground">Integrated Video Shoutout</h4>
                <p className="text-xs text-muted-foreground font-serif">60-second dedicated mid-roll mention + bio link placement</p>
              </div>
              <div className="font-display font-black text-2xl text-emerald-400">₹45,000</div>
            </div>

            <div className="p-5 rounded-2xl bg-primary/10 border border-primary/30 space-y-3">
              <div>
                <h4 className="font-display font-bold text-base text-foreground">Live Stream Title Sponsor</h4>
                <p className="text-xs text-muted-foreground font-serif">On-screen overlay banner, chatbot commands & live product demo</p>
              </div>
              <div className="font-display font-black text-2xl text-primary">₹75,000</div>
            </div>

            <div className="p-5 rounded-2xl bg-muted/30 border border-border/30 space-y-3">
              <div>
                <h4 className="font-display font-bold text-base text-foreground">Tournament Title Partnership</h4>
                <p className="text-xs text-muted-foreground font-serif">Full naming rights for monthly community invitational tournament</p>
              </div>
              <div className="font-display font-black text-2xl text-amber-400">₹1,50,000</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
