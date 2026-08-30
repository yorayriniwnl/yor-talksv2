import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { BarChart3, Clock3, Eye, Heart, RefreshCw, ShieldCheck, Users, Wallet } from 'lucide-react';
import { api, type CreatorAnalyticsDaily } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Eye }) {
  return (
    <div className="surface-1 rounded-3xl border border-border/40 p-5">
      <div className="mb-4 flex items-center justify-between text-muted-foreground"><span className="text-[0.62rem] font-bold uppercase tracking-[0.16em]">{label}</span><Icon className="h-4 w-4 text-primary" /></div>
      <p className="font-display text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function CreatorAnalytics() {
  const currentUser = useAppStore((state) => state.currentUser);
  const posts = useAppStore((state) => state.posts);
  const videos = useAppStore((state) => state.videos);
  const [rows, setRows] = useState<CreatorAnalyticsDaily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRows(await api.getCreatorAnalytics());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Server telemetry is not reachable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const latest = rows[0];
  const totals = useMemo(() => ({
    profileViews: rows.reduce((sum, row) => sum + (row.profileViews || 0), 0),
    newFollowers: rows.reduce((sum, row) => sum + (row.newFollowers || 0), 0),
    // These are cumulative snapshots, so only the latest row is reportable as
    // a total. Summing every row would count the same content repeatedly.
    postViews: latest?.totalPostViews || 0,
    reelViews: latest?.totalReelViews || 0,
    engagement: latest?.totalEngagement || 0,
    earnings: rows.reduce((sum, row) => sum + (row.estimatedEarnings || 0), 0),
  }), [latest, rows]);

  const localPosts = posts.filter((post) => post.authorId === currentUser?.id);
  const localVideos = videos.filter((video) => video.authorId === currentUser?.id);
  const isServerConnected = rows.length > 0 && !error;

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <div className="sticky top-0 z-30 border-b border-border/40 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-600 text-black shadow-md"><BarChart3 className="h-5 w-5" /></div><div><h1 className="font-display text-xl font-black">Creator Telemetry</h1><p className="text-[0.68rem] text-muted-foreground">Views, resonance, audience growth, and payout readiness</p></div></div>
          <Button variant="outline" onClick={() => void load()} disabled={loading} className="rounded-2xl text-xs font-bold"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh</Button>
        </div>
      </div>

      <section aria-label="Creator analytics" className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {error && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Daily server telemetry is not available yet: {error}. Local Control Room rollups remain visible below.</div>}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Profile views" value={totals.profileViews.toLocaleString()} detail={isServerConnected ? 'Last 30 recorded days' : 'Awaiting server rollup'} icon={Eye} />
          <Metric label="Content reach" value={(totals.postViews + totals.reelViews).toLocaleString()} detail={`${localPosts.length + localVideos.length} live content items`} icon={BarChart3} />
          <Metric label="Engagement" value={totals.engagement.toLocaleString()} detail={isServerConnected ? 'Current server-counted total' : 'Telemetry will backfill'} icon={Heart} />
          <Metric label="New followers" value={totals.newFollowers.toLocaleString()} detail={`${currentUser?.followers ?? 0} current followers`} icon={Users} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface-1 rounded-3xl border border-border/40 p-6">
            <div className="mb-5 flex items-center justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Reach snapshots</p><h2 className="mt-1 font-display text-xl font-black">How your signal has grown.</h2></div><Clock3 className="h-5 w-5 text-primary" /></div>
            {rows.length > 0 ? <div className="space-y-3">{rows.slice(0, 14).map((row) => { const reach = row.totalPostViews + row.totalReelViews; const maxReach = Math.max(...rows.map((item) => item.totalPostViews + item.totalReelViews), 1); return <div key={row.id} className="grid grid-cols-[5.5rem_1fr_4rem] items-center gap-3 text-xs"><span className="text-muted-foreground">{new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${Math.max(3, Math.round((reach / maxReach) * 100))}%` }} /></div><span className="text-right font-bold">{reach.toLocaleString()}</span></div>; })}</div> : <div className="rounded-2xl border border-dashed border-border/50 p-8 text-center"><BarChart3 className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-bold">Telemetry is ready for your first daily rollup.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Publish content and the server can aggregate profile views, reel watch time, engagement, and follower changes here.</p></div>}
          </div>
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.15] via-card to-card p-6"><Wallet className="mb-5 h-7 w-7 text-emerald-400" /><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-emerald-300">Earnings ledger</p><h2 className="mt-1 font-display text-3xl font-black">₹{(totals.earnings / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Only verified server-side settlements can enter this number. No client-side counter can create a payout.</p></div>
            <div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><h3 className="font-display font-bold">Trust gates</h3></div><div className="space-y-3 text-xs"><div className="flex items-center justify-between"><span className="text-muted-foreground">Content Passport</span><strong className="text-emerald-400">Active</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Payment verification</span><strong className="text-amber-300">Provider-gated</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Daily telemetry</span><strong className={isServerConnected ? 'text-emerald-400' : 'text-amber-300'}>{isServerConnected ? 'Connected' : 'Backfill pending'}</strong></div></div><Link href="/control-room" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-primary">Open Control Room <BarChart3 className="h-4 w-4" /></Link></div>
          </div>
        </section>
      </section>
    </div>
  );
}
