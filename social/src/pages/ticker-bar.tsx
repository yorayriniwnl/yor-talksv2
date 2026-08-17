import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tv, Sparkles, Copy, 
  Crown, Heart, IndianRupee, Trophy, Flame, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function TickerBarStudio() {
  const [tickerItems, setTickerItems] = useState([
    '🔥 LATEST SUBSCRIBER: Aaditya Sharma (Level 25)',
    '💰 TOP SUPERCHAT: ₹5,000 from ProSniper99 "Clutch god GG!"',
    '🏆 SCRIMS MVP: SOUL Akshat (14 Kills in Erangel)',
    '🎯 SUB GOAL: 840/1000 Subs (24h Stream Unlocking Soon!)'
  ]);

  const handleCopyOBSTicker = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/ticker-bar?speed=normal&theme=cyber&fps=60`);
    toast.success('📋 OBS Studio Transparent 60FPS Stream Marquee Ticker Bar URL copied!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-teal-500 to-emerald-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Broadcast Ticker Bar Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live Marquee Scrolling Feed, Superchat Badges & OBS Browser Source</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSTicker}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Ticker URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Live Ticker Preview */}
        <div className="surface-1 p-8 rounded-3xl border border-border/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> 60FPS BROADCAST MARQUEE OVERLAY
          </div>

          {/* Marquee Bar Container */}
          <div className="overflow-hidden bg-zinc-900/90 border-y-2 border-primary py-3 rounded-xl shadow-lg relative">
            <div className="flex items-center gap-12 whitespace-nowrap animate-marquee font-mono text-xs font-bold">
              {tickerItems.map((item, idx) => (
                <span key={idx} className="flex items-center gap-2 text-foreground">
                  <span className="text-primary">•</span>
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground font-mono">
            💡 Add this URL as a 1920x60 browser source in OBS Studio / Streamlabs to display real-time live tickers!
          </p>
        </div>
      </div>
    </div>
  );
}
