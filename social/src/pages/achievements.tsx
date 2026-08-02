import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Sparkles, TrendingUp, Users, Flame, BookOpen, Trophy, Star, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/motion';

const ICONS: Record<string, any> = { Sparkles, TrendingUp, Users, Flame, BookOpen };

export default function Achievements() {
  const achievements = useAppStore((s) => s.achievements);
  
  const totalXp = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
  const level = Math.floor(Math.sqrt(totalXp / 50)) + 1;
  
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);
  const sortedAchievements = [...unlocked, ...locked];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Achievements</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Trophies & Milestones</p>
          </div>
        </div>
        <div className="level-badge">
          <Shield className="w-3.5 h-3.5" /> Lv. {level}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">
        {/* XP Counter Banner */}
        <div className="mb-10 p-8 rounded-3xl surface-1 border border-border/40 text-center relative overflow-hidden">
          <div className="absolute inset-0 aurora-bg opacity-30 pointer-events-none" />
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="level-badge mb-3 glow-neon-primary">
              <Star className="w-3.5 h-3.5" /> Level {level} Voyager
            </div>
            <span className="font-display font-extrabold text-6xl sm:text-7xl text-shimmer tracking-tight">
              {totalXp}
            </span>
            <span className="text-xs uppercase tracking-widest text-muted-foreground mt-2 font-bold font-mono">
              Total XP Accumulated
            </span>
          </motion.div>
        </div>

        <div className="showcase-section-title mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3>All Badges ({unlocked.length}/{achievements.length})</h3>
        </div>

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {sortedAchievements.map((a) => {
            const Icon = ICONS[a.icon] ?? Star;
            const progressPct = Math.min(100, (a.progress / a.goal) * 100);
            
            return (
              <motion.div
                key={a.id}
                variants={staggerItem}
                className={cn(
                  "surface-1 rounded-2xl p-6 flex flex-col items-center text-center relative border transition-all duration-300",
                  a.unlocked ? "border-primary/40 glow-neon-primary bg-card/80" : "border-border/30 opacity-60 bg-card/30"
                )}
              >
                {/* SVG Ring */}
                <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle
                      cx="40" cy="40" r="36"
                      className="stroke-muted fill-none"
                      strokeWidth="5"
                    />
                    <circle
                      cx="40" cy="40" r="36"
                      className={cn(
                        "fill-none transition-all duration-1000 ease-out",
                        a.unlocked ? "stroke-primary" : "stroke-muted-foreground/30"
                      )}
                      strokeWidth="5"
                      strokeDasharray="226.19"
                      strokeDashoffset={226.19 - (226.19 * progressPct) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <Icon className={cn("w-8 h-8", a.unlocked ? "text-primary drop-shadow-md" : "text-muted-foreground/50")} />
                </div>
                
                <h3 className="font-display font-bold text-base mb-1">{a.title}</h3>
                <p className="text-xs font-serif text-muted-foreground mb-4 line-clamp-2">{a.description}</p>
                
                <div className="mt-auto w-full flex items-center justify-between pt-3 border-t border-border/30 font-mono text-xs">
                  <span className={cn(
                    "font-bold px-2.5 py-0.5 rounded-full",
                    a.unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    +{a.xp} XP
                  </span>
                  <span className="font-semibold text-muted-foreground">
                    {a.progress} / {a.goal}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
