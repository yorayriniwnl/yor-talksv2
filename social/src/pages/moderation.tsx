import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, Flag, Gavel, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';
import { api, type ModerationReport, type ReportModerationEvent, type StaffGrievanceTicket } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTIONS: ModerationReport['status'][] = ['pending', 'reviewed', 'resolved', 'dismissed'];
const GRIEVANCE_STATUS_OPTIONS: StaffGrievanceTicket['status'][] = ['received', 'under_review', 'resolved', 'dismissed'];
type StaffQueue = 'reports' | 'grievances';
type MutationCompletion = { accountId: string; queue: StaffQueue; refresh: boolean };
// Keep an account's case locked even when navigation or authentication remounts
// this page while its server write is still running.
const mutationRequests = new Map<string, { accountId: string; queue: StaffQueue; id: string; request: symbol }>();
const mutationListeners = new Set<(completion?: MutationCompletion) => void>();

function notifyMutationListeners(completion?: MutationCompletion) {
  for (const listener of mutationListeners) listener(completion);
}

function releaseMutation(key: string, request: symbol, completion: MutationCompletion) {
  if (mutationRequests.get(key)?.request !== request) return;
  mutationRequests.delete(key);
  notifyMutationListeners(completion);
}

export default function Moderation() {
  const currentUser = useAppStore((state) => state.currentUser);
  const sessionTokens = useAppStore((state) => state.tokens);
  const isModerator = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const sessionOwner = useRef({ id: currentUser?.id, tokens: sessionTokens, isModerator, revision: 0 });
  if (sessionOwner.current.id !== currentUser?.id || sessionOwner.current.tokens !== sessionTokens || sessionOwner.current.isModerator !== isModerator) {
    sessionOwner.current = { id: currentUser?.id, tokens: sessionTokens, isModerator, revision: sessionOwner.current.revision + 1 };
  }
  const [filter, setFilter] = useState<ModerationReport['status'] | StaffGrievanceTicket['status'] | 'all'>('pending');
  const [queue, setQueue] = useState<'reports' | 'grievances'>('reports');
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [grievances, setGrievances] = useState<StaffGrievanceTicket[]>([]);
  const [officerNotes, setOfficerNotes] = useState<Record<string, string>>({});
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [reportHistory, setReportHistory] = useState<Record<string, ReportModerationEvent[] | null>>({});
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [loadedFor, setLoadedFor] = useState('');
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const historyRequests = useRef(new Map<string, symbol>());
  const viewEpoch = useRef(0);
  const generation = useRef(0);
  const busy = useRef(false);
  const accountId = currentUser?.id ?? '';
  const ownerKey = `${currentUser?.id ?? ''}:${isModerator}:${sessionOwner.current.revision}`;
  const currentView = useRef({ accountId, queue });
  currentView.current = { accountId, queue };
  const viewKey = `${ownerKey}:${queue}:${filter}`;
  const currentKey = useRef(viewKey);
  currentKey.current = viewKey;
  const pendingIds = () => new Set([...mutationRequests.values()]
    .filter(request => request.accountId === currentView.current.accountId && request.queue === currentView.current.queue)
    .map(request => request.id));

  const load = useCallback(async (cursor?: string) => {
    if (!isModerator || cursor && busy.current) return;
    const requestGeneration = ++generation.current;
    busy.current = true;
    if (cursor) setLoadingMore(true);
    else {
      setLoading(true);
      setLoadingMore(false);
      setReports([]);
      setGrievances([]);
      setNextCursor(undefined);
      setLoadedFor(viewKey);
      historyRequests.current.clear();
      setReportHistory({});
      setLoadingHistory(new Set());
    }
    setError('');
    try {
      if (queue === 'reports') {
        const page = await api.getModerationQueuePage(filter === 'all' ? undefined : filter as ModerationReport['status'], cursor);
        if (requestGeneration !== generation.current || currentKey.current !== viewKey) return;
        setReports(previous => cursor ? [...previous, ...page.data.filter(item => !previous.some(existing => existing.id === item.id))] : page.data);
        setNextCursor(page.hasMore ? page.nextCursor : undefined);
      } else {
        const page = await api.getGrievanceQueuePage(filter === 'all' ? undefined : filter as StaffGrievanceTicket['status'], cursor);
        if (requestGeneration !== generation.current || currentKey.current !== viewKey) return;
        setGrievances(previous => cursor ? [...previous, ...page.data.filter(item => !previous.some(existing => existing.id === item.id))] : page.data);
        setNextCursor(page.hasMore ? page.nextCursor : undefined);
      }
    } catch (cause) {
      if (requestGeneration === generation.current && currentKey.current === viewKey) {
        setError(cause instanceof Error ? cause.message : 'The moderation queue could not be loaded.');
      }
    } finally {
      if (requestGeneration === generation.current && currentKey.current === viewKey) {
        busy.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [filter, isModerator, queue, viewKey]);
  const currentLoad = useRef(load);
  currentLoad.current = load;

  useEffect(() => {
    const sync = (completion?: MutationCompletion) => {
      setUpdating(pendingIds());
      if (completion?.refresh && completion.accountId === currentView.current.accountId && completion.queue === currentView.current.queue) {
        // Read through the current session instead of applying an old response.
        void currentLoad.current();
      }
    };
    mutationListeners.add(sync);
    sync();
    return () => { mutationListeners.delete(sync); };
  }, []);

  useEffect(() => {
    setUpdating(pendingIds());
    setOfficerNotes({});
    setDecisionReasons({});
    setReportHistory({});
    setLoadingHistory(new Set());
    void load();
    return () => {
      generation.current++;
      viewEpoch.current++;
      historyRequests.current.clear();
      busy.current = false;
    };
  }, [load]);

  const updateStatus = async (report: ModerationReport, status: ModerationReport['status']) => {
    const mutationKey = `${accountId}:reports:${report.id}`;
    if (mutationRequests.has(mutationKey)) return;
    const finalDecision = status === 'resolved' || status === 'dismissed';
    const decisionReason = (decisionReasons[report.id] ?? report.decisionReason ?? '').trim();
    if (finalDecision && decisionReason.length < 10) return;
    const mutation = Symbol(report.id);
    mutationRequests.set(mutationKey, { accountId, queue: 'reports', id: report.id, request: mutation });
    notifyMutationListeners();
    const key = viewKey;
    const epoch = viewEpoch.current;
    const loadGeneration = generation.current;
    const isCurrent = () => currentKey.current === key && viewEpoch.current === epoch && generation.current === loadGeneration;
    historyRequests.current.delete(report.id);
    setLoadingHistory(previous => { const next = new Set(previous); next.delete(report.id); return next; });
    setReportHistory(previous => { const next = { ...previous }; delete next[report.id]; return next; });
    setUpdating(previous => new Set(previous).add(report.id));
    try {
      const updated = await api.updateReportStatus(report.id, status, finalDecision ? decisionReason : undefined);
      if (!isCurrent()) return;
      setReports(previous => previous.flatMap(item => item.id !== report.id ? [item] : filter === 'all' || updated.status === filter ? [updated] : []));
      if (finalDecision) setDecisionReasons(previous => {
        if (previous[report.id] !== undefined && previous[report.id].trim() !== decisionReason) return previous;
        const next = { ...previous }; delete next[report.id]; return next;
      });
      setReportHistory(previous => { const next = { ...previous }; delete next[report.id]; return next; });
      toast.success(`Report marked ${status}`);
    } catch (cause) {
      if (isCurrent()) toast.error(cause instanceof Error ? cause.message : 'Could not update report');
    } finally {
      releaseMutation(mutationKey, mutation, { accountId, queue: 'reports', refresh: !isCurrent() });
    }
  };

  const updateGrievance = async (ticket: StaffGrievanceTicket, status: StaffGrievanceTicket['status']) => {
    const mutationKey = `${accountId}:grievances:${ticket.id}`;
    if (mutationRequests.has(mutationKey)) return;
    const mutation = Symbol(ticket.id);
    mutationRequests.set(mutationKey, { accountId, queue: 'grievances', id: ticket.id, request: mutation });
    notifyMutationListeners();
    const key = viewKey;
    const epoch = viewEpoch.current;
    const loadGeneration = generation.current;
    const isCurrent = () => currentKey.current === key && viewEpoch.current === epoch && generation.current === loadGeneration;
    setUpdating(previous => new Set(previous).add(ticket.id));
    try {
      const updated = await api.updateGrievanceStatus(ticket.ticketId, status, officerNotes[ticket.id] ?? ticket.officerNote ?? '');
      if (!isCurrent()) return;
      setGrievances(previous => previous.flatMap(item => item.id !== ticket.id ? [item] : filter === 'all' || updated.status === filter ? [updated] : []));
      toast.success(`Grievance marked ${status.replaceAll('_', ' ')}`);
    } catch (cause) {
      if (isCurrent()) toast.error(cause instanceof Error ? cause.message : 'Could not update grievance');
    } finally {
      releaseMutation(mutationKey, mutation, { accountId, queue: 'grievances', refresh: !isCurrent() });
    }
  };

  const loadReportHistory = async (reportId: string) => {
    if (mutationRequests.has(`${accountId}:reports:${reportId}`) || historyRequests.current.has(reportId)) return;
    const key = viewKey;
    const epoch = viewEpoch.current;
    const request = Symbol(reportId);
    historyRequests.current.set(reportId, request);
    const isCurrent = () => currentKey.current === key && viewEpoch.current === epoch && historyRequests.current.get(reportId) === request;
    setLoadingHistory(previous => new Set(previous).add(reportId));
    try {
      const history = await api.getReportModerationHistory(reportId);
      if (isCurrent()) setReportHistory(previous => ({ ...previous, [reportId]: history }));
    } catch (cause) {
      if (isCurrent()) toast.error(cause instanceof Error ? cause.message : 'Could not load decision history');
    } finally {
      if (isCurrent()) {
        historyRequests.current.delete(reportId);
        setLoadingHistory(previous => { const next = new Set(previous); next.delete(reportId); return next; });
      }
    }
  };

  const visibleReports = loadedFor === viewKey ? reports : [];
  const visibleGrievances = loadedFor === viewKey ? grievances : [];
  const initialLoading = loading || loadedFor !== viewKey;
  const statuses = queue === 'reports' ? (['all', ...STATUS_OPTIONS] as const) : (['all', ...GRIEVANCE_STATUS_OPTIONS] as const);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3"><Gavel className="h-5 w-5 text-primary" /><div><h1 className="font-display text-xl font-black">Moderation</h1><p className="text-xs text-muted-foreground">Review and track reports</p></div></div>
          {isModerator && <Button variant="outline" onClick={() => void load()} disabled={initialLoading || loadingMore}><RefreshCw className={initialLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh</Button>}
        </div>
      </header>
      <section aria-label="Moderation command" className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {currentUser?.role === 'admin' && <Link href="/payment-operations" className="text-primary underline">Payment operations and dispute review</Link>}
        {!isModerator ? <div className="rounded-3xl border border-border p-6"><ShieldAlert className="h-5 w-5" /><h2 className="mt-3 font-bold">Moderator access required</h2><p className="mt-2 text-sm text-muted-foreground">Only appointed moderators can inspect this queue or update report status.</p><Link href="/grievance" className="mt-3 inline-block text-primary underline">Open public grievance portal</Link></div> : <>
          <div role="group" aria-label="Staff queue" className="flex gap-2 overflow-x-auto pb-1">
            {(['reports', 'grievances'] as const).map(kind => <button key={kind} aria-pressed={queue === kind} onClick={() => { setQueue(kind); setFilter(kind === 'reports' ? 'pending' : 'received'); }} className={cn('rounded-2xl border px-3.5 py-2 text-xs font-bold capitalize', queue === kind ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40 text-muted-foreground hover:text-foreground')}>{kind}</button>)}
          </div>
          <div role="group" aria-label="Queue status" className="flex gap-2 overflow-x-auto pb-1">
            {statuses.map(status => <button key={status} aria-pressed={filter === status} onClick={() => setFilter(status as typeof filter)} className={cn('rounded-2xl border px-3.5 py-2 text-xs font-bold capitalize', filter === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40 text-muted-foreground hover:text-foreground')}>{status.replaceAll('_', ' ')}</button>)}
          </div>
          {error && loadedFor === viewKey && <div role="alert" className="rounded-2xl border border-destructive/30 p-4 text-sm"><p>{error}</p><Button className="mt-3" variant="outline" onClick={() => void load(nextCursor)}>Retry</Button></div>}
          <section aria-label={queue === 'reports' ? 'Reports' : 'Grievances'} aria-busy={initialLoading || loadingMore} className="space-y-3">
            {initialLoading ? <div role="status" className="flex justify-center gap-2 py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /> Loading {queue}…</div> : (queue === 'reports' ? visibleReports.length === 0 : visibleGrievances.length === 0) && !error ? <div className="rounded-3xl border border-dashed border-border/50 p-12 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400/50" /><p className="mt-3 text-sm font-bold">{nextCursor ? `No matching ${queue} remain on this page.` : `No ${queue} match this state.`}</p></div> : queue === 'reports' ? visibleReports.map(report => <article key={report.id} className="surface-1 rounded-3xl border border-border/40 p-5">
              <div className="flex items-start gap-3"><Flag className="mt-1 h-4 w-4 shrink-0 text-rose-400" /><div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold">{report.reason.replaceAll('_', ' ')}</h2><span className="text-xs text-muted-foreground">{report.entityType} · {report.status}</span></div>
                <p className="mt-2 break-words text-xs text-muted-foreground">Entity: <code>{report.entityId}</code> · Filed {new Date(report.createdAt).toLocaleString()}</p>
                {report.details && <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-border/30 p-3 text-sm">{report.details}</p>}
                <label className="mt-4 block text-xs font-bold" htmlFor={`decision-reason-${report.id}`}>Decision reason (required to resolve or dismiss)</label>
                <textarea id={`decision-reason-${report.id}`} maxLength={2000} disabled={updating.has(report.id)} value={decisionReasons[report.id] ?? report.decisionReason ?? ''} onChange={event => setDecisionReasons(previous => ({ ...previous, [report.id]: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm" />
                <p className="mt-1 text-xs text-muted-foreground">Final decisions need at least 10 characters. This staff-only reason is retained with the case history.</p>
                <div className="mt-4 flex flex-wrap gap-2">{STATUS_OPTIONS.map(status => {
                  const finalDecision = status === 'resolved' || status === 'dismissed';
                  const reason = (decisionReasons[report.id] ?? report.decisionReason ?? '').trim();
                  return <Button key={status} size="sm" variant={status === report.status ? 'default' : 'outline'} onClick={() => void updateStatus(report, status)} disabled={updating.has(report.id) || status === report.status || finalDecision && reason.length < 10} className="rounded-xl text-xs capitalize">{status}</Button>;
                })}</div>
                <Button size="sm" variant="ghost" onClick={() => void loadReportHistory(report.id)} disabled={loadingHistory.has(report.id) || updating.has(report.id)} className="mt-2 rounded-xl text-xs">
                  {loadingHistory.has(report.id) ? 'Loading history…' : reportHistory[report.id] === undefined ? 'View decision history' : 'Refresh decision history'}
                </Button>
                {reportHistory[report.id] && <ol aria-label="Report decision history" className="mt-2 space-y-2 border-l border-border pl-4 text-xs">
                  {reportHistory[report.id]!.length === 0 ? <li className="text-muted-foreground">No staff status changes yet.</li> : reportHistory[report.id]!.map(event => <li key={event.id}>
                    <p className="font-semibold">{event.fromStatus ?? 'new'} → {event.toStatus} · {new Date(event.createdAt).toLocaleString()}</p>
                    {event.decisionReason && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{event.decisionReason}</p>}
                  </li>)}
                </ol>}
              </div></div>
            </article>) : visibleGrievances.map(ticket => <article key={ticket.id} className="surface-1 rounded-3xl border border-border/40 p-5">
              <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{ticket.category.replaceAll('_', ' ')}</h2><span className="text-xs text-muted-foreground">{ticket.status.replaceAll('_', ' ')} · {ticket.ticketId}</span></div>
              <p className="mt-2 break-all text-xs text-muted-foreground">{ticket.reportedUrl} · Filed {new Date(ticket.createdAt).toLocaleString()}</p>
              <p className="mt-3 text-sm font-semibold">Reporter: {ticket.reporterName} · {ticket.reporterEmail}</p>
              <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-border/30 p-3 text-sm">{ticket.description}</p>
              {ticket.officerNote && <p className="mt-3 whitespace-pre-wrap break-words text-sm"><strong>Internal note:</strong> {ticket.officerNote}</p>}
              <label className="mt-3 block text-xs font-bold" htmlFor={`officer-note-${ticket.id}`}>Internal case note</label>
              <textarea id={`officer-note-${ticket.id}`} maxLength={5000} value={officerNotes[ticket.id] ?? ticket.officerNote ?? ''} onChange={event => setOfficerNotes(previous => ({ ...previous, [ticket.id]: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm" />
              <Button size="sm" variant="outline" onClick={() => void updateGrievance(ticket, ticket.status)} disabled={updating.has(ticket.id)} className="mt-2 rounded-xl">{updating.has(ticket.id) ? 'Saving…' : 'Save internal note'}</Button>
              <div className="mt-4 flex flex-wrap gap-2">{GRIEVANCE_STATUS_OPTIONS.map(status => <Button key={status} size="sm" variant={status === ticket.status ? 'default' : 'outline'} onClick={() => void updateGrievance(ticket, status)} disabled={updating.has(ticket.id) || status === ticket.status} className="rounded-xl text-xs capitalize">{status.replaceAll('_', ' ')}</Button>)}</div>
            </article>)}
          </section>
          {!initialLoading && nextCursor && <Button variant="outline" onClick={() => void load(nextCursor)} disabled={loadingMore}>{loadingMore ? 'Loading…' : `Load older ${queue}`}</Button>}
        </>}
      </section>
    </div>
  );
}
