import { useMemo, lazy, Suspense } from 'react';
import { useAppStore } from '@/lib/store';
import {
  Sparkles, Activity, Gamepad2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeInUp } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const AnalyticsChart = lazyWithRetry(() => import('@/components/dashboard/AnalyticsChart'));

export default function Dashboard() {
  const currentUser = useAppStore((s) => s.currentUser);
  const posts = useAppStore((s) => s.posts);
  const users = useAppStore((s) => s.users);
  const notifications = useAppStore((s) => s.notifications);

  // Derived stats
  const myPosts = posts.filter(p => p.authorId === currentUser?.id);
  const totalPosts = myPosts.length;
  const totalWaves = myPosts.reduce((sum, p) => sum + p.likes, 0);
  const followers = currentUser?.followers || 0;
  
  const engagementRate = totalPosts > 0 ? ((totalWaves / (followers || 1)) * 100).toFixed(1) : '0.0';

  const stats = [
    { label: 'Total Posts', value: totalPosts, detail: 'Loaded from your account' },
    { label: 'Waves Received', value: totalWaves, detail: 'Across loaded posts' },
    { label: 'Followers', value: followers, detail: 'Current account total' },
    { label: 'Engagement Rate', value: `${engagementRate}%`, detail: 'Waves ÷ followers' },
  ];

  const activityData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setHours(0, 0, 0, 0);
      day.setDate(today.getDate() - (6 - index));
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);
      const interactions = myPosts
        .filter((post) => {
          const createdAt = new Date(post.createdAt);
          return createdAt >= day && createdAt < nextDay;
        })
        .reduce((sum, post) => sum + post.likes + post.comments + post.shares + post.reposts, 0);
      return { day: day.toLocaleDateString(undefined, { weekday: 'short' }), interactions };
    });
  }, [myPosts]);

  const recentActivity = notifications.slice(0, 4).map((notification) => ({
    id: notification.id,
    user: notification.actorId ? users[notification.actorId]?.displayName || users[notification.actorId]?.username || 'Yor member' : 'Yor Talks',
    avatar: notification.actorId ? users[notification.actorId]?.avatarUrl : undefined,
    desc: notification.message || notification.title,
    time: formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }),
  }));

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Creator & Gaming Dashboard</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Account-backed performance analytics & recent network activity</p>
        </div>
        <div className="level-badge">
          <Activity className="w-3.5 h-3.5" /> Account Snapshot
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
                <span className="text-[0.62rem] font-mono font-semibold text-muted-foreground text-right">{stat.detail}</span>
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
              <Suspense fallback={<div className="w-full h-full skeleton-aurora rounded-2xl" />}>
                <AnalyticsChart data={activityData} />
              </Suspense>
            </div>
          </motion.div>

          {/* Recent platform activity */}
          <motion.div 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="surface-1 rounded-3xl p-6 border border-border/40 flex flex-col shadow-sm"
          >
            <div className="showcase-section-title mb-4">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              <h3>Recent Yor Activity</h3>
            </div>
            <div className="flex-1 space-y-4">
              {recentActivity.length === 0 && <p className="rounded-2xl border border-dashed border-border/40 p-5 text-xs leading-relaxed text-muted-foreground">Notifications from your network will appear here as people interact with your posts, stories, and profile.</p>}
              {recentActivity.map((act) => (
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

                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
