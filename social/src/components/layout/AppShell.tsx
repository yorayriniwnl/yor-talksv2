import { ReactNode, useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  Activity, Compass, Film, Globe2, Heart, House, MessageCircle, PlusSquare, Gauge,
  UserRound, Settings, Camera, Radio, WandSparkles, Bookmark, Megaphone, WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ThemeMorpher } from '@/components/ui/ThemeMorpher';
import { GlobalAudioPlayer } from '@/components/player/GlobalAudioPlayer';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { PwaInstallPrompt } from '@/components/ui/PwaInstallPrompt';
import { AppTopbar } from '@/components/layout/AppTopbar';
import { CreatePost } from '@/components/feed/Post';
import { DeviceApprovalInbox } from '@/components/auth/DeviceApprovalInbox';
import { IncomingCallManager } from '@/components/messages/IncomingCallManager';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const worldPreferences = useAppStore((state) => state.worldPreferences);

  const conversations = useAppStore((state) => state.conversations);
  const unreadMessages = conversations.filter(c => c.lastMessage && !c.lastMessage.read).length || 0;
  const unreadNotifications = useAppStore((state) => state.notifications.filter((notification) => !notification.read).length);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('yor-sidebar-collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isComposing, setIsComposing] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    try {
      localStorage.setItem('yor-sidebar-collapsed', String(sidebarCollapsed));
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('yor-low-bandwidth', worldPreferences.lowBandwidth);
    return () => document.documentElement.classList.remove('yor-low-bandwidth');
  }, [worldPreferences.lowBandwidth]);

  const primaryNavItems = [
    { icon: House, label: 'Home', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: Film, label: 'Reels', path: '/videos' },
    { icon: MessageCircle, label: 'Messages', path: '/messages', badge: unreadMessages > 0 ? unreadMessages : null },
    { icon: Heart, label: 'Notifications', path: '/notifications', badge: unreadNotifications > 0 ? unreadNotifications : null },
    { icon: Bookmark, label: 'Saved', path: '/saved' },
  ];

  const secondaryNavItems = [
    { icon: Globe2, label: 'Worlds', path: '/worlds' },
    { icon: Activity, label: 'Pulse', path: '/pulse' },
    { icon: WandSparkles, label: 'Dream', path: '/dream' },
    { icon: Radio, label: 'Live', path: '/live' },
    { icon: Megaphone, label: 'Channels', path: '/channels' },
    { icon: Camera, label: 'Creator Studio', path: '/studio' },
    { icon: Gauge, label: 'Control Room', path: '/control-room' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const currentDisplayName = currentUser?.displayName || currentUser?.username || 'User';

  return (
    <div className="app-shell relative flex min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <CommandPalette />
      {isOffline && (
        <div className="yor-offline-banner" role="status" aria-live="polite">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            <strong>Offline mode</strong>
            <small>Some actions are paused. Yor will reconnect automatically.</small>
          </span>
        </div>
      )}
      
      {/* ── DESKTOP NAVIGATION ─────────────────────────────────────────── */}
      <aside className={cn(
        "app-shell__rail hidden h-screen shrink-0 flex-col border-r border-border/40 py-6 backdrop-blur-xl md:sticky md:top-0 md:flex relative",
        sidebarCollapsed ? "w-[72px] px-2" : "w-64 lg:w-72 px-4",
        "transition-all duration-300 ease-out"
      )} data-collapsed={sidebarCollapsed ? 'true' : 'false'}>
        
        {/* Brand */}
        <div className={cn("flex items-center", sidebarCollapsed ? "mb-6 justify-center px-0" : "mb-3 justify-between gap-2 px-1")}>
          <button
            onClick={() => {
              if (location === '/') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                setLocation('/');
              }
            }}
            aria-label="Go to Home"
            className="flex min-w-0 items-center gap-3 group cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-purple-500 to-accent grid place-items-center text-white text-xl font-bold font-display shadow-md glow-neon-primary group-hover:scale-105 transition-transform shrink-0">
              Y
            </div>
            {!sidebarCollapsed && (
              <div className="flex min-w-0 flex-col">
                <span className="font-display font-extrabold text-xl tracking-tight leading-none text-foreground">Yor</span>
                <span className="mt-0.5 whitespace-nowrap text-[0.62rem] font-mono text-muted-foreground tracking-wider uppercase font-semibold">Current world · {worldPreferences.worldLabel}</span>
              </div>
            )}
          </button>
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="shrink-0 p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="absolute top-4 -right-3 p-1 rounded-full bg-background border border-border/40 shadow-sm hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors z-50"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="rotate-180">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="shell-utility-row">
            <LanguageSelector />
            <ThemeMorpher />
          </div>
        )}

        {/* Primary create action */}
        <button
          type="button"
          onClick={() => setIsComposing(true)}
          className={cn(
            "premium-create-button w-full justify-center mb-5",
            sidebarCollapsed && "p-2.5"
          )}
          title="Create a post"
          aria-label="Create a post"
        >
          <PlusSquare className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Create</span>}
        </button>

        {/* Navigation List */}
        <nav className="flex-1 space-y-5">
          <div className="space-y-1.5">
            {!sidebarCollapsed && <p className="px-3.5 pb-1 text-[0.62rem] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">Living internet</p>}
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/' ? location === '/' : location.startsWith(item.path);

              return (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => setLocation(item.path)}
                  className={cn(
                    "app-shell-nav-item flex items-center w-full rounded-2xl text-sm font-semibold transition-all duration-200 group text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    sidebarCollapsed ? "justify-center px-2 py-3 gap-0" : "gap-4 px-3.5 py-3",
                    isActive && "text-foreground bg-primary/10 font-bold border border-primary/20"
                  )}
                  data-active={isActive ? 'true' : 'false'}
                  data-nav-tier="primary"
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={sidebarCollapsed ? item.label : undefined}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="relative">
                    <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-105", isActive && "text-primary")} />
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-mono text-[0.62rem] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-background">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>

          <div className="space-y-1.5">
            {!sidebarCollapsed && <p className="px-3.5 pb-1 text-[0.62rem] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">More</p>}
            {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.startsWith(item.path);

            return (
              <button
                type="button"
                key={item.label}
                onClick={() => setLocation(item.path)}
                className={cn(
                  "app-shell-nav-item flex items-center w-full rounded-2xl text-sm font-semibold transition-all duration-200 group text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  sidebarCollapsed ? "justify-center px-2 py-3 gap-0" : "gap-4 px-3.5 py-3",
                  isActive && "text-foreground bg-primary/10 font-bold border border-primary/20"
                )}
                data-active={isActive ? 'true' : 'false'}
                data-nav-tier="secondary"
                aria-current={isActive ? 'page' : undefined}
                aria-label={sidebarCollapsed ? item.label : undefined}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-105", isActive && "text-primary")} />
                </div>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
            })}
          </div>
        </nav>

        {/* User Mini Profile */}
        {currentUser && (
          <div className="space-y-2">
            <div className={cn("flex items-center rounded-2xl glass-heavy hover-lift border border-border/40 p-2.5", sidebarCollapsed ? "justify-center p-2" : "gap-2.5")}>
              <Link href={`/profile/${currentUser.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group">
                <Avatar className="w-9 h-9 border border-border/50 shrink-0 group-hover:ring-2 ring-primary/40 transition-all">
                  <AvatarImage src={currentUser.avatarUrl} />
                  <AvatarFallback className="font-display font-bold">{currentDisplayName.charAt(0)}</AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs truncate leading-tight group-hover:text-primary transition-colors">{currentDisplayName}</h4>
                    <p className="text-[0.68rem] text-muted-foreground font-mono truncate">@{currentUser.username}</p>
                  </div>
                )}
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <div className="app-shell__content min-h-screen min-w-0 flex-1">
        <AppTopbar onCompose={() => setIsComposing(true)} />
        <main id="main-content" tabIndex={-1} className="w-full h-full outline-none">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ─────────────────────────────────── */}
      <nav aria-label="Primary navigation" className="app-shell__mobile-nav fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/40 px-3 py-2 md:hidden">
        <button
          type="button"
          aria-label="Home"
          onClick={() => {
            if (location === '/') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setLocation('/');
            }
          }}
          aria-current={location === '/' ? 'page' : undefined}
          className={cn("mobile-nav-item p-2 text-muted-foreground relative", location === '/' && "text-primary")}
        >
          <House className="w-6 h-6" />
          <span>Home</span>
          {location === '/' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <button type="button" onClick={() => setLocation('/explore')} aria-label="Explore" aria-current={location.startsWith('/explore') ? 'page' : undefined} className={cn("mobile-nav-item p-2 text-muted-foreground relative", location.startsWith('/explore') && "text-primary")}>
          <Compass className="w-6 h-6" />
          <span>Explore</span>
          {location.startsWith('/explore') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <button type="button" onClick={() => setIsComposing(true)} aria-label="Create post" className="mobile-nav-item mobile-nav-item--create p-2.5 rounded-full bg-primary text-primary-foreground -mt-5 shadow-lg relative">
            <PlusSquare className="w-6 h-6" />
            <span>Create</span>
        </button>
        <button type="button" onClick={() => setLocation('/videos')} className={cn("mobile-nav-item p-2 text-muted-foreground relative", location.startsWith('/videos') && "text-primary")} aria-label="Reels" aria-current={location.startsWith('/videos') ? 'page' : undefined}>
          <Film className="w-6 h-6" />
          <span>Reels</span>
          {location.startsWith('/videos') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <button type="button" aria-label="Profile" aria-current={location.startsWith('/profile') ? 'page' : undefined} onClick={() => currentUser && setLocation(`/profile/${currentUser.id}`)} className={cn("mobile-nav-item p-2 text-muted-foreground relative", location.startsWith('/profile') && "text-primary")}>
          <UserRound className="w-6 h-6" />
          <span>Profile</span>
          {location.startsWith('/profile') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
      </nav>

      {/* ── CREATE POST MODAL ────────────────────────────────────────────── */}
      <Dialog open={isComposing} onOpenChange={setIsComposing}>
        <DialogContent className="sm:max-w-[560px] rounded-[1.5rem] p-0 font-sans overflow-hidden">
          <DialogHeader className="border-b border-border/70 px-5 py-4 sm:px-6">
            <div className="pr-8">
              <DialogTitle className="font-display font-bold text-lg">Create post</DialogTitle>
              <p className="text-xs text-muted-foreground">Share a thought, photo, or update with your people.</p>
            </div>
            <Link href="/dream" onClick={() => setIsComposing(false)} className="seed-dialog-dream-link">
              <WandSparkles className="h-4 w-4" />
              <span><strong>Have a bigger idea?</strong><small>Open the Dream Engine</small></span>
            </Link>
          </DialogHeader>
          <CreatePost onPublished={() => setIsComposing(false)} />
        </DialogContent>
      </Dialog>

      <GlobalAudioPlayer />
      <PwaInstallPrompt />
      <DeviceApprovalInbox />
      <IncomingCallManager />
    </div>
  );
}
