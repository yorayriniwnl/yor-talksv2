import { useCallback, useMemo, type ElementType } from 'react';
import {
  Archive,
  AtSign,
  BadgeCheck,
  Bell,
  Check,
  Clock,
  Heart,
  MessageCircle,
  Radio,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { formatDistanceToNow, isToday } from 'date-fns';
import { Link } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SignalLabel, StatusBadge } from '@/components/system';
import { useAppStore, type FollowRequest, type Notification } from '@/lib/store';
import '@/styles/operator-communications.css';

type NotificationTone = 'signal' | 'blue' | 'online' | 'ember' | 'muted';

const typeConfig: Record<string, { icon: ElementType; tone: NotificationTone }> = {
  like: { icon: Heart, tone: 'signal' },
  comment: { icon: MessageCircle, tone: 'blue' },
  follow: { icon: UserPlus, tone: 'online' },
  follow_request: { icon: UserPlus, tone: 'ember' },
  follow_request_accepted: { icon: BadgeCheck, tone: 'online' },
  mention: { icon: AtSign, tone: 'blue' },
  broadcast_channel: { icon: Radio, tone: 'ember' },
  achievement: { icon: BadgeCheck, tone: 'ember' },
  announcement: { icon: Radio, tone: 'blue' },
  security: { icon: ShieldCheck, tone: 'online' },
  system: { icon: ShieldCheck, tone: 'muted' },
};

const systemNotificationTypes = new Set([
  'achievement',
  'announcement',
  'broadcast_channel',
  'creator_membership',
  'security',
  'system',
]);

const groupMeta: Record<string, { icon: ElementType; description: string }> = {
  Today: { icon: Clock, description: 'Fresh activity from your network' },
  Earlier: { icon: Archive, description: 'Previous social activity' },
  System: { icon: ShieldCheck, description: 'Account, channel, and platform updates' },
};

function typeLabel(type: string): string {
  switch (type) {
    case 'like': return 'liked your post';
    case 'comment': return 'commented on your post';
    case 'follow': return 'started following you';
    case 'follow_request': return 'requested to follow you';
    case 'follow_request_accepted': return 'accepted your follow request';
    case 'mention': return 'mentioned you';
    default: return 'sent you an update';
  }
}

type GroupedNotification = {
  key: string;
  actors: string[];
  latestNotification: Notification;
  notificationIds: string[];
  unreadIds: string[];
  count: number;
};

function getNotificationHref(notification: Notification) {
  if (notification.type === 'broadcast_channel') return '/channels';
  if ((notification.type === 'follow' || notification.type === 'follow_request_accepted') && notification.actorId) {
    return `/profile/${notification.actorId}`;
  }
  if (['like', 'comment', 'mention'].includes(notification.type) && notification.targetId) {
    return `/post/${notification.targetId}`;
  }
  if (notification.actorId) return `/profile/${notification.actorId}`;
  return '/notifications';
}

