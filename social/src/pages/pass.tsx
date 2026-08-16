import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Crown, Shield, Star, Lock, CheckCircle2, 
  Flame, Award, Gift, ArrowRight, Zap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface PassTier {
  tier: number;
  freeReward: { title: string; icon: string; type: string };
  premiumReward: { title: string; icon: string; type: string; isMythic?: boolean };
  claimed: boolean;
  unlocked: boolean;
}

const PASS_TIERS: PassTier[] = [
  { tier: 1, freeReward: { title: '100 Karma Points', icon: '💎', type: 'Points' }, premiumReward: { title: 'Neon Saffron Avatar Border', icon: '🖼️', type: 'Cosmetic', isMythic: true }, claimed: true, unlocked: true },
  { tier: 2, freeReward: { title: 'Chai Break Soundboard Pad', icon: '☕', type: 'Audio' }, premiumReward: { title: 'Cyberpunk Mumbai Profile Wallpaper', icon: '🌌', type: 'Theme' }, claimed: true, unlocked: true },
  { tier: 3, freeReward: { title: '200 Karma Points', icon: '💎', type: 'Points' }, premiumReward: { title: 'Lord Shiva Trishul Holo Badge', icon: '🔱', type: 'Badge', isMythic: true }, claimed: false, unlocked: true },
  { tier: 4, freeReward: { title: 'Bronze Creator Crest', icon: '🛡️', type: 'Badge' }, premiumReward: { title: 'BGMI Glacier M416 Sticker Pack', icon: '🔫', type: 'Gear' }, claimed: false, unlocked: true },
  { tier: 5, freeReward: { title: '300 Karma Points', icon: '💎', type: 'Points' }, premiumReward: { title: 'Mythic Golden Peacock Hologram Frame', icon: '🦚', type: 'Cosmetic', isMythic: true }, claimed: false, unlocked: false },
  { tier: 6, freeReward: { title: 'Sitar Melody Riff Pack', icon: '🪕', type: 'Audio' }, premiumReward: { title: 'Supernova Fire Animated Background', icon: '🔥', type: 'Theme' }, claimed: false, unlocked: false },
  { tier: 7, freeReward: { title: '500 Karma Points', icon: '💎', type: 'Points' }, premiumReward: { title: 'Apex Predator Verified Bharat Badge', icon: '👑', type: 'Badge', isMythic: true }, claimed: false, unlocked: false },
];

