import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, Flag, Gavel, Loader2, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { api, type ModerationReport } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTIONS: ModerationReport['status'][] = ['pending', 'reviewed', 'resolved', 'dismissed'];

export default function Moderation() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [filter, setFilter] = useState<ModerationReport['status'] | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setReports(await api.getModerationQueue());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Moderator access is required');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const visibleReports = useMemo(() => filter === 'all' ? reports : reports.filter((report) => report.status === filter), [filter, reports]);

  const updateStatus = async (report: ModerationReport, status: ModerationReport['status']) => {
    try {
      const updated = await api.updateReportStatus(report.id, status);
      setReports((current) => current.map((item) => item.id === report.id ? updated : item));
      toast.success(`Report marked ${status}`);
    } catch (updateError) {
      toast.error(updateError instanceof Error ? updateError.message : 'Could not update report');
    }
  };

  const isModerator = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <div className="sticky top-0 z-30 border-b border-border/40 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-6"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400"><Gavel className="h-5 w-5" /></div><div><h1 className="font-display text-xl font-black">Moderation Command</h1><p className="text-[0.68rem] text-muted-foreground">Review reports with a visible, accountable state machine</p></div></div><Button variant="outline" onClick={() => void load()} disabled={loading} className="rounded-2xl text-xs font-bold"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh</Button></div></div>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {!isModerator && <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><div><h2 className="font-display font-bold">Moderator access required</h2><p className="mt-1 text-sm leading-relaxed text-amber-100/80">This queue is server-protected. Regular users can still submit reports and track grievances, but only appointed moderators can inspect the queue or change enforcement status.</p><Link href="/grievance" className="mt-3 inline-flex text-xs font-bold text-amber-200">Open public grievance portal →</Link></div></div></div>}
        {error && isModerator && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
        {isModerator && <><div className="flex gap-2 overflow-x-auto pb-1">{(['all', ...STATUS_OPTIONS] as const).map((status) => <button key={status} onClick={() => setFilter(status)} className={cn('rounded-2xl border px-3.5 py-2 text-xs font-bold capitalize', filter === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40 text-muted-foreground hover:text-foreground')}>{status} {status === 'all' ? `(${reports.length})` : `(${reports.filter((report) => report.status === status).length})`}</button>)}</div><section className="space-y-3">{loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : visibleReports.length === 0 ? <div className="rounded-3xl border border-dashed border-border/50 p-12 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400/50" /><p className="mt-3 text-sm font-bold">Queue is clear.</p><p className="mt-1 text-xs text-muted-foreground">No reports match this state.</p></div> : visibleReports.map((report) => <article key={report.id} className="surface-1 rounded-3xl border border-border/40 p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-start gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400"><Flag className="h-4 w-4" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold">{report.reason.replaceAll('_', ' ')}</h2><span className="rounded-full border border-border/40 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{report.entityType}</span><span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-primary">{report.status}</span></div><p className="mt-2 text-xs text-muted-foreground">Entity: <code>{report.entityId}</code> · Filed {new Date(report.createdAt).toLocaleString()}</p>{report.details && <p className="mt-3 max-w-3xl rounded-2xl border border-border/30 bg-background/30 p-3 text-sm leading-relaxed">{report.details}</p>}</div></div><div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[18rem] sm:justify-end">{STATUS_OPTIONS.map((status) => <Button key={status} size="sm" variant={status === report.status ? 'default' : 'outline'} onClick={() => void updateStatus(report, status)} disabled={status === report.status} className="rounded-xl text-[0.65rem] capitalize">{status === 'resolved' ? <CheckCircle2 className="h-3 w-3" /> : status === 'dismissed' ? <XCircle className="h-3 w-3" /> : null}{status}</Button>)}</div></div></article>)}</section></>}
      </main>
    </div>
  );
}
