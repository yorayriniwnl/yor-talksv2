import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { 
  LayoutDashboard, TrendingUp, TrendingDown, Sparkles, Activity, 
  Gamepad2, Trophy, ArrowLeftRight, Award, Shield, Star, CheckCircle2 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const activityData = [
  { day: 'Mon', interactions: 12 },
  { day: 'Tue', interactions: 19 },
  { day: 'Wed', interactions: 8 },
  { day: 'Thu', interactions: 24 },
  { day: 'Fri', interactions: 15 },
  { day: 'Sat', interactions: 31 },
  { day: 'Sun', interactions: 22 },
];

const STEAM_FRIEND_ACTIVITIES = [
  {
    id: 'act-1',
    user: 'Valkyrie_Zero',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
    type: 'achievement',
    title: 'Unlocked Achievement',
    desc: '🏆 "Legendary Mercenary" in Cyberpunk 2077: Phantom Liberty',
    time: '12 minutes ago',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
  },
  {
    id: 'act-2',
    user: 'Kai_Takahashi',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    type: 'trade',
    title: 'Steam Trade Completed',
    desc: '🔄 Traded Butterfly Knife | Gamma Doppler (Emerald)',
    time: '45 minutes ago',
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    id: 'act-3',
    user: 'Elena_Rostova',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop',
    type: 'level',
    title: 'Steam Level Up',
    desc: '🛡️ Reached Steam Level 90 · Crafted "Cosmic Architect" Badge',
    time: '2 hours ago',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
  },
  {
    id: 'act-4',
    user: 'Alex_Chen',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
    type: 'review',
    title: 'Steam Game Review',
    desc: '👍 Recommended Counter-Strike 2 (1,240 hrs on record)',
    time: '5 hours ago',
    badgeColor: 'text-primary bg-primary/10 border-primary/20'
  }
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const currentUser = useAppStore((s) => s.currentUser);
  const posts = useAppStore((s) => s.posts);
  const users = useAppStore((s) => s.users);

  const [friendActivities, setFriendActivities] = useState(STEAM_FRIEND_ACTIVITIES);

  // Derived stats
  const myPosts = posts.filter(p => p.authorId === currentUser?.id);
  const totalPosts = myPosts.length;
  const totalWaves = myPosts.reduce((sum, p) => sum + p.likes, 0);
  const followers = currentUser?.followers || 0;
  
  const engagementRate = totalPosts > 0 ? ((totalWaves / (followers || 1)) * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'Total Posts', value: totalPosts, trend: 12, positive: true },
    { label: 'Waves Received', value: totalWaves, trend: 8, positive: true },
    { label: 'Followers', value: followers, trend: -2, positive: false },
    { label: 'Steam Level', value: 'Lv. 88', trend: 14, positive: true },
  ];

  const handleCelebrate = (userName: string) => {
    sounds.playChime();
    triggerConfetti();
    toast.success(`Sent +10 Steam XP & GG congratulations to ${userName}!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Creator & Gaming Dashboard</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Performance analytics & live Steam friend activity</p>
        </div>
        <div className="level-badge">
          <Activity className="w-3.5 h-3.5" /> Live Telemetry Active
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Metric Cards */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat, i) => (
            <motion.div key={i} variants={staggerItem} className="surface-1 rounded-3xl p-5 border border-border/40 hover:border-primary/40 transition-all duration-300 shadow-sm">
              <h3 className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-mono font-bold mb-2">
                {stat.label}
              </h3>
              <div className="flex items-end justify-between">
                <span className="font-display text-3xl font-extrabold text-foreground">{stat.value}</span>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full",
                  stat.positive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {stat.positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {Math.abs(stat.trend)}%
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Analytics Chart & Steam Friend Feed Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 surface-1 rounded-3xl p-6 border border-border/40 shadow-sm flex flex-col justify-between"
          >
            <div className="showcase-section-title mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3>Interactions & Resonance Over Time</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid hsl(var(--border) / 0.5)', background: 'hsl(var(--card))', boxShadow: 'var(--elevate-2)' }}
                  />
                  <Bar 
                    dataKey="interactions" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Steam & Platform Friend Activity Feed */}
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col shadow-sm"
          >
            <div className="showcase-section-title mb-4">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              <h3>Steam Friend Activity</h3>
            </div>
            <div className="flex-1 space-y-4">
              {friendActivities.map((act) => (
                <div key={act.id} className="p-3 rounded-2xl bg-muted/30 border border-border/30 hover:border-primary/40 transition-all flex flex-col justify-between group">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 shrink-0 border border-border/40">
                      <AvatarImage src={act.avatar} />
                      <AvatarFallback>{act.user.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-foreground truncate">{act.user}</span>
                        <span className="text-[0.62rem] text-muted-foreground font-mono shrink-0">{act.time}</span>
                      </div>
                      <p className="text-xs text-foreground/90 font-medium mt-0.5 leading-snug">{act.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end mt-2 pt-2 border-t border-border/20">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCelebrate(act.user)}
                      className="h-7 text-[0.68rem] font-mono font-bold px-2 rounded-xl text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                    >
                      🎉 Send GG (+10 XP)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
