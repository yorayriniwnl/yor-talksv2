import { useEffect, useState } from 'react';
import { CheckCircle, Shield, Sparkles, Star, TrendingUp, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { computeLevel } from '@/lib/achievement-progress';
import { cn } from '@/lib/utils';

const ICONS = { Sparkles, TrendingUp, Users };

export function BadgeShowcaseModal({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) {
  const currentUser = useAppStore((state) => state.currentUser);
  const achievements = useAppStore((state) => state.achievements);
  const loadAchievements = useAppStore((state) => state.loadAchievements);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const level = computeLevel(achievements);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError('');
    void loadAchievements().catch(() => { if (active) setError('Achievements could not load. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isOpen, loadAchievements, attempt]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] rounded-3xl font-sans">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Your Yor achievements</DialogTitle>
          <DialogDescription>Progress earned through your posts, followers, and communities.</DialogDescription>
        </DialogHeader>
        {error ? <div role="alert" className="space-y-3"><p>{error}</p><Button onClick={() => setAttempt((value) => value + 1)}>Retry achievements</Button></div> : (
          <div className="space-y-5" aria-busy={loading}>
            <section className="rounded-2xl bg-muted/40 p-5">
              <p className="font-semibold">{currentUser?.displayName} · Level {level.level}</p>
              <p className="mt-1 text-sm text-muted-foreground">{level.totalXp.toLocaleString()} XP earned</p>
              <div role="progressbar" aria-label="Level progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level.progress)} className="my-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${level.progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{level.nextLevelXp - level.totalXp} XP to level {level.level + 1}</p>
            </section>
            {loading && achievements.length === 0 && <p role="status">Loading your achievements…</p>}
            <div className="max-h-[300px] space-y-3 overflow-y-auto">
              {achievements.map((badge) => {
                const Icon = ICONS[badge.icon as keyof typeof ICONS] ?? Star;
                return <article key={badge.id} className={cn('flex items-start gap-3 rounded-2xl border p-4', badge.unlocked ? 'border-primary/30' : 'border-border')}>
                  <Icon className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1"><h3 className="font-semibold">{badge.title} {badge.unlocked && <CheckCircle aria-label="Unlocked" className="inline h-4 w-4 text-primary" />}</h3><p className="mt-1 text-sm text-muted-foreground">{badge.description}</p><p className="mt-2 text-xs text-muted-foreground">{badge.progress}/{badge.goal} · {badge.xp} XP {badge.unlocked ? 'earned' : 'available'}</p></div>
                </article>;
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
