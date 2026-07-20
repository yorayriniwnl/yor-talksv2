import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Sparkles, TrendingUp, Users, Flame, BookOpen, Trophy, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ICONS: Record<string, any> = { Sparkles, TrendingUp, Users, Flame, BookOpen };

export default function Achievements() {
  const achievements = useAppStore((s) => s.achievements);
  const currentUser = useAppStore((s) => s.currentUser);
  const users = useAppStore((s) => s.users);
  const totalXp = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
  const level = Math.floor(totalXp / 150) + 1;
  const levelProgress = (totalXp % 150) / 150 * 100;

  const leaderboard = Object.values(users)
    .map(u => ({ user: u, xp: Math.round(u.followers / 40) }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-7 h-7 text-primary" />
        <h1 className="font-display font-bold text-3xl">Achievements</h1>
      </div>
      <p className="text-muted-foreground mb-8">Track your progress and see how you stack up.</p>

      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 to-transparent p-6 mb-8 flex items-center gap-6">
        <Avatar className="w-16 h-16 border-2 border-primary/30">
          <AvatarImage src={currentUser?.avatarUrl} />
          <AvatarFallback>{currentUser?.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-baseline justify-between mb-2">
            <p className="font-display font-bold text-xl">Level {level}</p>
            <p className="text-sm text-muted-foreground">{totalXp} XP</p>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
      </div>

      <h2 className="font-display font-semibold text-xl mb-4">Badges</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {achievements.map((a, i) => {
          const Icon = ICONS[a.icon] ?? Star;
          const progressPct = Math.min(100, (a.progress / a.goal) * 100);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-2xl border p-5 ${a.unlocked ? 'border-primary/40 bg-primary/5' : 'border-border/50 bg-card'}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${a.unlocked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{a.title}</h3>
                    <span className="text-xs text-muted-foreground">+{a.xp} XP</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 mb-3">{a.description}</p>
                  {!a.unlocked && (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${progressPct}%` }} />
                    </div>
                  )}
                  {!a.unlocked && <p className="text-xs text-muted-foreground mt-1">{a.progress}/{a.goal}</p>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <h2 className="font-display font-semibold text-xl mb-4">Leaderboard</h2>
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden divide-y divide-border/50">
        {leaderboard.map((entry, i) => (
          <div key={entry.user.id} className="p-4 flex items-center gap-4">
            <span className={`w-6 text-center font-display font-bold ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>{i + 1}</span>
            <Avatar className="w-9 h-9">
              <AvatarImage src={entry.user.avatarUrl} />
              <AvatarFallback>{entry.user.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-sm">{entry.user.displayName}</p>
            </div>
            <span className="text-sm font-medium text-muted-foreground">{entry.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}
