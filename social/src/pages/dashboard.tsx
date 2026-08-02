import { useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { LayoutDashboard, TrendingUp, TrendingDown, Sparkles, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { BarChart, Bar, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeInUp } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const activityData = [
  { day: 'Mon', interactions: 12 },
  { day: 'Tue', interactions: 19 },
  { day: 'Wed', interactions: 8 },
  { day: 'Thu', interactions: 24 },
  { day: 'Fri', interactions: 15 },
  { day: 'Sat', interactions: 31 },
  { day: 'Sun', interactions: 22 },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const currentUser = useAppStore((s) => s.currentUser);
  const posts = useAppStore((s) => s.posts);
  const users = useAppStore((s) => s.users);

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
    { label: 'Engagement Rate', value: `${engagementRate}%`, trend: 4, positive: true },
  ];

  const recentActivity = posts.slice(0, 5).map(p => ({
    id: p.id,
    type: 'wave',
    user: users[p.authorId] || currentUser,
    time: p.createdAt
  }));

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Creator Dashboard</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Performance & Analytics</p>
        </div>
        <div className="level-badge">
          <Activity className="w-3.5 h-3.5" /> Live Metrics
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, i) => (
            <motion.div key={i} variants={staggerItem} className="surface-1 rounded-2xl p-5 border border-border/40 hover:border-primary/40 transition-all duration-300">
              <h3 className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-mono font-bold mb-2">
                {stat.label}
              </h3>
              <div className="flex items-end justify-between">
                <span className="font-display text-3xl font-extrabold">{stat.value}</span>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-mono font-bold px-2 py-0.5 rounded-full",
                  stat.positive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {stat.positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {Math.abs(stat.trend)}%
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2 surface-1 rounded-2xl p-6 border border-border/40"
          >
            <div className="showcase-section-title mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3>Interactions Over Time</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border) / 0.5)', background: 'hsl(var(--card))', boxShadow: 'var(--elevate-2)' }}
                  />
                  <Bar 
                    dataKey="interactions" 
                    fill="hsl(var(--primary))" 
                    radius={[6, 6, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="surface-1 rounded-2xl p-6 border border-border/40 flex flex-col"
          >
            <div className="showcase-section-title mb-4">
              <Activity className="w-4 h-4 text-accent" />
              <h3>Recent Stream</h3>
            </div>
            <div className="flex-1 space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={activity.user?.avatarUrl} />
                    <AvatarFallback>{activity.user?.displayName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium leading-snug">
                      <span className="font-bold text-foreground">{activity.user?.displayName}</span>
                      {' '}interacted with your post
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground font-mono mt-0.5">
                      {formatDistanceToNow(new Date(activity.time))} ago
                    </p>
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