export default function SuperPass() {
  const [currentTier, setCurrentTier] = useState(4);
  const [tiers, setTiers] = useState<PassTier[]>(PASS_TIERS);
  const [hasElitePass, setHasElitePass] = useState(true);

  const handleClaim = (tierNum: number) => {
    sounds.playChime();
    triggerConfetti();
    setTiers(prev => prev.map(t => {
      if (t.tier === tierNum) return { ...t, claimed: true };
      return t;
    }));
    toast.success(`🎉 Claimed Tier ${tierNum} Rewards! Added to your Creator Vault.`);
  };

  const handleBuyPass = () => {
    sounds.playChime();
    triggerConfetti();
    setHasElitePass(true);
    toast.success('👑 Elite Bharat Super Pass Activated! All 100 Mythic Tiers Unlocked.');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Super Pass (Season 1)</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">100 Tiers of Mythic Rewards, Frames & Karma XP</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!hasElitePass ? (
            <Button
              onClick={handleBuyPass}
              className="rounded-2xl font-bold text-xs h-10 px-6 bg-gradient-to-r from-amber-400 to-orange-500 text-black glow-neon-primary shadow-lg"
            >
              <Crown className="w-4 h-4 mr-1.5 fill-black" /> Unlock Elite Pass (₹299 INR)
            </Button>
          ) : (
            <div className="level-badge shadow-sm">
              <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Elite Pass Active
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Pass Hero Progress Bar */}
        <div className="surface-1 rounded-3xl p-6 sm:p-8 border border-border/40 relative overflow-hidden shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono uppercase text-primary font-bold">Season 1: Bharat Digital Renaissance</span>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-foreground">Pass Level {currentTier} / 100</h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">380 / 500 XP to Tier {currentTier + 1}</p>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-center">
                <span className="text-muted-foreground block text-[0.62rem]">Ends In</span>
                <span className="font-bold text-amber-400">42 Days</span>
              </div>
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-center">
                <span className="text-muted-foreground block text-[0.62rem]">Tiers Claimed</span>
                <span className="font-bold text-emerald-400">{tiers.filter(t => t.claimed).length} / {tiers.length}</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted/60 h-3 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 h-full rounded-full transition-all duration-700 glow-neon-primary" style={{ width: `${(currentTier / 7) * 100}%` }} />
          </div>
        </div>

        {/* Tiers Progression Track */}
        <div className="space-y-4">
          <div className="showcase-section-title">
            <Gift className="w-4 h-4 text-amber-400" />
            <h3>Season 1 Rewards Track (Free vs Elite)</h3>
          </div>

          <div className="space-y-3">
            {tiers.map((tier) => {
              const isUnlocked = tier.tier <= currentTier;

              return (
                <div
                  key={tier.tier}
                  className={cn(
                    "surface-1 rounded-3xl p-5 border transition-all duration-300 grid grid-cols-1 md:grid-cols-12 gap-4 items-center shadow-sm",
                    isUnlocked ? "border-border/60 hover:border-primary/40" : "opacity-60 border-border/20"
                  )}
                >
                  {/* Tier Number Badge */}
                  <div className="md:col-span-2 flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-display font-black text-base shadow",
                      isUnlocked ? "bg-primary text-primary-foreground glow-neon-primary" : "bg-muted text-muted-foreground"
                    )}>
                      T{tier.tier}
                    </div>
                    <div>
                      <span className="text-xs font-mono font-bold text-foreground block">Tier {tier.tier}</span>
                      <span className="text-[0.65rem] font-mono text-muted-foreground">{isUnlocked ? 'Unlocked' : 'Locked'}</span>
                    </div>
                  </div>

                  {/* Free Track Reward */}
                  <div className="md:col-span-4 p-3 rounded-2xl bg-muted/30 border border-border/30 flex items-center gap-3">
                    <span className="text-2xl">{tier.freeReward.icon}</span>
                    <div className="min-w-0">
                      <span className="text-[0.62rem] font-mono uppercase text-muted-foreground font-bold">Free Track</span>
                      <h5 className="font-bold text-xs text-foreground truncate">{tier.freeReward.title}</h5>
                    </div>
                  </div>

                  {/* Elite Premium Track Reward */}
                  <div className={cn(
                    "md:col-span-4 p-3 rounded-2xl border flex items-center gap-3 relative overflow-hidden",
                    tier.premiumReward.isMythic ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/40" : "bg-muted/30 border-border/30"
                  )}>
                    <span className="text-2xl">{tier.premiumReward.icon}</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[0.62rem] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5 fill-amber-400" /> Elite Track
                      </span>
                      <h5 className="font-bold text-xs text-white truncate">{tier.premiumReward.title}</h5>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="md:col-span-2 flex justify-end">
                    {tier.claimed ? (
                      <Button disabled className="w-full md:w-auto rounded-xl font-bold text-xs h-9 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Claimed
                      </Button>
                    ) : isUnlocked ? (
                      <Button
                        onClick={() => handleClaim(tier.tier)}
                        className="w-full md:w-auto rounded-xl font-bold text-xs h-9 bg-amber-500 hover:bg-amber-600 text-black glow-neon-primary"
                      >
                        Claim All
                      </Button>
                    ) : (
                      <Button variant="outline" disabled className="w-full md:w-auto rounded-xl font-bold text-xs h-9 border-border/40">
                        <Lock className="w-3.5 h-3.5 mr-1" /> Locked
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
