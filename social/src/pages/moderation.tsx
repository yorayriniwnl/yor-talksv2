import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, Flag, Gavel, Loader2, RefreshCw, ShieldAlert, AlertTriangle, Undo2, ArrowUpRight } from 'lucide-react';
import {
  api,
  type ModerationReport,
  type ReportModerationEvent,
  type StaffGrievanceTicket,
  type ModerationDecision,
  type ModerationAppeal,
} from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTIONS: ModerationReport['status'][] = ['pending', 'reviewed', 'resolved', 'dismissed'];
const GRIEVANCE_STATUS_OPTIONS: StaffGrievanceTicket['status'][] = ['received', 'under_review', 'resolved', 'dismissed'];
const APPEAL_STATUS_OPTIONS: ModerationAppeal['status'][] = ['pending', 'under_review', 'upheld', 'reversed', 'rejected'];

type StaffQueue = 'reports' | 'grievances' | 'appeals';
type MutationCompletion = { accountId: string; queue: StaffQueue; refresh: boolean };

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

  const [filter, setFilter] = useState<string>('pending');
  const [queue, setQueue] = useState<StaffQueue>('reports');
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [grievances, setGrievances] = useState<StaffGrievanceTicket[]>([]);
  const [appeals, setAppeals] = useState<ModerationAppeal[]>([]);

  // Form states for reports
  const [officerNotes, setOfficerNotes] = useState<Record<string, string>>({});
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const [decisionActions, setDecisionActions] = useState<Record<string, 'no_action' | 'restrict' | 'remove' | 'restore'>>({});
  const [decisionScopes, setDecisionScopes] = useState<Record<string, 'global' | 'public' | 'direct_only'>>({});
  const [decisionRationales, setDecisionRationales] = useState<Record<string, string>>({});
  const [decisionInternalNotes, setDecisionInternalNotes] = useState<Record<string, string>>({});

  // History & active enforcement
  const [reportHistory, setReportHistory] = useState<Record<string, ReportModerationEvent[] | null>>({});
  const [activeEnforcements, setActiveEnforcements] = useState<Record<string, any>>({});
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());

  // Appeal review forms
  const [appealReviewOutcomes, setAppealReviewOutcomes] = useState<Record<string, 'upheld' | 'reversed' | 'rejected'>>({});
  const [appealReviewNotes, setAppealReviewNotes] = useState<Record<string, string>>({});
  const [appealReviewRationales, setAppealReviewRationales] = useState<Record<string, string>>({});

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
    if (!isModerator || (cursor && busy.current)) return;
    const requestGeneration = ++generation.current;
    busy.current = true;
    if (cursor) setLoadingMore(true);
    else {
      setLoading(true);
      setLoadingMore(false);
      setReports([]);
      setGrievances([]);
      setAppeals([]);
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

        // Fetch enforcements for loaded reports
        for (const report of page.data) {
          void api.getModerationEnforcement(report.entityType, report.entityId)
            .then(enf => setActiveEnforcements(prev => ({ ...prev, [`${report.entityType}:${report.entityId}`]: enf })))
            .catch(() => {});
        }
      } else if (queue === 'grievances') {
        const page = await api.getGrievanceQueuePage(filter === 'all' ? undefined : filter as StaffGrievanceTicket['status'], cursor);
        if (requestGeneration !== generation.current || currentKey.current !== viewKey) return;
        setGrievances(previous => cursor ? [...previous, ...page.data.filter(item => !previous.some(existing => existing.id === item.id))] : page.data);
        setNextCursor(page.hasMore ? page.nextCursor : undefined);
      } else if (queue === 'appeals') {
        const list = await api.getModerationAppeals(filter === 'all' ? undefined : filter, 50);
        if (requestGeneration !== generation.current || currentKey.current !== viewKey) return;
        setAppeals(list);
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
    setDecisionActions({});
    setDecisionScopes({});
    setDecisionRationales({});
    setDecisionInternalNotes({});
    setAppealReviewOutcomes({});
    setAppealReviewNotes({});
    setAppealReviewRationales({});
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

  // Execute Substantive Moderation Decision
  const handleEnforceDecision = async (report: ModerationReport) => {
    const action = decisionActions[report.id] ?? 'no_action';
    const scope = decisionScopes[report.id] ?? 'global';
    const rationale = (decisionRationales[report.id] ?? '').trim();
    const internalNotes = (decisionInternalNotes[report.id] ?? '').trim() || undefined;

    if (rationale.length < 10) {
      toast.error('Rationale must be at least 10 characters long.');
      return;
    }

    const mutationKey = `${accountId}:reports:${report.id}`;
    if (mutationRequests.has(mutationKey)) return;
    const mutation = Symbol(report.id);
    mutationRequests.set(mutationKey, { accountId, queue: 'reports', id: report.id, request: mutation });
    notifyMutationListeners();
    setUpdating(prev => new Set(prev).add(report.id));

    try {
      await api.recordModerationDecision({
        targetType: report.entityType,
        targetId: report.entityId,
        action,
        scope,
        rationale,
        internalNotes,
        reportId: report.id,
      });

      toast.success(`Enforced decision '${action}' on ${report.entityType} ${report.entityId}`);
      void load();
    } catch (cause: any) {
      toast.error(cause instanceof Error ? cause.message : 'Could not enforce moderation decision');
    } finally {
      releaseMutation(mutationKey, mutation, { accountId, queue: 'reports', refresh: true });
    }
  };

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

  const handleReviewAppeal = async (appeal: ModerationAppeal) => {
    const outcome = appealReviewOutcomes[appeal.id] ?? 'upheld';
    const reviewerNotes = (appealReviewNotes[appeal.id] ?? '').trim();
    const rationale = (appealReviewRationales[appeal.id] ?? '').trim() || undefined;

    if (reviewerNotes.length < 10) {
      toast.error('Reviewer notes must be at least 10 characters long.');
      return;
    }
    if (outcome === 'reversed' && (!rationale || rationale.length < 10)) {
      toast.error('Restoration rationale must be at least 10 characters when reversing an enforcement.');
      return;
    }

    const mutationKey = `${accountId}:appeals:${appeal.id}`;
    if (mutationRequests.has(mutationKey)) return;
    const mutation = Symbol(appeal.id);
    mutationRequests.set(mutationKey, { accountId, queue: 'appeals', id: appeal.id, request: mutation });
    notifyMutationListeners();
    setUpdating(prev => new Set(prev).add(appeal.id));

    try {
      await api.reviewModerationAppeal(appeal.id, {
        outcome,
        reviewerNotes,
        rationale,
      });
      toast.success(`Appeal review recorded: ${outcome}`);
      void load();
    } catch (cause: any) {
      toast.error(cause instanceof Error ? cause.message : 'Could not record appeal review');
    } finally {
      releaseMutation(mutationKey, mutation, { accountId, queue: 'appeals', refresh: true });
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
  const visibleAppeals = loadedFor === viewKey ? appeals : [];
  const initialLoading = loading || loadedFor !== viewKey;

  const statuses = queue === 'reports'
    ? (['all', ...STATUS_OPTIONS] as const)
    : queue === 'grievances'
    ? (['all', ...GRIEVANCE_STATUS_OPTIONS] as const)
    : (['all', ...APPEAL_STATUS_OPTIONS] as const);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Gavel className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-display text-xl font-black">Moderation & Enforcement Command</h1>
              <p className="text-xs text-muted-foreground">Attributable rulings, enforcements, and appeal reviews</p>
            </div>
          </div>
          {isModerator && (
            <Button variant="outline" onClick={() => void load()} disabled={initialLoading || loadingMore}>
              <RefreshCw className={initialLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
            </Button>
          )}
        </div>
      </header>

      <section aria-label="Moderation command" className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {currentUser?.role === 'admin' && (
          <Link href="/payment-operations" className="text-primary underline">Payment operations and dispute review</Link>
        )}

        {!isModerator ? (
          <div className="rounded-3xl border border-border p-6">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="mt-3 font-bold">Moderator access required</h2>
            <p className="mt-2 text-sm text-muted-foreground">Only appointed moderators can inspect this queue, issue enforcements, or review appeals.</p>
            <Link href="/grievance" className="mt-3 inline-block text-primary underline">Open public grievance & notice portal</Link>
          </div>
        ) : (
          <>
            {/* Queue selection: reports, grievances, appeals */}
            <div role="group" aria-label="Staff queue" className="flex gap-2 overflow-x-auto pb-1">
              {(['reports', 'grievances', 'appeals'] as const).map(kind => (
                <button
                  key={kind}
                  aria-pressed={queue === kind}
                  onClick={() => {
                    setQueue(kind);
                    setFilter(kind === 'reports' ? 'pending' : kind === 'grievances' ? 'received' : 'pending');
                  }}
                  className={cn(
                    'rounded-2xl border px-3.5 py-2 text-xs font-bold capitalize',
                    queue === kind ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {kind}
                </button>
              ))}
            </div>

            {/* Status filters */}
            <div role="group" aria-label="Queue status" className="flex gap-2 overflow-x-auto pb-1">
              {statuses.map(status => (
                <button
                  key={status}
                  aria-pressed={filter === status}
                  onClick={() => setFilter(status)}
                  className={cn(
                    'rounded-2xl border px-3.5 py-2 text-xs font-bold capitalize',
                    filter === status ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {status.replaceAll('_', ' ')}
                </button>
              ))}
            </div>

            {error && loadedFor === viewKey && (
              <div role="alert" className="rounded-2xl border border-destructive/30 p-4 text-sm">
                <p>{error}</p>
                <Button className="mt-3" variant="outline" onClick={() => void load(nextCursor)}>Retry</Button>
              </div>
            )}

            <section aria-label={queue} aria-busy={initialLoading || loadingMore} className="space-y-4">
              {initialLoading ? (
                <div role="status" className="flex justify-center gap-2 py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" /> Loading {queue}…
                </div>
              ) : queue === 'reports' ? (
                visibleReports.length === 0 && !error ? (
                  <div className="rounded-3xl border border-dashed border-border/50 p-12 text-center">
                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400/50" />
                    <p className="mt-3 text-sm font-bold">No reports match this state.</p>
                  </div>
                ) : (
                  visibleReports.map(report => {
                    const enfKey = `${report.entityType}:${report.entityId}`;
                    const currentEnforcement = activeEnforcements[enfKey];
                    const selectedAction = decisionActions[report.id] ?? 'no_action';
                    const rationale = decisionRationales[report.id] ?? '';

                    return (
                      <article key={report.id} className="surface-1 rounded-3xl border border-border/40 p-5 space-y-4">
                        <div className="flex items-start gap-3">
                          <Flag className="mt-1 h-4 w-4 shrink-0 text-rose-400" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-sm font-bold">{report.reason.replaceAll('_', ' ')}</h2>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-mono">
                                {report.entityType}
                              </span>
                              <span className="text-xs text-muted-foreground">· case: {report.status}</span>
                              {currentEnforcement && (
                                <span className={cn(
                                  "text-xs px-2 py-0.5 rounded-full font-bold uppercase",
                                  currentEnforcement.state === 'removed' ? 'bg-destructive/20 text-destructive' : 'bg-amber-500/20 text-amber-500'
                                )}>
                                  Enforcement: {currentEnforcement.state} ({currentEnforcement.scope})
                                </span>
                              )}
                            </div>

                            <p className="mt-2 break-words text-xs text-muted-foreground">
                              Target ID: <code className="font-mono bg-muted px-1 py-0.5 rounded">{report.entityId}</code> · Filed {new Date(report.createdAt).toLocaleString()}
                            </p>

                            {report.details && (
                              <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-border/30 p-3 text-sm">
                                {report.details}
                              </p>
                            )}

                            {/* Substantive Enforcement Action Section */}
                            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                              <h3 className="text-xs font-black uppercase tracking-wider text-primary">Substantive Moderation Decision</h3>
                              <p className="text-xs text-muted-foreground">
                                Execute an explicit ruling that enforces restrictions across feeds, reads, media, and search.
                              </p>

                              <div className="flex flex-wrap gap-2">
                                {(['no_action', 'restrict', 'remove', 'restore'] as const).map(action => (
                                  <Button
                                    key={action}
                                    size="sm"
                                    type="button"
                                    variant={selectedAction === action ? 'default' : 'outline'}
                                    onClick={() => setDecisionActions(prev => ({ ...prev, [report.id]: action }))}
                                    className="rounded-xl text-xs capitalize"
                                  >
                                    {action.replaceAll('_', ' ')}
                                  </Button>
                                ))}
                              </div>

                              {(selectedAction === 'restrict' || selectedAction === 'remove') && (
                                <div className="flex items-center gap-2 pt-1">
                                  <span className="text-xs font-semibold">Scope:</span>
                                  {(['global', 'public', 'direct_only'] as const).map(scope => (
                                    <Button
                                      key={scope}
                                      size="sm"
                                      type="button"
                                      variant={(decisionScopes[report.id] ?? 'global') === scope ? 'secondary' : 'ghost'}
                                      onClick={() => setDecisionScopes(prev => ({ ...prev, [report.id]: scope }))}
                                      className="rounded-lg text-xs capitalize h-7 px-2.5"
                                    >
                                      {scope.replaceAll('_', ' ')}
                                    </Button>
                                  ))}
                                </div>
                              )}

                              <div>
                                <label className="block text-xs font-bold" htmlFor={`rationale-${report.id}`}>
                                  Decision Rationale (min 10 chars, safe projection provided to affected party)
                                </label>
                                <textarea
                                  id={`rationale-${report.id}`}
                                  maxLength={5000}
                                  disabled={updating.has(report.id)}
                                  placeholder="Document reason for moderation action (at least 10 chars)..."
                                  value={rationale}
                                  onChange={e => setDecisionRationales(prev => ({ ...prev, [report.id]: e.target.value }))}
                                  className="mt-1 min-h-16 w-full rounded-xl border border-border bg-background p-2.5 text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-muted-foreground" htmlFor={`internal-notes-${report.id}`}>
                                  Internal Staff Notes (staff-only, never exposed to author or reporter)
                                </label>
                                <input
                                  id={`internal-notes-${report.id}`}
                                  type="text"
                                  disabled={updating.has(report.id)}
                                  placeholder="Internal notes (optional)..."
                                  value={decisionInternalNotes[report.id] ?? ''}
                                  onChange={e => setDecisionInternalNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                                  className="mt-1 w-full rounded-xl border border-border bg-background p-2 text-xs"
                                />
                              </div>

                              <Button
                                size="sm"
                                onClick={() => void handleEnforceDecision(report)}
                                disabled={updating.has(report.id) || rationale.trim().length < 10}
                                className="rounded-xl text-xs font-bold"
                              >
                                {updating.has(report.id) ? 'Enforcing…' : `Enforce '${selectedAction}' Ruling`}
                              </Button>
                            </div>

                            {/* Case Triage Transition Section */}
                            <div className="mt-4 pt-3 border-t border-border/40">
                              <label className="block text-xs font-bold" htmlFor={`decision-reason-${report.id}`}>
                                Case Disposition Status
                              </label>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map(status => {
                                  const finalDecision = status === 'resolved' || status === 'dismissed';
                                  const reason = (decisionReasons[report.id] ?? report.decisionReason ?? '').trim();
                                  return (
                                    <Button
                                      key={status}
                                      size="sm"
                                      variant={status === report.status ? 'default' : 'outline'}
                                      onClick={() => void updateStatus(report, status)}
                                      disabled={updating.has(report.id) || status === report.status || (finalDecision && reason.length < 10)}
                                      className="rounded-xl text-xs capitalize"
                                    >
                                      {status}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void loadReportHistory(report.id)}
                              disabled={loadingHistory.has(report.id) || updating.has(report.id)}
                              className="mt-2 rounded-xl text-xs"
                            >
                              {loadingHistory.has(report.id) ? 'Loading history…' : reportHistory[report.id] === undefined ? 'View decision history' : 'Refresh decision history'}
                            </Button>

                            {reportHistory[report.id] && (
                              <ol aria-label="Report decision history" className="mt-2 space-y-2 border-l border-border pl-4 text-xs">
                                {reportHistory[report.id]!.length === 0 ? (
                                  <li className="text-muted-foreground">No staff status changes yet.</li>
                                ) : (
                                  reportHistory[report.id]!.map(event => (
                                    <li key={event.id}>
                                      <p className="font-semibold">{event.fromStatus ?? 'new'} → {event.toStatus} · {new Date(event.createdAt).toLocaleString()}</p>
                                      {event.decisionReason && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{event.decisionReason}</p>}
                                    </li>
                                  ))
                                )}
                              </ol>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )
              ) : queue === 'grievances' ? (
                visibleGrievances.length === 0 && !error ? (
                  <div className="rounded-3xl border border-dashed border-border/50 p-12 text-center">
                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400/50" />
                    <p className="mt-3 text-sm font-bold">No grievances match this state.</p>
                  </div>
                ) : (
                  visibleGrievances.map(ticket => (
                    <article key={ticket.id} className="surface-1 rounded-3xl border border-border/40 p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold">{ticket.category.replaceAll('_', ' ')}</h2>
                        <span className="text-xs text-muted-foreground">{ticket.status.replaceAll('_', ' ')} · {ticket.ticketId}</span>
                      </div>
                      <p className="mt-2 break-all text-xs text-muted-foreground">{ticket.reportedUrl} · Filed {new Date(ticket.createdAt).toLocaleString()}</p>
                      <p className="mt-3 text-sm font-semibold">Reporter: {ticket.reporterName} · {ticket.reporterEmail}</p>
                      <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl border border-border/30 p-3 text-sm">{ticket.description}</p>
                      {ticket.officerNote && <p className="mt-3 whitespace-pre-wrap break-words text-sm"><strong>Internal note:</strong> {ticket.officerNote}</p>}
                      <label className="mt-3 block text-xs font-bold" htmlFor={`officer-note-${ticket.id}`}>Internal case note</label>
                      <textarea id={`officer-note-${ticket.id}`} maxLength={5000} value={officerNotes[ticket.id] ?? ticket.officerNote ?? ''} onChange={event => setOfficerNotes(previous => ({ ...previous, [ticket.id]: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm" />
                      <Button size="sm" variant="outline" onClick={() => void updateGrievance(ticket, ticket.status)} disabled={updating.has(ticket.id)} className="mt-2 rounded-xl">{updating.has(ticket.id) ? 'Saving…' : 'Save internal note'}</Button>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {GRIEVANCE_STATUS_OPTIONS.map(status => (
                          <Button key={status} size="sm" variant={status === ticket.status ? 'default' : 'outline'} onClick={() => void updateGrievance(ticket, status)} disabled={updating.has(ticket.id) || status === ticket.status} className="rounded-xl text-xs capitalize">
                            {status.replaceAll('_', ' ')}
                          </Button>
                        ))}
                      </div>
                    </article>
                  ))
                )
              ) : (
                /* Appeals Queue */
                visibleAppeals.length === 0 && !error ? (
                  <div className="rounded-3xl border border-dashed border-border/50 p-12 text-center">
                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400/50" />
                    <p className="mt-3 text-sm font-bold">No appeals in this queue.</p>
                  </div>
                ) : (
                  visibleAppeals.map(appeal => {
                    const outcome = appealReviewOutcomes[appeal.id] ?? 'upheld';
                    const notes = appealReviewNotes[appeal.id] ?? '';
                    const rationale = appealReviewRationales[appeal.id] ?? '';
                    const isClosed = ['upheld', 'reversed', 'rejected'].includes(appeal.status);

                    return (
                      <article key={appeal.id} className="surface-1 rounded-3xl border border-border/40 p-5 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold">Appeal from {appeal.relationship}</h2>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-bold capitalize",
                              appeal.status === 'reversed' ? 'bg-emerald-500/20 text-emerald-500' :
                              appeal.status === 'upheld' ? 'bg-amber-500/20 text-amber-500' :
                              appeal.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                              'bg-primary/20 text-primary'
                            )}>
                              {appeal.status.replaceAll('_', ' ')}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">Decision ID: {appeal.decisionId}</span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Appellant User ID: <code className="font-mono bg-muted px-1 py-0.5 rounded">{appeal.appellantUserId}</code> · Submitted {new Date(appeal.createdAt).toLocaleString()}
                        </p>

                        <div className="rounded-2xl border border-border/30 bg-muted/20 p-3 text-sm">
                          <p className="text-xs font-bold text-muted-foreground mb-1">Appellant Statement:</p>
                          <p className="whitespace-pre-wrap">{appeal.statement}</p>
                        </div>

                        {appeal.reviewerNotes && (
                          <div className="rounded-2xl border border-border/40 bg-background/50 p-3 text-xs">
                            <p className="font-bold">Reviewer notes ({new Date(appeal.reviewedAt ?? appeal.updatedAt).toLocaleString()}):</p>
                            <p className="mt-1 text-muted-foreground">{appeal.reviewerNotes}</p>
                          </div>
                        )}

                        {!isClosed && (
                          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-primary">Review Appeal Ruling</h3>

                            <div className="flex flex-wrap gap-2">
                              {(['upheld', 'reversed', 'rejected'] as const).map(out => (
                                <Button
                                  key={out}
                                  size="sm"
                                  type="button"
                                  variant={outcome === out ? 'default' : 'outline'}
                                  onClick={() => setAppealReviewOutcomes(prev => ({ ...prev, [appeal.id]: out }))}
                                  className="rounded-xl text-xs capitalize"
                                >
                                  {out}
                                </Button>
                              ))}
                            </div>

                            <div>
                              <label className="block text-xs font-bold" htmlFor={`rev-notes-${appeal.id}`}>
                                Reviewer Notes (min 10 chars)
                              </label>
                              <textarea
                                id={`rev-notes-${appeal.id}`}
                                maxLength={5000}
                                disabled={updating.has(appeal.id)}
                                placeholder="Explain rationale for upholding, reversing, or rejecting appeal..."
                                value={notes}
                                onChange={e => setAppealReviewNotes(prev => ({ ...prev, [appeal.id]: e.target.value }))}
                                className="mt-1 min-h-16 w-full rounded-xl border border-border bg-background p-2.5 text-sm"
                              />
                            </div>

                            {outcome === 'reversed' && (
                              <div>
                                <label className="block text-xs font-bold" htmlFor={`rev-rat-${appeal.id}`}>
                                  Restoration Rationale (attributable to reversal decision, min 10 chars)
                                </label>
                                <textarea
                                  id={`rev-rat-${appeal.id}`}
                                  maxLength={5000}
                                  disabled={updating.has(appeal.id)}
                                  placeholder="Restoration rationale for lifting restriction..."
                                  value={rationale}
                                  onChange={e => setAppealReviewRationales(prev => ({ ...prev, [appeal.id]: e.target.value }))}
                                  className="mt-1 min-h-16 w-full rounded-xl border border-border bg-background p-2.5 text-sm"
                                />
                              </div>
                            )}

                            <Button
                              size="sm"
                              onClick={() => void handleReviewAppeal(appeal)}
                              disabled={updating.has(appeal.id) || notes.trim().length < 10 || (outcome === 'reversed' && rationale.trim().length < 10)}
                              className="rounded-xl text-xs font-bold"
                            >
                              {updating.has(appeal.id) ? 'Submitting…' : `Submit Appeal Review (${outcome})`}
                            </Button>
                          </div>
                        )}
                      </article>
                    );
                  })
                )
              )}
            </section>

            {!initialLoading && nextCursor && (
              <Button variant="outline" onClick={() => void load(nextCursor)} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load older ${queue}`}
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
