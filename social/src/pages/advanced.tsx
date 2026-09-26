import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  BarChart3,
  Clock3,
  Eye,
  Heart,
  MessageCircle,
  Palette,
  Pin,
  Send,
  Shield,
  Sparkles,
  Type,
  UsersRound,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api, type PremiumProfileOptions } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';

type FeatureKey = keyof PremiumProfileOptions['enabledFeatures'];
type FeatureGroup = {
  label: string;
  description: string;
  features: Array<{
    key: FeatureKey;
    title: string;
    description: string;
    icon: typeof Eye;
    href: string;
  }>;
};

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: 'Stories',
    description: 'More control over who sees the moment and how it travels.',
    features: [
      { key: 'STORY_PRIVATE_VIEW', title: 'Private viewing', description: 'Choose whether eligible views appear in the owner’s identified viewer list.', icon: Eye, href: '/settings' },
      { key: 'STORY_REWATCH_ANALYTICS', title: 'Advanced insights', description: 'See total views, unique viewers, rewatches, and rewatch rate.', icon: BarChart3, href: '/settings' },
      { key: 'STORY_VIEW_TIMESTAMPS', title: 'Viewer timestamps', description: 'Search identified viewers and see when their latest view happened.', icon: Clock3, href: '/settings' },
      { key: 'STORY_PRIORITY', title: 'Priority stories', description: 'Add a capped ranking signal without changing the permitted audience.', icon: Sparkles, href: '/' },
      { key: 'EXTENDED_STORY', title: 'Extended duration', description: 'Publish beyond the standard 24-hour window, up to the configured ceiling.', icon: Clock3, href: '/' },
      { key: 'CUSTOM_STORY_AUDIENCE', title: 'Custom audiences', description: 'Use selected people and exclusions with server-enforced privacy checks.', icon: UsersRound, href: '/' },
      { key: 'SUPER_HEART', title: 'Super Heart', description: 'Send a high-emphasis reaction with its own event, notification, and counter.', icon: Heart, href: '/' },
      { key: 'DIRECT_HIGHLIGHT', title: 'Direct highlights', description: 'Publish into a Highlight without requiring an active story tray entry.', icon: Shield, href: '/profile' },
    ],
  },
  {
    label: 'Messages',
    description: 'Keep conversations expressive while preserving read-receipt intent.',
    features: [
      { key: 'MESSAGE_UNREAD_PREVIEW', title: 'Unread preview', description: 'Preview a message without advancing the sender-facing read receipt.', icon: MessageCircle, href: '/messages' },
      { key: 'MESSAGE_FONT', title: 'Message styles', description: 'Select a curated presentation style while preserving ordinary message text.', icon: Type, href: '/settings' },
    ],
  },
  {
    label: 'Profile & publishing',
    description: 'Make your profile feel authored, not merely configured.',
    features: [
      { key: 'SIX_PINNED_POSTS', title: 'Six pinned posts', description: 'Keep the six posts that define your current signal at the top of your grid.', icon: Pin, href: '/profile' },
      { key: 'PROFILE_ONLY_POST', title: 'Profile-only publishing', description: 'Publish a post to your profile without placing it in normal feeds or search.', icon: Send, href: '/' },
      { key: 'CUSTOM_BIO_FONT', title: 'Bio styles', description: 'Use a safe, curated bio style without transforming your underlying text.', icon: Type, href: '/settings' },
      { key: 'STORY_FONT', title: 'Story typography', description: 'Use curated story typography that remains readable and emoji-safe.', icon: Palette, href: '/' },
    ],
  },
  {
    label: 'Appearance',
    description: 'Small identity details with a clear platform boundary.',
    features: [
      { key: 'CUSTOM_APP_ICON', title: 'Yor app icons', description: 'Choose from Yor-branded icon variants with platform compatibility shown.', icon: Palette, href: '/settings' },
    ],
  },
];

