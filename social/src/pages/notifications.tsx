import { useMemo, useCallback } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Check, Clock, Calendar, CalendarDays, Archive } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore, type FollowRequest } from '@/lib/store';
import { formatDistanceToNow, isToday, isYesterday, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { staggerContainer, staggerItem, springSnappy } from '@/lib/motion';
import { Link } from 'wouter';

/* ─── icon config per notification type ──────────────────────────────────── */

const typeConfig: Record<string, { icon: React.ElementType; bg: string; ring: string }> = {
  like:    { icon: Heart,         bg: 'bg-rose-500/15',    ring: 'ring-rose-500/20' },
  comment: { icon: MessageCircle, bg: 'bg-sky-500/15',     ring: 'ring-sky-500/20' },
  follow:  { icon: UserPlus,      bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/20' },
  mention: { icon: AtSign,        bg: 'bg-violet-500/15',  ring: 'ring-violet-500/20' },
};

const typeIconColor: Record<string, string> = {
  like:    'text-rose-500',
  comment: 'text-sky-500',
  follow:  'text-emerald-500',
  mention: 'text-violet-500',
};

const groupMeta: Record<string, { icon: React.ElementType }> = {
  Today:       { icon: Clock },
  Yesterday:   { icon: Calendar },
  'This Week': { icon: CalendarDays },
  Earlier:     { icon: Archive },
};

/* ─── action copy ────────────────────────────────────────────────────────── */

function getActionText(type: string, actorName: string) {
  switch (type) {
    case 'like':    return <><span className="font-semibold text-foreground">{actorName}</span>{' '}liked your post</>;
    case 'comment': return <><span className="font-semibold text-foreground">{actorName}</span>{' '}commented on your post</>;
    case 'follow':  return <><span className="font-semibold text-foreground">{actorName}</span>{' '}started following you</>;
    case 'mention': return <><span className="font-semibold text-foreground">{actorName}</span>{' '}mentioned you</>;
    default:        return <><span className="font-semibold text-foreground">{actorName}</span>{' '}interacted with you</>;
  }
}

function typeLabel(type: string): string {
  switch (type) {
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'follow': return 'started following you';
    case 'mention': return 'mentioned you';
    default: return 'interacted with you';
  }
}

type GroupedNotification = {
  key: string;
  type: string;
  targetId?: string;
  actors: string[];
  latestNotif: any;
  count: number;
};

/* ─── link target helper ─────────────────────────────────────────────────── */

function getNotifHref(notif: { type: string; actorId?: string; targetId?: string | null }) {
  if (notif.type === 'follow' && notif.actorId) return `/profile/${notif.actorId}`;
  if (notif.targetId) return `/post/${notif.targetId}`;
  if (notif.actorId) return `/profile/${notif.actorId}`;
  return '#';
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function Notifications() {
  const users = useAppStore((s) => s.users);
  const notifications = useAppStore((s) => s.notifications);
  const followRequests = useAppStore((s) => s.followRequests);
  const acceptFollowRequest = useAppStore((s) => s.acceptFollowRequest);
  const rejectFollowRequest = useAppStore((s) => s.rejectFollowRequest);

  // Use markNotificationsRead if available, else fallback to markAllNotificationsRead
  const markAll = useAppStore((s) => (s as any).markNotificationsRead || s.markAllNotificationsRead);
  const markOne = useAppStore((s) => s.markNotificationRead);

  /* ── group notifications by time bucket ────────────────────────────────── */
  const grouped = useMemo(() => {
    const today: typeof notifications = [];
    const yesterday: typeof notifications = [];
    const thisWeek: typeof notifications = [];
    const earlier: typeof notifications = [];

    notifications.forEach(n => {
      const date = new Date(n.createdAt);
      if (isToday(date)) today.push(n);
      else if (isYesterday(date)) yesterday.push(n);
      else if (differenceInDays(new Date(), date) <= 7) thisWeek.push(n);
      else earlier.push(n);
    });

    return { Today: today, Yesterday: yesterday, 'This Week': thisWeek, Earlier: earlier };
  }, [notifications]);

  const groupNotifications = useCallback((items: typeof notifications): GroupedNotification[] => {
    const map = new Map<string, GroupedNotification>();
    
    for (const n of items) {
      // Group by type + targetId (e.g., all likes on the same post)
      const key = `${n.type}-${n.targetId || n.id}`;
      const existing = map.get(key);
      
      if (existing && n.actorId && !existing.actors.includes(n.actorId)) {
        existing.actors.push(n.actorId);
        existing.count++;
        // Keep the most recent notification as the representative
        if (new Date(n.createdAt) > new Date(existing.latestNotif.createdAt)) {
          existing.latestNotif = n;
        }
      } else if (!existing) {
        map.set(key, {
          key,
          type: n.type,
          targetId: n.targetId || undefined,
          actors: n.actorId ? [n.actorId] : [],
          latestNotif: n,
          count: 1,
        });
      }
    }
    
    return [...map.values()].sort((a, b) => 
      new Date(b.latestNotif.createdAt).getTime() - new Date(a.latestNotif.createdAt).getTime()
    );
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = useCallback(() => {
    markAll?.();
  }, [markAll]);

  /* ── empty state ───────────────────────────────────────────────────────── */
  if (notifications.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 min-h-screen">
        {/* Header */}
        <StickyHeader unreadCount={0} onMarkAllRead={handleMarkAllRead} />

        {followRequests.length > 0 && (
          <FollowRequestsSection requests={followRequests} onAccept={acceptFollowRequest} onReject={rejectFollowRequest} />
        )}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ...springSnappy }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
            <div className="relative glass-heavy rounded-full p-6">
              <Bell className="w-10 h-10 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
          </div>
          <h2 className="text-xl font-display font-semibold text-foreground mb-2">
            No activity yet
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            When someone likes, comments, or follows you — it'll show up here.
          </p>
        </motion.div>
      </div>
    );
  }

  /* ── main list ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 min-h-screen">
      <StickyHeader unreadCount={unreadCount} onMarkAllRead={handleMarkAllRead} />

      {followRequests.length > 0 && (
        <FollowRequestsSection requests={followRequests} onAccept={acceptFollowRequest} onReject={rejectFollowRequest} />
      )}

      <div className="space-y-8 mt-2">
        {Object.entries(grouped).map(([label, items]) => {
          if (items.length === 0) return null;
          const meta = groupMeta[label];
          const GroupIcon = meta?.icon ?? Clock;

          return (
            <section key={label}>
              {/* ── showcase-section-title style group header ── */}
              <div className="flex items-center gap-3 mb-4">
                <GroupIcon className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 font-mono shrink-0">
                  {label}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-border/60 to-transparent" />
              </div>

              {/* ── staggered notification list ── */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-1.5"
              >
                <AnimatePresence mode="popLayout">
                  {groupNotifications(items).map((group) => {
                    const notif = group.latestNotif;
                    const primaryActor = group.actors.length > 0 ? users[group.actors[0]] : null;
                    const actorName = primaryActor?.displayName || 'Someone';
                    const othersCount = group.count - 1;
                    const isUnread = !notif.read;
                    const cfg = typeConfig[notif.type] ?? typeConfig.like;
                    const IconComp = cfg.icon;
                    const href = getNotifHref(notif);

                    return (
                      <motion.div
                        layout
                        variants={staggerItem}
                        key={group.key}
                        className="relative"
                      >
                        <Link
                          href={href}
                          onClick={() => {
                            if (isUnread) markOne?.(notif.id);
                          }}
                          className={cn(
                            'flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 group cursor-pointer',
                            'hover:bg-muted/40 active:scale-[0.99]',
                            isUnread
                              ? 'bg-primary/[0.04] border-l-[3px] border-primary'
                              : 'border-l-[3px] border-transparent',
                          )}
                        >
                          {/* ── avatar + type badge ── */}
                          <div className="relative shrink-0">
                            <Avatar className="w-11 h-11 ring-2 ring-background shadow-sm">
                              {primaryActor && <AvatarImage src={primaryActor.avatarUrl} alt={primaryActor.displayName} />}
                              <AvatarFallback className="text-sm font-medium">
                                {actorName[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            {othersCount > 0 && (
                              <span className="absolute -bottom-1 -left-1 min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold ring-2 ring-background px-1 z-10 shadow-sm">
                                +{othersCount > 9 ? '9+' : othersCount}
                              </span>
                            )}
                            {/* type icon pill */}
                            <span
                              className={cn(
                                'absolute -bottom-1 -right-1 flex items-center justify-center',
                                'w-5.5 h-5.5 rounded-full ring-2 ring-background',
                                cfg.bg,
                              )}
                              style={{ width: 22, height: 22 }}
                            >
                              <IconComp
                                className={cn('w-3 h-3', typeIconColor[notif.type] ?? 'text-primary')}
                                strokeWidth={2.5}
                              />
                            </span>
                          </div>

                          {/* ── body ── */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] leading-snug text-muted-foreground">
                              <span className="font-semibold text-foreground">{actorName}</span>
                              {othersCount > 0 && <span className="text-muted-foreground"> and {othersCount} {othersCount === 1 ? 'other' : 'others'}</span>}
                              {' '}<span className="text-muted-foreground">{notif.message?.replace(actorName, '').trim() || typeLabel(notif.type)}</span>
                            </p>

                            {/* show comment/message excerpt */}
                            {notif.message && notif.type !== 'like' && notif.type !== 'follow' && (
                              <p className="text-xs text-muted-foreground/60 truncate mt-0.5 max-w-[260px]">
                                "{notif.message}"
                              </p>
                            )}

                            {/* timestamp */}
                            <span className="text-[11px] text-muted-foreground/50 font-mono mt-1 block">
                              {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                            </span>
                          </div>

                          {/* ── unread dot ── */}
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-[0_0_6px_rgba(var(--primary),0.4)]" />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function FollowRequestsSection({
  requests,
  onAccept,
  onReject,
}: {
  requests: FollowRequest[];
  onAccept: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
}) {
  return (
    <section className="mb-6 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-bold">Follow requests</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Choose who can see your private posts.</p>
        </div>
        <UserPlus className="h-4 w-4 text-primary" />
      </div>
      <div className="space-y-2">
        {requests.map((request) => (
          <div key={request.id} className="flex items-center gap-3 rounded-xl bg-background/50 p-2.5">
            <Avatar className="h-9 w-9">
              <AvatarImage src={request.requester.avatarUrl} alt={request.requester.displayName} />
              <AvatarFallback>{request.requester.displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{request.requester.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">@{request.requester.username}</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button type="button" onClick={() => void onReject(request.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">Decline</button>
              <button type="button" onClick={() => void onAccept(request.id)} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Accept</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STICKY HEADER
   ═══════════════════════════════════════════════════════════════════════════ */

function StickyHeader({
  unreadCount,
  onMarkAllRead,
}: {
  unreadCount: number;
  onMarkAllRead: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSnappy}
      className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 pt-1 glass-heavy backdrop-blur-xl rounded-b-2xl mb-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
            Activity
          </h1>
          {unreadCount > 0 && (
            <span className="level-badge text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onMarkAllRead}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium text-primary',
              'px-3 py-1.5 rounded-lg',
              'hover:bg-primary/10 transition-colors duration-150',
            )}
          >
            <Check className="w-3.5 h-3.5" />
            Mark all read
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