export default function Notifications() {
  const users = useAppStore((state) => state.users);
  const notifications = useAppStore((state) => state.notifications);
  const followRequests = useAppStore((state) => state.followRequests);
  const acceptFollowRequest = useAppStore((state) => state.acceptFollowRequest);
  const rejectFollowRequest = useAppStore((state) => state.rejectFollowRequest);
  const markAllNotificationsRead = useAppStore((state) => state.markAllNotificationsRead);
  const markNotificationRead = useAppStore((state) => state.markNotificationRead);

  const grouped = useMemo(() => {
    const today: Notification[] = [];
    const earlier: Notification[] = [];
    const system: Notification[] = [];

    notifications.forEach((notification) => {
      if (systemNotificationTypes.has(notification.type)) system.push(notification);
      else if (isToday(new Date(notification.createdAt))) today.push(notification);
      else earlier.push(notification);
    });

    return { Today: today, Earlier: earlier, System: system };
  }, [notifications]);

  const groupNotifications = useCallback((items: Notification[]): GroupedNotification[] => {
    const groups = new Map<string, GroupedNotification>();

    items.forEach((notification) => {
      const key = `${notification.type}-${notification.targetId || notification.id}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          key,
          actors: notification.actorId ? [notification.actorId] : [],
          latestNotification: notification,
          notificationIds: [notification.id],
          unreadIds: notification.read ? [] : [notification.id],
          count: 1,
        });
        return;
      }

      existing.notificationIds.push(notification.id);
      if (!notification.read) existing.unreadIds.push(notification.id);
      if (notification.actorId && !existing.actors.includes(notification.actorId)) existing.actors.push(notification.actorId);
      existing.count = existing.notificationIds.length;
      if (new Date(notification.createdAt) > new Date(existing.latestNotification.createdAt)) {
        existing.latestNotification = notification;
      }
    });

    return [...groups.values()].sort(
      (a, b) => new Date(b.latestNotification.createdAt).getTime() - new Date(a.latestNotification.createdAt).getTime(),
    );
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const systemCount = grouped.System.length;

  const handleMarkAllRead = useCallback(() => {
    void markAllNotificationsRead();
  }, [markAllNotificationsRead]);

  return (
    <main className="operator-activity-page">
      <ActivityHeader unreadCount={unreadCount} onMarkAllRead={handleMarkAllRead} />

      <section className="operator-activity-overview" aria-label="Activity overview">
        <div><strong>{unreadCount}</strong><span>Unread</span></div>
        <div><strong>{followRequests.length}</strong><span>Requests</span></div>
        <div><strong>{systemCount}</strong><span>System</span></div>
        <p>Review the signal, clear what matters, and get back to the conversation.</p>
      </section>

      {followRequests.length > 0 && (
        <FollowRequestsSection
          requests={followRequests}
          onAccept={acceptFollowRequest}
          onReject={rejectFollowRequest}
        />
      )}

      {notifications.length === 0 ? (
        <section className="operator-activity-empty">
          <span><Bell aria-hidden="true" /></span>
          <SignalLabel tone="muted">Activity monitor</SignalLabel>
          <h2>You’re all caught up</h2>
          <p>Likes, comments, mentions, follows, and important system notices will appear here.</p>
        </section>
      ) : (
        <div className="operator-activity-groups">
          {Object.entries(grouped).map(([label, items]) => {
            if (items.length === 0) return null;
            const meta = groupMeta[label];
            const GroupIcon = meta?.icon ?? Clock;

            return (
              <section className="operator-activity-group" key={label}>
                <header>
                  <span><GroupIcon aria-hidden="true" /></span>
                  <div><h2>{label}</h2><p>{meta?.description}</p></div>
                  <small>{items.length} {items.length === 1 ? 'event' : 'events'}</small>
                </header>

                <div className="operator-notification-list">
                  {groupNotifications(items).map((group) => {
                    const notification = group.latestNotification;
                    const primaryActor = group.actors[0] ? users[group.actors[0]] : null;
                    const actorName = primaryActor?.displayName || notification.title || 'Yor Talks';
                    const uniqueOthers = Math.max(group.actors.length - 1, 0);
                    const isUnread = group.unreadIds.length > 0;
                    const config = typeConfig[notification.type] ?? { icon: Bell, tone: 'muted' as const };
                    const Icon = config.icon;
                    const isSystem = systemNotificationTypes.has(notification.type);

                    return (
                      <Link
                        key={group.key}
                        href={getNotificationHref(notification)}
                        className="operator-notification"
                        data-unread={isUnread || undefined}
                        onClick={() => {
                          if (group.unreadIds.length > 0) {
                            void Promise.all(group.unreadIds.map((id) => markNotificationRead(id)));
                          }
                        }}
                      >
                        <div className="operator-notification__avatar">
                          <Avatar>
                            {primaryActor && <AvatarImage src={primaryActor.avatarUrl} alt={primaryActor.displayName} />}
                            <AvatarFallback>{actorName.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {group.count > 1 && <span>+{group.count > 9 ? '9+' : group.count - 1}</span>}
                          <i data-tone={config.tone}><Icon aria-hidden="true" /></i>
                        </div>

                        <div className="operator-notification__copy">
                          <p>
                            <strong>{actorName}</strong>
                            {!isSystem && uniqueOthers > 0 && <> and {uniqueOthers} {uniqueOthers === 1 ? 'other' : 'others'}</>}
                            {!isSystem && <> {typeLabel(notification.type)}</>}
                          </p>
                          {isSystem && <p>{notification.message}</p>}
                          {!isSystem && notification.message && !['like', 'follow', 'follow_request_accepted'].includes(notification.type) && (
                            <blockquote>{notification.message}</blockquote>
                          )}
                          <time dateTime={notification.createdAt}>
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            {group.count > 1 ? ` · ${group.count} grouped` : ''}
                          </time>
                        </div>

                        {isUnread && <span className="operator-notification__unread">New</span>}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
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
    <section className="operator-follow-requests">
      <header>
        <span><UserPlus aria-hidden="true" /></span>
        <div>
          <SignalLabel tone="ember">Access queue</SignalLabel>
          <h2>Follow requests</h2>
          <p>Approve who can enter your private network.</p>
        </div>
        <small>{requests.length} pending</small>
      </header>

      <div className="operator-follow-requests__list">
        {requests.map((request) => (
          <article key={request.id}>
            <Avatar>
              <AvatarImage src={request.requester.avatarUrl} alt={request.requester.displayName} />
              <AvatarFallback>{request.requester.displayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <strong>{request.requester.displayName}</strong>
              <span>@{request.requester.username} · {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</span>
            </div>
            <div>
              <button type="button" onClick={() => void onReject(request.id)}>Decline</button>
              <button type="button" onClick={() => void onAccept(request.id)}>Accept</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ActivityHeader({ unreadCount, onMarkAllRead }: { unreadCount: number; onMarkAllRead: () => void }) {
  return (
    <header className="operator-activity-header">
      <div>
        <SignalLabel>Signal // activity</SignalLabel>
        <h1>Activity</h1>
        <p>Your social inbox, organized by urgency instead of noise.</p>
      </div>
      <div className="operator-activity-header__actions">
        <StatusBadge status={unreadCount > 0 ? 'busy' : 'online'}>{unreadCount > 0 ? `${unreadCount} unread` : 'Clear'}</StatusBadge>
        {unreadCount > 0 && (
          <button type="button" onClick={onMarkAllRead}><Check aria-hidden="true" />Mark all read</button>
        )}
      </div>
    </header>
  );
}
