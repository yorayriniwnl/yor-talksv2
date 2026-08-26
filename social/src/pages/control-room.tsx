import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  Accessibility,
  BarChart3,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileText,
  Flag,
  FolderHeart,
  Gauge,
  Globe2,
  Layers3,
  Lightbulb,
  LockKeyhole,
  Megaphone,
  Plus,
  Radio,
  Rocket,
  Save,
  ShieldCheck,
  Sparkles,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore, type Post } from '@/lib/store';
import { api, type CreatorWorkspaceItem, type CreatorWorkspaceKind } from '@/lib/api-client';
import { CONTENT_CATEGORIES, resolveContentCategory, type ContentCategory } from '@/lib/content-category';
import { CONTENT_RATING_OPTIONS, DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ContentCategoryBadge } from '@/components/content/ContentCategoryBadge';
import { cn } from '@/lib/utils';
import { WorldPreferencesForm } from '@/components/worlds/WorldPreferencesForm';
import { DEFAULT_WORLD_PREFERENCES, type WorldPreferences } from '@/lib/world-preferences';

type Panel = 'overview' | 'world' | 'safety' | 'creator' | 'discovery' | 'trust' | 'accessibility';
type CreatorTab = 'drafts' | 'schedule' | 'collab' | 'analytics';

const PANELS: Array<{ id: Panel; label: string; icon: typeof Gauge }> = [
  { id: 'overview', label: 'Command center', icon: Gauge },
  { id: 'world', label: 'World layer', icon: Globe2 },
  { id: 'safety', label: 'Content passport', icon: ShieldCheck },
  { id: 'creator', label: 'Creator pipeline', icon: Rocket },
  { id: 'discovery', label: 'Discovery worlds', icon: Compass },
  { id: 'trust', label: 'Trust & identity', icon: LockKeyhole },
  { id: 'accessibility', label: 'Access for everyone', icon: Accessibility },
];

const QUESTS = [
  { key: 'first-post', title: 'Plant your first seed', description: 'Publish a categorized post to your world.', href: '/' },
  { key: 'join-world', title: 'Join a world', description: 'Find a community that shares your signal.', href: '/worlds' },
  { key: 'go-live', title: 'Open a live room', description: 'Host a conversation with a clear audience rating.', href: '/live' },
  { key: 'build-together', title: 'Build together', description: 'Start a project and invite a collaborator.', href: '/projects' },
] as const;

function itemPayload(item: CreatorWorkspaceItem | undefined) {
  return item?.payload ?? {};
}

function payloadString(item: CreatorWorkspaceItem | undefined, key: string, fallback = '') {
  const value = itemPayload(item)[key];
  return typeof value === 'string' ? value : fallback;
}