export default function Advanced() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [catalog, setCatalog] = useState<PremiumProfileOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.getPremiumProfileOptions()
      .then((result) => { if (active) setCatalog(result); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load the Advanced feature catalog'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentUser?.id]);

  const enabledCount = useMemo(() => {
    if (!catalog) return 0;
    return FEATURE_GROUPS.flatMap((group) => group.features).filter((feature) => catalog.enabledFeatures[feature.key]).length;
  }, [catalog]);
  const totalCount = FEATURE_GROUPS.reduce((sum, group) => sum + group.features.length, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <motion.main variants={fadeInUp} initial="initial" animate="animate" className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.32),transparent_42%),linear-gradient(135deg,hsl(var(--card)),hsl(var(--background)))] p-6 shadow-[0_30px_100px_-45px_hsl(var(--primary)/0.6)] sm:p-10">
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary"><Sparkles className="h-3.5 w-3.5" /> Yor Advanced</div>
              <h1 className="font-display text-4xl font-black tracking-[-0.055em] text-foreground sm:text-6xl">Your signal,<br /><span className="text-primary">with intent.</span></h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">A single control room for the premium social features that make Yor feel more personal: privacy with semantics, expression without hacks, and interaction with a memory.</p>
              <div className="mt-6 flex flex-wrap gap-3"><Link href="/settings" className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5"><Palette className="h-4 w-4" /> Tune your identity</Link><Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-4 py-2.5 text-xs font-bold transition-colors hover:border-primary/40"><Send className="h-4 w-4" /> Open the feed</Link></div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:w-[22rem]">
              {[['Rollout', loading ? '—' : `${enabledCount}/${totalCount}`], ['Privacy', 'server-led'], ['Tone', 'YOR']].map(([label, value]) => <div key={label} className="rounded-2xl border border-border/50 bg-background/35 p-4 backdrop-blur-sm"><p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p><p className="mt-2 font-display text-xl font-black text-foreground">{value}</p></div>)}
            </div>
          </div>
        </section>

        {error && <div role="alert" className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error} You can still use the standard social controls while the entitlement catalog is unavailable.</div>}

        <div className="mt-8 space-y-8">
          {FEATURE_GROUPS.map((group) => (
            <section key={group.label}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.18em] text-primary">Advanced layer</p><h2 className="mt-1 font-display text-2xl font-black tracking-[-0.04em]">{group.label}</h2></div><p className="max-w-md text-right text-xs leading-5 text-muted-foreground">{group.description}</p></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.features.map((feature) => {
                  const enabled = catalog?.enabledFeatures[feature.key] === true;
                  const Icon = feature.icon;
                  return <Link key={feature.key} href={feature.href} className={cn('group rounded-3xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl', enabled ? 'border-border/50 bg-card/70 hover:border-primary/35' : 'border-border/35 bg-card/35 opacity-75')}>
                    <div className="flex items-start justify-between gap-3"><div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}><Icon className="h-4.5 w-4.5" /></div><span className={cn('rounded-full border px-2 py-1 text-[0.56rem] font-bold uppercase tracking-[0.14em]', enabled ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'border-border/50 text-muted-foreground')}>{loading ? 'Checking' : enabled ? 'Available' : 'Locked'}</span></div>
                    <h3 className="mt-5 font-display text-lg font-bold tracking-[-0.02em]">{feature.title}</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">{feature.description}</p><span className="mt-5 inline-flex items-center gap-1.5 text-[0.65rem] font-bold text-primary opacity-0 transition-opacity group-hover:opacity-100">{enabled ? 'Open control' : 'See context'} <span aria-hidden="true">→</span></span>
                  </Link>;
                })}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-3xl border border-border/50 bg-card/50 p-5 text-xs leading-6 text-muted-foreground sm:p-6"><div className="flex items-start gap-3"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p>Availability is read from the authenticated server entitlement snapshot. A visible card is not a promise that a provider, native platform capability, or production credential is configured; those boundaries are surfaced at the control that needs them.</p></div></section>
      </motion.main>
    </div>
  );
}
