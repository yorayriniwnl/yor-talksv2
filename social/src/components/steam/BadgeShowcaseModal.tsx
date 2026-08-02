import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Award, Star, CheckCircle, Flame, Trophy, Heart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

interface BadgeShowcaseModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOCIAL_BADGES = [
  { id: 'b1', title: 'Multiverse Pioneer', description: 'Joined during the initial launch phase', xp: 500, icon: Sparkles, color: 'from-purple-500 to-indigo-600', unlocked: true, date: 'Unlocked Aug 2026' },
  { id: 'b2', title: '100 Social Waves', description: 'Liked and reacted to 100 community posts', xp: 350, icon: Heart, color: 'from-rose-500 to-pink-600', unlocked: true, date: 'Unlocked Aug 2026' },
  { id: 'b3', title: 'Master Storyteller', description: 'Published 10 high-resolution stories', xp: 450, icon: Flame, color: 'from-amber-400 to-orange-500', unlocked: true, date: 'Unlocked Aug 2026' },
  { id: 'b4', title: 'Top Supporter', description: 'Awarded 5 Steam Profile Awards to creators', xp: 600, icon: Trophy, color: 'from-emerald-400 to-teal-600', unlocked: false, date: 'Locked (3/5 Progress)' },
  { id: 'b5', title: 'Community Architect', description: 'Joined 5 specialized topic circles', xp: 800, icon: Shield, color: 'from-cyan-400 to-blue-600', unlocked: false, date: 'Locked (2/5 Progress)' },
];

export function BadgeShowcaseModal({ isOpen, onOpenChange }: BadgeShowcaseModalProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const achievements = useAppStore((s) => s.achievements);

  const totalXP = 1850;
  const currentLevel = Math.floor(Math.sqrt(totalXP / 50)) + 1; // Lv. 6
  const nextLevelXP = Math.pow(currentLevel, 2) * 50; // 1800 -> 2450
  const progressPercent = Math.min(100, Math.round((totalXP / nextLevelXP) * 100));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] rounded-3xl font-sans">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Steam Profile Level & Badges
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Level Header Banner */}
          <div className="surface-1 rounded-2xl p-5 border border-border/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="level-badge text-sm px-3 py-1 shadow-md">
                  <Star className="w-4 h-4 fill-amber-400" /> Level {currentLevel}
                </div>
                <div>
                  <h4 className="font-bold text-sm leading-tight">{currentUser?.displayName}</h4>
                  <p className="text-[0.68rem] text-muted-foreground font-mono">Total Experience: {totalXP.toLocaleString()} XP</p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-primary">{progressPercent}% to Lv. {currentLevel + 1}</span>
            </div>

            {/* XP Progress Bar */}
            <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden relative z-10">
              <div className="bg-gradient-to-r from-primary via-purple-500 to-accent h-full rounded-full transition-all duration-700 glow-neon-primary" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Social Badges Grid */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase text-muted-foreground tracking-wider mb-3">
              Unlocked Social Badges ({SOCIAL_BADGES.filter(b => b.unlocked).length}/{SOCIAL_BADGES.length})
            </h4>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {SOCIAL_BADGES.map((badge) => {
                const Icon = badge.icon;

                return (
                  <div
                    key={badge.id}
                    className={cn(
                      "p-3.5 rounded-2xl border flex items-center justify-between transition-all",
                      badge.unlocked
                        ? "surface-1 border-border/50 hover:border-primary/40"
                        : "bg-muted/30 border-border/20 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={cn("w-11 h-11 rounded-2xl bg-gradient-to-tr flex items-center justify-center text-white shrink-0 shadow-md", badge.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-bold text-sm truncate flex items-center gap-1.5">
                          {badge.title}
                          {badge.unlocked && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                        </h5>
                        <p className="text-xs text-muted-foreground font-serif truncate">{badge.description}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-xs">
                      <span className="font-bold text-amber-400">+{badge.xp} XP</span>
                      <p className="text-[0.62rem] text-muted-foreground mt-0.5">{badge.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