function payloadStringArray(item: CreatorWorkspaceItem | undefined, key: string) {
  const value = itemPayload(item)[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function Metric({ label, value, detail, icon: Icon }: { label: string; value: string | number; detail: string; icon: typeof Gauge }) {
  return (
    <div className="surface-1 rounded-3xl border border-border/40 p-5">
      <div className="mb-4 flex items-center justify-between text-muted-foreground"><span className="text-[0.62rem] font-bold uppercase tracking-[0.16em]">{label}</span><Icon className="h-4 w-4 text-primary" /></div>
      <div className="font-display text-3xl font-black tracking-tight">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export default function ControlRoom() {
  const currentUser = useAppStore((state) => state.currentUser);
  const posts = useAppStore((state) => state.posts);
  const articles = useAppStore((state) => state.articles);
  const videos = useAppStore((state) => state.videos);
  const liveStreams = useAppStore((state) => state.liveStreams);
  const communities = useAppStore((state) => state.communities);
  const updateContentFilter = useAppStore((state) => state.updateContentFilter);
  const worldPreferences = useAppStore((state) => state.worldPreferences);
  const updateWorldPreferences = useAppStore((state) => state.updateWorldPreferences);

  const [panel, setPanel] = useState<Panel>('overview');
  const [creatorTab, setCreatorTab] = useState<CreatorTab>('drafts');
  const [workspace, setWorkspace] = useState<CreatorWorkspaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contentFilter, setContentFilter] = useState<ContentRating>(currentUser?.contentFilter ?? DEFAULT_CONTENT_RATING);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftCategory, setDraftCategory] = useState<ContentCategory>('campus');
  const [draftRating, setDraftRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleCategory, setScheduleCategory] = useState<ContentCategory>('campus');
  const [collectionName, setCollectionName] = useState('');
  const [collabTitle, setCollabTitle] = useState('');
  const [collabBrief, setCollabBrief] = useState('');
  const [collabRole, setCollabRole] = useState('Designer, engineer, or storyteller');
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [worldDraft, setWorldDraft] = useState<WorldPreferences>(worldPreferences ?? DEFAULT_WORLD_PREFERENCES);

  useEffect(() => {
    let active = true;
    api.getCreatorWorkspace()
      .then((items) => { if (active) setWorkspace(items); })
      .catch(() => { if (active) toast.error('Control Room is offline. Try again when the API is connected.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const preferenceItem = workspace.find((item) => item.kind === 'preference' && item.itemKey === 'accessibility');
  const worldPreferenceItem = workspace.find((item) => item.kind === 'preference' && item.itemKey === 'world');
  useEffect(() => {
    const payload = itemPayload(preferenceItem);
    setLargeText(payload.largeText === true);
    setHighContrast(payload.highContrast === true);
    setReducedMotion(payload.reducedMotion === true);
    setCaptions(payload.captions !== false);
  }, [preferenceItem]);

  useEffect(() => {
    if (!worldPreferenceItem) return;
    const payload = itemPayload(worldPreferenceItem) as Partial<WorldPreferences>;
    setWorldDraft((current) => ({ ...current, ...payload }));
    updateWorldPreferences(payload);
  }, [worldPreferenceItem]);

  useEffect(() => {
    document.documentElement.classList.toggle('yor-accessibility-large-text', largeText);
    document.documentElement.classList.toggle('yor-accessibility-high-contrast', highContrast);
    document.documentElement.classList.toggle('yor-accessibility-reduced-motion', reducedMotion);
    return () => {
      document.documentElement.classList.remove('yor-accessibility-large-text', 'yor-accessibility-high-contrast', 'yor-accessibility-reduced-motion');
    };
  }, [largeText, highContrast, reducedMotion]);

  const saveItem = async (kind: CreatorWorkspaceKind, itemKey: string, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const saved = await api.saveCreatorWorkspaceItem({ kind, itemKey, payload });
      setWorkspace((current) => {
        const existing = current.findIndex((item) => item.kind === kind && item.itemKey === itemKey);
        if (existing === -1) return [...current, saved];
        return current.map((item, index) => index === existing ? saved : item);
      });
      return saved;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save this Control Room item');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item: CreatorWorkspaceItem) => {
    try {
      await api.deleteCreatorWorkspaceItem(item.kind, item.itemKey);
      setWorkspace((current) => current.filter((entry) => entry.id !== item.id));
      toast.success('Removed from your workspace');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove this item');
    }
  };

  const saveWorldPreferences = async () => {
    updateWorldPreferences(worldDraft);
    const saved = await saveItem('preference', 'world', worldDraft as unknown as Record<string, unknown>);
    if (saved) toast.success(`World settings saved for ${worldDraft.worldLabel}`);
  };

  const myPosts = useMemo(() => posts.filter((post) => post.authorId === currentUser?.id), [currentUser?.id, posts]);
  const myArticles = useMemo(() => articles.filter((article) => article.authorId === currentUser?.id), [articles, currentUser?.id]);
  const myVideos = useMemo(() => videos.filter((video) => video.authorId === currentUser?.id), [currentUser?.id, videos]);
  const myLiveRooms = useMemo(() => liveStreams.filter((stream) => stream.hostId === currentUser?.id), [currentUser?.id, liveStreams]);
  const totalEngagement = myPosts.reduce((sum, post) => sum + post.likes + post.comments + post.shares, 0) + myArticles.reduce((sum, article) => sum + article.claps, 0) + myVideos.reduce((sum, video) => sum + video.likes + video.views, 0);
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    [...posts, ...articles, ...videos].forEach((content) => {
      const value = resolveContentCategory(content.contentCategory).value;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });
    return CONTENT_CATEGORIES.map((category) => ({ ...category, count: counts.get(category.value) ?? 0 })).sort((a, b) => b.count - a.count);
  }, [articles, posts, videos]);

  const drafts = workspace.filter((item) => item.kind === 'draft');
  const scheduled = workspace.filter((item) => item.kind === 'scheduled');
  const collections = workspace.filter((item) => item.kind === 'collection');
  const collaborations = workspace.filter((item) => item.kind === 'collaboration');

  const updateAccessibility = async (key: string, value: boolean) => {
    const next = { largeText, highContrast, reducedMotion, captions, [key]: value };
    if (key === 'largeText') setLargeText(value);
    if (key === 'highContrast') setHighContrast(value);
    if (key === 'reducedMotion') setReducedMotion(value);
    if (key === 'captions') setCaptions(value);
    await saveItem('preference', 'accessibility', next);
  };

  const toggleQuest = async (questKey: string) => {
    const item = workspace.find((entry) => entry.kind === 'quest' && entry.itemKey === questKey);
    await saveItem('quest', questKey, { completed: itemPayload(item).completed !== true });
  };

  const createDraft = async () => {
    if (!draftTitle.trim() || !draftBody.trim()) {
      toast.error('Add a title and a first paragraph to save a draft');
      return;
    }
    const saved = await saveItem('draft', `draft-${Date.now()}`, { title: draftTitle.trim(), body: draftBody.trim(), category: draftCategory, rating: draftRating });
    if (saved) {
      setDraftTitle('');
      setDraftBody('');
      toast.success('Draft saved to your Creator Vault');
    }
  };

  const createSchedule = async () => {
    if (!scheduleTitle.trim() || !scheduleAt) {
      toast.error('Add a title and time before scheduling');
      return;
    }
    const saved = await saveItem('scheduled', `scheduled-${Date.now()}`, { title: scheduleTitle.trim(), scheduledFor: scheduleAt, category: scheduleCategory });
    if (saved) {
      setScheduleTitle('');
      setScheduleAt('');
      toast.success('Publishing slot reserved');
    }
  };

  const createCollection = async () => {
    if (!collectionName.trim()) {
      toast.error('Name your collection first');
      return;
    }
    const saved = await saveItem('collection', `collection-${Date.now()}`, { name: collectionName.trim(), postIds: [] });
    if (saved) {
      setCollectionName('');
      toast.success('Collection created');
    }
  };

  const addPostToCollection = async (item: CreatorWorkspaceItem, post: Post) => {
    const postIds = payloadStringArray(item, 'postIds');
    if (postIds.includes(post.id)) return;
    await saveItem('collection', item.itemKey, { ...itemPayload(item), postIds: [...postIds, post.id] });
  };

  const createCollaboration = async () => {
    if (!collabTitle.trim() || !collabBrief.trim()) {
      toast.error('Describe the collaboration before posting the brief');
      return;
    }
    const saved = await saveItem('collaboration', `collab-${Date.now()}`, { title: collabTitle.trim(), brief: collabBrief.trim(), role: collabRole.trim(), status: 'open' });
    if (saved) {
      setCollabTitle('');
      setCollabBrief('');
      toast.success('Collaboration brief published to your workspace');
    }
  };

  const changeContentFilter = async (value: ContentRating) => {
    const previous = contentFilter;
    setContentFilter(value);
    try {
      await updateContentFilter(value);
      toast.success('Your audience shield is updated');
    } catch (error) {
      setContentFilter(previous);
      toast.error(error instanceof Error ? error.message : 'Could not update your audience shield');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <div className="sticky top-0 z-30 border-b border-border/40 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-primary"><Sparkles className="h-3.5 w-3.5" /> Yor OS · {worldPreferences.worldLabel} world</p>
            <h1 className="font-display text-2xl font-black tracking-tight sm:text-3xl">Control Room</h1>
            <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">One cockpit for your audience, identity, content pipeline, discovery signal, and impact across worlds.</p>
          </div>
          <div className="hidden items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-right sm:block">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-primary">Creator health</p>
            <p className="font-display text-lg font-black">{loading ? 'Syncing…' : 'Online'}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Control Room sections">
          {PANELS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setPanel(id)} className={cn('flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-all', panel === id ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'border-border/40 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground')}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </nav>

        {panel === 'overview' && (
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Published signal" value={myPosts.length + myArticles.length + myVideos.length} detail="Posts, articles, and videos" icon={Layers3} />
              <Metric label="Engagement" value={totalEngagement.toLocaleString()} detail="Resonances, replies, views" icon={BarChart3} />
              <Metric label="Worlds active" value={communities.length} detail="Communities in your current orbit" icon={Compass} />
              <Metric label="Live rooms" value={myLiveRooms.length} detail="Your scheduled and live rooms" icon={Radio} />
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.16] via-card to-accent/[0.08] p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative max-w-xl space-y-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Rocket className="h-4 w-4" /> Your next move</div>
                  <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">Make your signal impossible to miss.</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">Use the passport to set the room, the pipeline to shape the story, and the worlds to find people who can make it real.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => { setPanel('creator'); setCreatorTab('drafts'); }} className="rounded-2xl font-bold"><WandSparkles className="h-4 w-4" /> Open Creator Vault</Button>
                    <Button variant="outline" onClick={() => setPanel('discovery')} className="rounded-2xl font-bold"><Compass className="h-4 w-4" /> Explore worlds</Button>
                  </div>
                </div>
              </div>
              <div className="surface-1 rounded-3xl border border-border/40 p-6">
                <div className="mb-5 flex items-center justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Content Passport</p><h2 className="mt-1 font-display text-xl font-black">Your defaults</h2></div><ShieldCheck className="h-5 w-5 text-primary" /></div>
                <ContentCategoryBadge value={categoryCounts[0]?.value} className="mb-4" />
                <div className="space-y-3 text-xs"><div className="flex items-center justify-between"><span className="text-muted-foreground">Audience shield</span><strong>{CONTENT_RATING_OPTIONS.find((option) => option.value === contentFilter)?.label}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Identity</span><strong>{currentUser?.emailVerified ? 'Identity verified' : 'Verification needed'}</strong></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Handle</span><strong>@{currentUser?.username}</strong></div></div>
                <button onClick={() => setPanel('safety')} className="mt-5 flex w-full items-center justify-between rounded-2xl border border-border/40 px-3 py-2.5 text-xs font-bold text-primary transition hover:bg-primary/10">Tune your passport <ChevronRight className="h-4 w-4" /></button>
              </div>
            </section>

            <section className="surface-1 rounded-3xl border border-border/40 p-6">
              <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">World quests</p><h2 className="mt-1 font-display text-xl font-black">Turn the product into a streak.</h2></div><Megaphone className="h-5 w-5 text-accent" /></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {QUESTS.map((quest) => {
                  const done = itemPayload(workspace.find((item) => item.kind === 'quest' && item.itemKey === quest.key)).completed === true;
                  return <div key={quest.key} className={cn('rounded-2xl border p-4 transition-all', done ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border/40 bg-background/30')}><div className="flex items-start justify-between gap-2"><div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', done ? 'bg-emerald-500 text-white' : 'bg-primary/10 text-primary')}>{done ? <Check className="h-4 w-4" /> : <Lightbulb className="h-4 w-4" />}</div><button onClick={() => void toggleQuest(quest.key)} aria-label={done ? `Mark ${quest.title} incomplete` : `Complete ${quest.title}`} className="rounded-full p-1 text-muted-foreground hover:bg-muted">{done ? <X className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}</button></div><h3 className="mt-3 text-sm font-bold">{quest.title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{quest.description}</p><Link href={quest.href} className="mt-3 inline-flex items-center gap-1 text-[0.68rem] font-bold text-primary">Open route <ChevronRight className="h-3 w-3" /></Link></div>;
                })}
              </div>
            </section>
          </div>
        )}

        {panel === 'world' && (
          <section className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.16] via-card to-accent/[0.08] p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative max-w-2xl">
                <Globe2 className="mb-5 h-8 w-8 text-primary" />
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-primary">Portable identity layer</p>
                <h2 className="mt-2 font-display text-3xl font-black tracking-tight">Your world follows you.</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Set the context once, then move between a city, a local community, an interest, or the whole planet without rebuilding your experience.</p>
              </div>
            </div>

            <div className="surface-1 rounded-3xl border border-border/40 p-6">
              <div className="mb-6 flex items-end justify-between gap-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">World settings</p><h2 className="mt-1 font-display text-xl font-black">Choose your context</h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-[0.65rem] font-bold text-primary">{worldDraft.worldLabel}</span></div>
              <WorldPreferencesForm value={worldDraft} onChange={(patch) => setWorldDraft((current) => ({ ...current, ...patch }))} idPrefix="control-world" />
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-5"><p className="max-w-xl text-xs leading-relaxed text-muted-foreground">Translation, captions, and low-bandwidth preferences are saved now. Provider-backed translation, dubbing, and multi-currency payouts can plug into this layer without changing your identity model.</p><Button onClick={() => void saveWorldPreferences()} disabled={saving} className="rounded-2xl font-bold">{saving ? 'Saving…' : 'Save world settings'}</Button></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[['Cross-border', 'Bridge communities across languages and timezones.'], ['Portable trust', 'Keep your handle, safety choices, and creator context consistent.'], ['Local control', 'Choose nearby discovery without giving up the wider world.']].map(([title, description]) => <div key={title} className="surface-1 rounded-2xl border border-border/40 p-4"><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p></div>)}
            </div>
          </section>
        )}

        {panel === 'safety' && (
          <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.16] to-card p-6">
                <ShieldCheck className="mb-5 h-8 w-8 text-primary" />
                <h2 className="font-display text-2xl font-black">Content Passport</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Every upload declares its category and audience before it goes live. Your shield controls what enters your personal orbit.</p>
                <div className="mt-6 space-y-2"><Label htmlFor="control-content-filter">My maximum audience level</Label><select id="control-content-filter" value={contentFilter} onChange={(event) => void changeContentFilter(event.target.value as ContentRating)} className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm font-semibold">{CONTENT_RATING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.description}</option>)}</select></div>
              </div>
              <div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-4 flex items-center gap-2"><Flag className="h-4 w-4 text-rose-400" /><h3 className="font-display font-bold">Safety escape hatches</h3></div><p className="text-xs leading-relaxed text-muted-foreground">Report a post, block or mute an account, and use the grievance portal when a decision needs human review.</p><div className="mt-4 grid gap-2"><Link href="/grievance" className="flex items-center justify-between rounded-2xl border border-border/40 px-3 py-2.5 text-xs font-bold hover:border-primary/40">Open grievance portal <ChevronRight className="h-4 w-4" /></Link><Link href="/settings" className="flex items-center justify-between rounded-2xl border border-border/40 px-3 py-2.5 text-xs font-bold hover:border-primary/40">Manage blocks, mutes & privacy <ChevronRight className="h-4 w-4" /></Link></div></div>
            </div>
            <div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Audience matrix</p><h2 className="mt-1 font-display text-xl font-black">Three rooms, one promise.</h2></div><Layers3 className="h-5 w-5 text-primary" /></div><div className="grid gap-3 sm:grid-cols-3">{CONTENT_RATING_OPTIONS.map((option, index) => <div key={option.value} className={cn('rounded-2xl border p-4', option.value === contentFilter ? 'border-primary bg-primary/10' : 'border-border/40 bg-background/30')}><div className="mb-3 flex items-center justify-between"><span className="text-2xl">{['🛡️', '🌐', '🔒'][index]}</span>{option.value === contentFilter && <span className="rounded-full bg-primary px-2 py-0.5 text-[0.58rem] font-bold text-primary-foreground">YOUR MAX</span>}</div><h3 className="text-sm font-bold">{option.label}</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.description}</p></div>)}</div><div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-200">Mature content is never silently mixed into a lower audience filter. It is filtered at the API boundary before recommendations are built.</div></div>
          </section>
        )}

        {panel === 'creator' && (
          <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Creator OS</p><h2 className="mt-1 font-display text-2xl font-black">Shape once. Publish everywhere.</h2><p className="mt-1 text-sm text-muted-foreground">Drafts, publishing slots, collaborator calls, and telemetry in one pipeline.</p></div><div className="flex gap-2"><Link href="/studio" className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"><Rocket className="h-4 w-4" /> Open Studio</Link><Link href="/analytics" className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-bold"><BarChart3 className="h-4 w-4" /> Full analytics</Link></div></div>
            <div className="flex gap-2 overflow-x-auto pb-1">{([['drafts', 'Draft Vault', FileText], ['schedule', 'Publishing Radar', CalendarClock], ['collab', 'Collab Calls', Users], ['analytics', 'Creator Telemetry', BarChart3]] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setCreatorTab(id)} className={cn('flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-bold', creatorTab === id ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:text-foreground')}><Icon className="h-3.5 w-3.5" />{label}</button>)}</div>

            {creatorTab === 'drafts' && <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-5 flex items-center gap-2"><Save className="h-4 w-4 text-primary" /><h3 className="font-display font-bold">New draft</h3></div><div className="space-y-4"><div><Label htmlFor="draft-title">Working title</Label><Input id="draft-title" value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="A story worth opening with" className="mt-1.5 rounded-2xl" /></div><div><Label htmlFor="draft-body">First paragraph / hook</Label><Textarea id="draft-body" value={draftBody} onChange={(event) => setDraftBody(event.target.value)} placeholder="Write the first beat…" rows={5} className="mt-1.5 rounded-2xl resize-none" /></div><div className="grid gap-3 sm:grid-cols-2"><select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value as ContentCategory)} className="h-10 rounded-2xl border border-border bg-background px-3 text-xs font-semibold">{CONTENT_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.emoji} {category.label}</option>)}</select><select value={draftRating} onChange={(event) => setDraftRating(event.target.value as ContentRating)} className="h-10 rounded-2xl border border-border bg-background px-3 text-xs font-semibold">{CONTENT_RATING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div><Button onClick={() => void createDraft()} disabled={saving} className="w-full rounded-2xl font-bold"><Plus className="h-4 w-4" /> {saving ? 'Saving…' : 'Save draft'}</Button></div></div><div className="space-y-3">{drafts.length === 0 ? <div className="rounded-3xl border border-dashed border-border/50 p-10 text-center"><FileText className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-bold">Your vault is empty.</p><p className="mt-1 text-xs text-muted-foreground">Capture the rough idea before it disappears.</p></div> : drafts.map((draft) => <div key={draft.id} className="surface-1 rounded-2xl border border-border/40 p-4"><div className="flex items-start justify-between gap-3"><div><ContentCategoryBadge value={payloadString(draft, 'category')} /><h3 className="mt-2 text-sm font-bold">{payloadString(draft, 'title', 'Untitled draft')}</h3><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{payloadString(draft, 'body')}</p></div><button onClick={() => void removeItem(draft)} className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete draft"><X className="h-4 w-4" /></button></div><p className="mt-3 text-[0.62rem] text-muted-foreground">Saved {formatDate(draft.updatedAt)}</p></div>)}</div></div>}

            {creatorTab === 'schedule' && <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-5 flex items-center gap-2"><CalendarClock className="h-4 w-4 text-accent" /><h3 className="font-display font-bold">Reserve a publishing slot</h3></div><div className="space-y-4"><div><Label htmlFor="schedule-title">Title</Label><Input id="schedule-title" value={scheduleTitle} onChange={(event) => setScheduleTitle(event.target.value)} placeholder="Drop title" className="mt-1.5 rounded-2xl" /></div><div><Label htmlFor="schedule-at">Go live at</Label><Input id="schedule-at" type="datetime-local" value={scheduleAt} onChange={(event) => setScheduleAt(event.target.value)} className="mt-1.5 rounded-2xl" /></div><select value={scheduleCategory} onChange={(event) => setScheduleCategory(event.target.value as ContentCategory)} className="h-10 w-full rounded-2xl border border-border bg-background px-3 text-xs font-semibold">{CONTENT_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.emoji} {category.label}</option>)}</select><Button onClick={() => void createSchedule()} disabled={saving} className="w-full rounded-2xl font-bold"><CalendarClock className="h-4 w-4" /> Reserve slot</Button><p className="text-[0.68rem] leading-relaxed text-muted-foreground">Scheduling is persisted to your Creator Workspace. The production worker can use these slots to publish automatically once enabled.</p></div></div><div className="space-y-3">{scheduled.length === 0 ? <div className="rounded-3xl border border-dashed border-border/50 p-10 text-center"><CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-bold">No publishing slots yet.</p></div> : scheduled.map((item) => <div key={item.id} className="surface-1 flex items-center justify-between gap-3 rounded-2xl border border-border/40 p-4"><div><ContentCategoryBadge value={payloadString(item, 'category')} /><h3 className="mt-2 text-sm font-bold">{payloadString(item, 'title')}</h3><p className="mt-1 text-xs text-muted-foreground">{formatDate(payloadString(item, 'scheduledFor'))}</p></div><button onClick={() => void removeItem(item)} className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Cancel publishing slot"><X className="h-4 w-4" /></button></div>)}</div></div>}

            {creatorTab === 'collab' && <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-5 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h3 className="font-display font-bold">Open a collaborator call</h3></div><div className="space-y-4"><div><Label htmlFor="collab-title">Project / series</Label><Input id="collab-title" value={collabTitle} onChange={(event) => setCollabTitle(event.target.value)} placeholder="Campus night radio" className="mt-1.5 rounded-2xl" /></div><div><Label htmlFor="collab-brief">What are you building?</Label><Textarea id="collab-brief" value={collabBrief} onChange={(event) => setCollabBrief(event.target.value)} placeholder="The outcome, vibe, and first milestone…" rows={4} className="mt-1.5 rounded-2xl resize-none" /></div><div><Label htmlFor="collab-role">Looking for</Label><Input id="collab-role" value={collabRole} onChange={(event) => setCollabRole(event.target.value)} className="mt-1.5 rounded-2xl" /></div><Button onClick={() => void createCollaboration()} disabled={saving} className="w-full rounded-2xl font-bold"><Megaphone className="h-4 w-4" /> Publish collaborator call</Button></div></div><div className="space-y-3">{collaborations.length === 0 ? <div className="rounded-3xl border border-dashed border-border/50 p-10 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-bold">No open calls.</p><p className="mt-1 text-xs text-muted-foreground">The right collaborator might be one clear brief away.</p></div> : collaborations.map((item) => <div key={item.id} className="surface-1 rounded-2xl border border-border/40 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.15em] text-primary">Open call</p><h3 className="mt-1 text-sm font-bold">{payloadString(item, 'title')}</h3><p className="mt-1 text-xs text-muted-foreground">{payloadString(item, 'brief')}</p><p className="mt-3 text-xs font-bold">Need: <span className="font-normal text-muted-foreground">{payloadString(item, 'role')}</span></p></div><button onClick={() => void removeItem(item)} className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove collaborator call"><X className="h-4 w-4" /></button></div></div>)}</div></div>}

            {creatorTab === 'analytics' && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Followers" value={(currentUser?.followers ?? 0).toLocaleString()} detail="People in your orbit" icon={Users} /><Metric label="Posts" value={myPosts.length} detail="Categorized feed seeds" icon={FileText} /><Metric label="Reels" value={myVideos.length} detail="Short and standard videos" icon={Radio} /><Metric label="Total resonance" value={totalEngagement.toLocaleString()} detail="Across your current cache" icon={BarChart3} /><div className="surface-1 rounded-3xl border border-border/40 p-6 sm:col-span-2 lg:col-span-4"><div className="mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-400" /><h3 className="font-display font-bold">Telemetry is ready for deeper server aggregation</h3></div><p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">Your workspace already has the creator analytics table and API route. This surface adds a useful local rollup while production telemetry backfills daily views, watch time, followers, and earnings.</p><Link href="/analytics" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary">Open telemetry route <ChevronRight className="h-4 w-4" /></Link></div></div>}
          </section>
        )}

        {panel === 'discovery' && (
          <section className="space-y-6">
            <div className="flex items-end justify-between gap-3"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Category worlds</p><h2 className="mt-1 font-display text-2xl font-black">Find the gravity around your signal.</h2><p className="mt-1 text-sm text-muted-foreground">These counts are real content already visible in your current world.</p></div><Link href="/explore" className="hidden items-center gap-2 rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-bold sm:inline-flex"><Compass className="h-4 w-4" /> Open Explore</Link></div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{categoryCounts.map((category) => <Link href={category.value === 'gaming' ? '/videos' : category.value === 'campus' ? '/pulse' : '/explore'} key={category.value} className="surface-1 rounded-2xl border border-border/40 p-4 transition hover:-translate-y-0.5 hover:border-primary/40"><div className="flex items-start justify-between gap-2"><span className="text-2xl">{category.emoji}</span><span className="font-display text-2xl font-black">{category.count}</span></div><h3 className="mt-3 text-sm font-bold">{category.label}</h3><p className="mt-1 text-[0.68rem] text-muted-foreground">signals in orbit</p></Link>)}</div>
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-5 flex items-center justify-between"><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Collections</p><h2 className="mt-1 font-display text-xl font-black">Build your own signal library.</h2></div><FolderHeart className="h-5 w-5 text-accent" /></div><div className="mb-5 flex gap-2"><Input value={collectionName} onChange={(event) => setCollectionName(event.target.value)} placeholder="New collection name" className="rounded-2xl" /><Button onClick={() => void createCollection()} disabled={saving} className="rounded-2xl"><Plus className="h-4 w-4" /></Button></div><div className="space-y-3">{collections.length === 0 ? <p className="rounded-2xl border border-dashed border-border/50 p-6 text-center text-xs text-muted-foreground">Create a collection like “Exam prep”, “Project fuel”, or “Best campus moments”.</p> : collections.map((item) => { const ids = payloadStringArray(item, 'postIds'); const latest = posts.find((post) => post.id === ids[ids.length - 1]); return <div key={item.id} className="rounded-2xl border border-border/40 bg-background/30 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-bold">{payloadString(item, 'name')}</h3><p className="mt-1 text-xs text-muted-foreground">{ids.length} saved signal{ids.length === 1 ? '' : 's'}</p></div><button onClick={() => void removeItem(item)} className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Delete collection"><X className="h-4 w-4" /></button></div>{latest && <p className="mt-3 line-clamp-1 text-xs text-muted-foreground">Latest: {latest.content}</p>}<Button onClick={() => { const candidate = posts.find((post) => !ids.includes(post.id)); if (candidate) void addPostToCollection(item, candidate); }} variant="outline" size="sm" disabled={!posts.some((post) => !ids.includes(post.id))} className="mt-3 rounded-xl text-xs">Add latest visible post</Button></div>; })}</div></div><div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-5 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><h3 className="font-display font-bold">Smart recommendations</h3></div><p className="text-sm leading-relaxed text-muted-foreground">Your next best category is <strong className="text-foreground">{categoryCounts[0]?.label ?? 'Campus & Community'}</strong>. Keep following that thread or deliberately cross-pollinate with a new world.</p><div className="mt-5 space-y-2">{categoryCounts.slice(0, 4).map((category) => <div key={category.value} className="flex items-center gap-3"><span className="text-lg">{category.emoji}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, category.count * 10 + 8)}%` }} /></div><span className="w-8 text-right text-xs font-bold">{category.count}</span></div>)}</div></div></div>
          </section>
        )}

        {panel === 'trust' && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-6 flex items-center gap-3"><div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', currentUser?.emailVerified ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400')}><ShieldCheck className="h-6 w-6" /></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Identity layer</p><h2 className="font-display text-xl font-black">{currentUser?.emailVerified ? 'Email identity verified' : 'Verify your email identity'}</h2></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-border/40 bg-background/30 p-4"><p className="text-[0.62rem] uppercase tracking-[0.15em] text-muted-foreground">Display name</p><p className="mt-2 text-sm font-bold">{currentUser?.displayName}</p></div><div className="rounded-2xl border border-border/40 bg-background/30 p-4"><p className="text-[0.62rem] uppercase tracking-[0.15em] text-muted-foreground">Username</p><p className="mt-2 text-sm font-bold">@{currentUser?.username}</p></div><div className="rounded-2xl border border-border/40 bg-background/30 p-4"><p className="text-[0.62rem] uppercase tracking-[0.15em] text-muted-foreground">Account email</p><p className="mt-2 truncate text-sm font-bold">{currentUser?.email ?? 'Private'}</p></div><div className="rounded-2xl border border-border/40 bg-background/30 p-4"><p className="text-[0.62rem] uppercase tracking-[0.15em] text-muted-foreground">Public trust</p><p className="mt-2 text-sm font-bold">{currentUser?.verified ? 'Verified creator' : 'Community member'}</p></div></div><div className="mt-5 flex flex-wrap gap-2"><Link href={`/profile/${currentUser?.id}`} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground">View public profile <ChevronRight className="h-4 w-4" /></Link><Link href="/settings" className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-bold">Fix identity or username <ChevronRight className="h-4 w-4" /></Link></div></div>
            <div className="space-y-6"><div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-4 flex items-center gap-2"><Flag className="h-4 w-4 text-rose-400" /><h3 className="font-display font-bold">Transparent enforcement</h3></div><p className="text-sm leading-relaxed text-muted-foreground">Reports, blocks, mutes, content ratings, and grievance tickets have separate paths so safety decisions remain explainable.</p><div className="mt-4 space-y-2"><Link href="/grievance" className="flex items-center justify-between rounded-2xl border border-border/40 px-3 py-2.5 text-xs font-bold">Submit or track a grievance <ChevronRight className="h-4 w-4" /></Link><Link href="/community-guidelines" className="flex items-center justify-between rounded-2xl border border-border/40 px-3 py-2.5 text-xs font-bold">Read community guidelines <ChevronRight className="h-4 w-4" /></Link></div></div><div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h3 className="font-display font-bold">Collaboration graph</h3></div><p className="text-sm leading-relaxed text-muted-foreground">Open calls, projects, and community memberships make your identity useful—not just decorative.</p><Link href="/projects" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary">Open project graph <ChevronRight className="h-4 w-4" /></Link></div></div>
          </section>
        )}

        {panel === 'accessibility' && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-6 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Accessibility className="h-6 w-6" /></div><div><p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Personal access layer</p><h2 className="font-display text-xl font-black">Make the interface work for you.</h2></div></div><div className="space-y-3">{([['largeText', 'Large text', 'Increase reading scale across the whole Yor experience.', largeText], ['highContrast', 'High contrast', 'Increase separation between surfaces, borders, and text.', highContrast], ['reducedMotion', 'Reduced motion', 'Respect a calmer, lower-motion experience.', reducedMotion], ['captions', 'Captions & transcripts', 'Prefer captions whenever media supports them.', captions]] as const).map(([key, label, description, checked]) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/40 bg-background/30 p-4"><input type="checkbox" checked={checked} onChange={(event) => void updateAccessibility(key, event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span className="flex-1"><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span></span>{checked && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}</label>)}</div></div><div className="space-y-6"><div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.16] to-card p-6"><Gauge className="mb-5 h-8 w-8 text-primary" /><h3 className="font-display text-xl font-black">Live preview</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your settings apply instantly to this browser and persist to your Creator Workspace.</p><div className="mt-5 rounded-2xl border border-border/40 bg-background/50 p-4"><p className="text-xs font-bold">Readable by design.</p><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Every feature should be discoverable by keyboard, legible in contrast, and understandable without audio.</p></div></div><div className="surface-1 rounded-3xl border border-border/40 p-6"><div className="mb-4 flex items-center gap-2"><Radio className="h-4 w-4 text-rose-400" /><h3 className="font-display font-bold">Media checklist</h3></div><div className="space-y-2 text-xs text-muted-foreground"><p>✓ Audience rating required before publish</p><p>✓ Category required before publish</p><p>{captions ? '✓' : '○'} Captions preference saved</p><p>○ Transcript generation can be enabled when media processing is connected</p></div></div></div></section>
        )}
      </main>
    </div>
  );
}
