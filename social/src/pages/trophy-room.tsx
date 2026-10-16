import { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, Lock, Share2, Sparkles, TrendingUp, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, type BackendAchievement } from '@/lib/api-client';
import { toast } from 'sonner';

const achievementIcons = { Sparkles, TrendingUp, Users } as const;

export default function TrophyRoom() {
  const [achievements, setAchievements] = useState<BackendAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(() => achievements.find((item) => item.id === selectedId) ?? achievements[0] ?? null,
    [achievements, selectedId]);
  const unlocked = achievements.filter((item) => item.unlocked);

  const loadAchievements = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const result = await api.getAchievements();
      setAchievements(result);
      setSelectedId((current) => current && result.some((item) => item.id === current) ? current : result[0]?.id ?? null);
    } catch {
      setFailed(true);
      setAchievements([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadAchievements(); }, []);

  const copySummary = async () => {
    if (!unlocked.length) return;
    const summary = `My Yor Talks achievements\n${unlocked.map((item) => `• ${item.title}: ${item.description}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(summary);
      toast.success('Achievement summary copied');
    } catch {
      toast.error('Could not copy the achievement summary on this device');
    }
  };

  return (
    <main className="min-h-screen bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400"><Trophy className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">Achievements</h1>
            <p className="text-xs text-muted-foreground">Progress from your Yor Talks account</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => void copySummary()} disabled={unlocked.length === 0}>
          <Share2 className="mr-1.5 h-4 w-4" /> Copy unlocked summary
        </Button>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        {loading && <p role="status" className="rounded-2xl border border-border/40 p-5 text-sm text-muted-foreground">Loading achievements…</p>}
        {failed && <section role="alert" className="rounded-2xl border border-border/40 p-5">
          <p className="text-sm text-muted-foreground">Achievements could not be loaded.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void loadAchievements()}>Try again</Button>
        </section>}
        {!loading && !failed && achievements.length === 0 && <section className="rounded-2xl border border-border/40 p-8 text-center">
          <Trophy aria-hidden="true" className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No achievements are available yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your account progress will appear here when achievement tracking is available.</p>
        </section>}

        {!loading && !failed && selected && <>
          <section aria-labelledby="selected-achievement" className="surface-1 grid gap-5 rounded-3xl border border-border/40 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400">
                <AchievementIcon name={selected.icon} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{selected.unlocked ? 'Unlocked achievement' : 'Achievement progress'}</p>
                <h2 id="selected-achievement" className="mt-1 text-xl font-bold">{selected.title}</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{selected.description}</p>
                <p className="mt-3 text-xs text-muted-foreground">{selected.unlocked ? 'Completed' : `${Math.max(0, selected.progress)} of ${selected.goal}`}</p>
                <div className="mt-2 h-2 w-full max-w-md overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={`${selected.title} progress`}
                  aria-valuemin={0} aria-valuemax={Math.max(1, selected.goal)} aria-valuenow={Math.min(Math.max(0, selected.progress), selected.goal)}>
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, Math.max(0, selected.progress / Math.max(1, selected.goal) * 100))}%` }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border/40 px-4 py-3 text-sm">
              {selected.unlocked ? <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-500" /> : <Lock aria-hidden="true" className="h-5 w-5 text-muted-foreground" />}
              <span>{selected.xp} XP</span>
            </div>
          </section>

          <section aria-labelledby="achievement-list-heading" className="space-y-3">
            <h2 id="achievement-list-heading" className="text-lg font-bold">Your achievements</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {achievements.map((item) => (
                <button key={item.id} type="button" aria-pressed={selected.id === item.id} onClick={() => setSelectedId(item.id)}
                  className="surface-1 flex items-center gap-3 rounded-2xl border border-border/40 p-4 text-left transition-colors hover:border-primary/50 aria-pressed:border-primary/60">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary"><AchievementIcon name={item.icon} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{item.title}</span>
                    <span className="block text-xs text-muted-foreground">{item.unlocked ? 'Unlocked' : `${Math.max(0, item.progress)} / ${item.goal}`}</span>
                  </span>
                  {item.unlocked ? <CheckCircle2 aria-label="Unlocked" className="h-4 w-4 shrink-0 text-emerald-500" /> : <Lock aria-label="Locked" className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </section>
        </>}
      </div>
    </main>
  );
}

function AchievementIcon({ name }: { name: string }) {
  const Icon = name in achievementIcons ? achievementIcons[name as keyof typeof achievementIcons] : Award;
  return <Icon aria-hidden="true" className="h-5 w-5" />;
}
