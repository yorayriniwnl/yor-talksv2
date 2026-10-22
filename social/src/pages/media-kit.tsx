import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Share2, TrendingUp, Users, Eye, Heart, CircleDollarSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { api, type CreatorAnalyticsDaily } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

type AnalyticsState = 'loading' | 'ready' | 'unavailable';

function number(value: number | undefined): string {
  return value === undefined ? '—' : new Intl.NumberFormat().format(value);
}

function currency(value: number | undefined): string {
  return value === undefined ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value / 100);
}

export default function MediaKit() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [analytics, setAnalytics] = useState<CreatorAnalyticsDaily | null>(null);
  const [analyticsState, setAnalyticsState] = useState<AnalyticsState>('loading');
  const profileUrl = useMemo(() => currentUser?.id
    ? new URL(`/profile/${encodeURIComponent(currentUser.id)}`, window.location.origin).toString()
    : '', [currentUser?.id]);

  useEffect(() => {
    let active = true;
    if (!currentUser?.id) {
      setAnalytics(null);
      setAnalyticsState('unavailable');
      return () => { active = false; };
    }
    setAnalyticsState('loading');
    void api.getCreatorAnalytics().then((snapshots) => {
      if (!active) return;
      const latest = [...snapshots].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0] ?? null;
      setAnalytics(latest);
      setAnalyticsState('ready');
    }).catch(() => {
      if (!active) return;
      setAnalytics(null);
      setAnalyticsState('unavailable');
    });
    return () => { active = false; };
  }, [currentUser?.id]);

  const copyProfileLink = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('Profile link copied');
    } catch {
      toast.error('Could not copy the profile link on this device');
    }
  };

  const downloadSnapshot = () => {
    if (!currentUser?.id) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      creator: {
        displayName: currentUser.displayName,
        username: currentUser.username,
        verified: Boolean(currentUser.verified),
        profileUrl,
      },
      latestAnalyticsSnapshot: analytics,
      analyticsAvailable: analyticsState === 'ready',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `yor-creator-media-kit-${currentUser.username || currentUser.id}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success('Creator snapshot downloaded');
  };

  const metrics = [
    { label: 'Profile views today', value: number(analytics?.profileViews), icon: Eye },
    { label: 'New followers today', value: number(analytics?.newFollowers), icon: Users },
    { label: 'Post views to date', value: number(analytics?.totalPostViews), icon: TrendingUp },
    { label: 'Video views to date', value: number(analytics?.totalReelViews), icon: Eye },
    { label: 'Engagements to date', value: number(analytics?.totalEngagement), icon: Heart },
    { label: 'Estimated earnings today (INR)', value: currency(analytics?.estimatedEarnings), icon: CircleDollarSign },
  ];

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"><FileText className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">Creator media kit</h1>
            <p className="text-xs text-muted-foreground">Your profile and latest available account metrics</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void copyProfileLink()} disabled={!profileUrl}>
            <Share2 className="mr-1.5 h-4 w-4" /> Copy profile link
          </Button>
          <Button type="button" size="sm" onClick={downloadSnapshot} disabled={!currentUser?.id}>
            <Download className="mr-1.5 h-4 w-4" /> Download JSON
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <section className="surface-1 flex flex-col gap-5 rounded-3xl border border-border/40 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border border-border/60">
              <AvatarImage src={currentUser?.avatarUrl} alt="" />
              <AvatarFallback>{currentUser?.displayName?.slice(0, 1) || 'Y'}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{currentUser?.displayName || 'Creator'}</h2>
              <p className="text-sm text-muted-foreground">{currentUser?.username ? `@${currentUser.username}` : 'Yor Talks member'}</p>
              <p className="mt-1 text-xs text-muted-foreground">{currentUser?.verified ? 'Verified account' : 'Community account'}</p>
            </div>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Share your public profile with partners. Metrics below come from the latest creator analytics snapshot and may be unavailable for this account.
          </p>
        </section>

        <section aria-labelledby="creator-metrics-heading" className="space-y-4">
          <div>
            <h2 id="creator-metrics-heading" className="text-lg font-bold">Creator metrics</h2>
            <p className="text-xs text-muted-foreground">Counts are platform records, not verified audience estimates.</p>
          </div>
          {analyticsState === 'loading' && <p role="status" className="rounded-2xl border border-border/40 p-5 text-sm text-muted-foreground">Loading the latest analytics snapshot…</p>}
          {analyticsState === 'unavailable' && <p role="status" className="rounded-2xl border border-border/40 p-5 text-sm text-muted-foreground">Creator analytics are unavailable for this account right now.</p>}
          {analyticsState === 'ready' && !analytics && <p role="status" className="rounded-2xl border border-border/40 p-5 text-sm text-muted-foreground">No analytics snapshot has been recorded yet.</p>}
          {analytics && <>
            <p className="text-xs text-muted-foreground">Snapshot date: {new Date(analytics.date).toLocaleDateString()}</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map(({ label, value, icon: Icon }) => (
                <article key={label} className="surface-1 rounded-2xl border border-border/40 p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon aria-hidden="true" className="h-4 w-4 text-primary" />{label}</div>
                  <p className="mt-3 text-2xl font-bold tabular-nums">{value}</p>
                </article>
              ))}
            </div>
          </>}
        </section>
      </div>
    </main>
  );
}
