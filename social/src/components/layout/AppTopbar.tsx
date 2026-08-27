import { useEffect } from 'react';
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
  { match: '/channels', title: 'Broadcast Channels', kicker: 'Follow the signals that matter' },
  { match: '/articles', title: 'Articles', kicker: 'Long-form ideas worth keeping' },
  { match: '/tournaments', title: 'Tournaments', kicker: 'Compete with intention' },
  { match: '/scrims', title: 'Scrims', kicker: 'Practice in public' },
  { match: '/clans', title: 'Clans', kicker: 'Build your crew' },
  { match: '/arcade', title: 'Arcade', kicker: 'Play beyond the feed' },
  { match: '/predictions', title: 'Predictions', kicker: 'Read the room' },
  { match: '/achievements', title: 'Achievements', kicker: 'Keep your momentum' },
  { match: '/rankings', title: 'Power Rankings', kicker: 'See who is rising' },
  { match: '/trophies', title: 'Trophy Room', kicker: 'Your wins, remembered' },
  { match: '/calendar', title: 'Esports Calendar', kicker: 'Never miss the moment' },
  { match: '/studio', title: 'Creator Studio', kicker: 'Make your next thing' },
  { match: '/analytics', title: 'Analytics', kicker: 'Understand your signal' },
  { match: '/control-room', title: 'Control Room', kicker: 'Run your world' },
  { match: '/moderation', title: 'Moderation', kicker: 'Keep communities human' },
  { match: '/store', title: 'Creator Store', kicker: 'Turn attention into value' },
  { match: '/clips', title: 'Clip Studio', kicker: 'Cut the moment cleanly' },
  { match: '/media-kit', title: 'Media Kit', kicker: 'Make your work easy to share' },
  { match: '/merch', title: 'Merch Studio', kicker: 'Make the idea tangible' },
  { match: '/overlays', title: 'Overlay Studio', kicker: 'Design your live layer' },
  { match: '/marketplace', title: 'Marketplace', kicker: 'Find what fits your world' },
  { match: '/bazaar', title: 'Game Bazaar', kicker: 'Trade the good stuff' },
  { match: '/bounties', title: 'Bounties', kicker: 'Fund useful work' },
  { match: '/treasury', title: 'Clan Treasury', kicker: 'Build together' },
  { match: '/points-shop', title: 'Points Shop', kicker: 'Spend your momentum' },
  { match: '/pass', title: 'Battle Pass', kicker: 'A season with purpose' },
  { match: '/dashboard', title: 'Dashboard', kicker: 'Your world at a glance' },
  { match: '/business', title: 'Business', kicker: 'Build a durable presence' },
  { match: '/ai', title: 'AI Assistant', kicker: 'Think alongside Yor' },
  { match: '/lounge', title: 'Lounge', kicker: 'Low-pressure, real connection' },
  { match: '/fanclub', title: 'Fan Club', kicker: 'Bring your people closer' },
  { match: '/comms', title: 'Squad Comms', kicker: 'Coordinate in real time' },
  { match: '/rooms', title: 'Custom Rooms', kicker: 'Make a space of your own' },
  { match: '/podcasts', title: 'Podcasts', kicker: 'Give the conversation room' },
  { match: '/settings', title: 'Settings', kicker: 'Make Yor yours' },
];

function getPageLabel(location: string) {
  if (location === '/') return { title: 'Home', kicker: 'Signal feed // live' };
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

  useEffect(() => {
    document.title = page.title === 'Home' ? 'Yor · Your feed, your people' : `${page.title} · Yor`;
  }, [page.title]);

  return (
    <header className="premium-topbar sticky top-0 z-30" data-home={location === '/' ? 'true' : undefined} data-route={page.title.toLowerCase().replaceAll(' ', '-')}>
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
          <span>Search people, posts, worlds</span>
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
