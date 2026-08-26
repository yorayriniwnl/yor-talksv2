import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, Sparkles, CheckCircle2, IndianRupee, 
  Flame, Heart, Gift, Star, ShieldCheck, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface FanTier {
  id: string;
  name: string;
  price: number;
  badge: string;
  color: string;
  perks: string[];
  popular?: boolean;
}

const FAN_TIERS: FanTier[] = [
  {
    id: 't1',
    name: 'Desi Chai Club ☕',
    price: 49,
    badge: '☕',
    color: 'from-amber-500 to-orange-500',
    perks: [
      'Custom Loyalist Badge beside your username',
      'Access to Members-Only VIP Live Chat',
      'Exclusive Discord Role & Private Channels',
      '5 Custom Desi Streamer Emotes'
    ]
  },
  {
    id: 't2',
    name: 'Squad Elite Warrior ⚡',
    price: 199,
    badge: '⚡',
    color: 'from-cyan-500 to-blue-600',
    popular: true,
    perks: [
      'Everything in Desi Chai Club',
      'Monthly 1v1 Custom BGMI / Valorant Scrim with Creator',
      'Early Access to YouTube & Yor Reels VODs',
      'Vote on Creator Content & Game Choices',
      'Special Gold Superchat Audio Ping'
    ]
  },
  {
    id: 't3',
    name: 'Maha Maharaja VIP 👑',
    price: 999,
    badge: '👑',
    color: 'from-purple-500 to-pink-600',
    perks: [
      'Everything in Squad Elite Warrior',
      'Official Clan Jersey & Physical Merch Kit Shipped to Door',
      '1-on-1 Monthly Video Call Mentorship / Strategy Session',
      'Permanent Hall of Fame Plaque on Creator Profile',
      'Custom Live Stream Shoutout on Every Broadcast'
    ]
  }
];

export default function FanClubSubscriptions() {
  const handleSubscribe = () => {
    toast.info('Subscriptions are not available yet. No payment or autopay mandate was created.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator Fan Club & VIP Subscriptions</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Fan club preview — payment subscriptions are not available yet</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Subscriptions unavailable
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {FAN_TIERS.map((tier) => {
            return (
              <div
                key={tier.id}
                className={cn(
                  "surface-1 rounded-3xl p-6 sm:p-7 border flex flex-col justify-between shadow-xl relative transition-all",
                  tier.popular ? "border-primary ring-2 ring-primary/30" : "border-border/40",
                  "border-border/40"
                )}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[0.65rem] font-mono font-bold bg-primary text-primary-foreground uppercase shadow-md">
                    MOST POPULAR SQUAD
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-tr text-2xl flex items-center justify-center shadow-md", tier.color)}>
                      {tier.badge}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-muted-foreground">Monthly Pass</span>
                      <div className="font-display font-black text-2xl text-foreground">
                        ₹{tier.price} <span className="text-xs font-normal text-muted-foreground">/mo</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-display font-bold text-lg text-foreground">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Cancel or switch tiers anytime</p>
                  </div>

                  <ul className="space-y-2.5 pt-4 border-t border-border/30 text-xs text-foreground/90">
                    {tier.perks.map((perk, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6">
                  <Button
                    onClick={() => handleSubscribe()}
                    disabled
                    className={cn(
                      "w-full rounded-2xl font-bold text-xs h-11 shadow-lg transition-all",
                      tier.popular
                        ? "bg-primary text-primary-foreground glow-neon-primary"
                        : "bg-muted/40 hover:bg-muted text-foreground"
                    )}
                  >
                    Subscriptions unavailable
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
