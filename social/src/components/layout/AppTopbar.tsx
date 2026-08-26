import { Bell, MessageCircle, Plus, Search } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { WorldSelector } from '@/components/worlds/WorldSelector';

interface AppTopbarProps {
  onCompose: () => void;
}

const PAGE_LABELS: Array<{ match: string; title: string; kicker: string }> = [
  { match: '/pulse', title: 'Pulse', kicker: 'What is moving right now' },
  { match: '/worlds', title: 'Worlds', kicker: 'Places with shared gravity' },
  { match: '/dream', title: 'Dream Engine', kicker: 'Turn intent into motion' },
  { match: '/explore', title: 'Explore', kicker: 'Find your next interest' },
  { match: '/videos', title: 'Reels', kicker: 'Short-form highlights' },
  { match: '/messages', title: 'Messages', kicker: 'Stay close to your people' },
  { match: '/notifications', title: 'Activity', kicker: 'What you missed' },
  { match: '/saved', title: 'Saved', kicker: 'Keep what matters close' },
  { match: '/profile', title: 'Your world', kicker: 'Identity in full color' },
  { match: '/communities', title: 'Communities', kicker: 'Gather around what matters' },
  { match: '/events', title: 'Events', kicker: 'Make plans together' },
  { match: '/live', title: 'Live now', kicker: 'See what is happening' },
  { match: '/settings', title: 'Settings', kicker: 'Make Yor yours' },
];

function getPageLabel(location: string) {
  if (location === '/') return { title: 'Home', kicker: 'Your feed, your people' };
  return PAGE_LABELS.find((item) => location.startsWith(item.match)) ?? { title: 'Yor', kicker: 'The living internet' };
}

function openCommandPalette() {
  window.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'k',
    code: 'KeyK',
    ctrlKey: true,
    bubbles: true,
  }));
}

export function AppTopbar({ onCompose }: AppTopbarProps) {
  const [location] = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const unreadNotifications = useAppStore((state) => state.notifications.filter((notification) => !notification.read).length);
  const unreadMessages = useAppStore((state) => state.conversations.filter((conversation) => conversation.lastMessage && !conversation.lastMessage.read).length);
  const page = getPageLabel(location);
  const displayName = currentUser?.displayName || currentUser?.username || 'You';

  return (
    <header className="premium-topbar sticky top-0 z-30" data-home={location === '/' ? 'true' : undefined}>
      <div className="premium-topbar__inner">
        <div className="premium-topbar__title">
          <Link href="/" className="premium-topbar__mobile-mark" aria-label="Go to home">
            <span>Y</span>
          </Link>
          <div className="min-w-0">
            <p className="premium-topbar__kicker">{page.kicker}</p>
            <h1 className="premium-topbar__heading">{page.title}</h1>
          </div>
        </div>

        <button type="button" className="premium-search" onClick={openCommandPalette} aria-label="Search Yor">
          <Search className="h-4 w-4 shrink-0" />
          <span>Search Yor</span>
          <kbd className="premium-search__shortcut">Ctrl K</kbd>
        </button>

        <div className="premium-topbar__actions">
          <WorldSelector compact />

          <Link href="/messages" className="premium-icon-button" aria-label={unreadMessages ? `${unreadMessages} unread messages` : 'Messages'}>
            <MessageCircle className="h-[18px] w-[18px]" />
            {unreadMessages > 0 && <span className="premium-notification-dot">{unreadMessages > 9 ? '9+' : unreadMessages}</span>}
          </Link>

          <Link href="/notifications" className="premium-icon-button" aria-label={unreadNotifications ? `${unreadNotifications} unread notifications` : 'Notifications'}>
            <Bell className="h-[18px] w-[18px]" />
            {unreadNotifications > 0 && <span className="premium-notification-dot">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
          </Link>

          <button type="button" className="premium-create-button" onClick={onCompose} aria-label="Create a post">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span>Create</span>
          </button>

          {currentUser && (
            <Link href={`/profile/${currentUser.id}`} className="premium-topbar__profile" aria-label={`Open ${displayName}'s profile`}>
              <Avatar className="h-8 w-8 border border-border/80">
                <AvatarImage src={currentUser.avatarUrl} alt="" />
                <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className={cn('hidden xl:block max-w-24 truncate text-xs font-semibold', location.startsWith('/profile') && 'text-primary')}>{displayName}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
