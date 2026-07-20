import { ReactNode, useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import {
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Command,
  Compass,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Radio,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  Trophy,
  User as UserIcon,
  Users,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useTheme } from 'next-themes';

interface AppShellProps {
  children: ReactNode;
}

type NavItem = {
  icon: typeof Home;
  label: string;
  href: string;
  badge?: number;
};

export default function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const users = useAppStore((s) => s.users);
  const posts = useAppStore((s) => s.posts);
  const communities = useAppStore((s) => s.communities);
  const notifications = useAppStore((s) => s.notifications);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const primaryNav: NavItem[] = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Compass, label: 'Discover', href: '/explore' },
    { icon: Mail, label: 'Messages', href: '/messages' },
  ];
  const connectNav: NavItem[] = [
    { icon: Bell, label: 'Updates', href: '/notifications', badge: unreadCount },
    { icon: Users, label: 'Circles', href: '/communities' },
    { icon: Radio, label: 'Live rooms', href: '/live' },
    { icon: CalendarDays, label: 'Events', href: '/events' },
  ];
  const moreNav: NavItem[] = [
    { icon: BookOpen, label: 'Articles', href: '/articles' },
    { icon: Video, label: 'Watch', href: '/videos' },
    { icon: ShoppingBag, label: 'Marketplace', href: '/marketplace' },
    { icon: Bot, label: 'Ask Yor', href: '/ai' },
    { icon: Trophy, label: 'Achievements', href: '/achievements' },
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  ];
  const allNav = [...primaryNav, ...connectNav, ...moreNav, { icon: UserIcon, label: 'Profile', href: '/profile' }];

  if (!currentUser) return null;

  const isActive = (href: string) => location === href || (href !== '/' && location.startsWith(href));
  const prefetchMap: Record<string, () => void> = {
    '/': () => import('@/pages/home'),
    '/profile': () => import('@/pages/profile'),
    '/messages': () => import('@/pages/messages'),
    '/notifications': () => import('@/pages/notifications'),
    '/explore': () => import('@/pages/explore'),
  };

  const openComposer = () => {
    setLocation('/');
    window.setTimeout(() => document.getElementById('post-composer')?.focus(), 100);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onMouseEnter={() => prefetchMap[item.href]?.()}
        onFocus={() => prefetchMap[item.href]?.()}
        aria-current={active ? 'page' : undefined}
        className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          active
            ? 'nav-active font-semibold text-primary'
            : 'text-muted-foreground hover:bg-muted/75 hover:text-foreground'
        }`}
      >
        <item.icon className={`h-[19px] w-[19px] shrink-0 ${active ? 'stroke-[2.4]' : 'group-hover:scale-105'} transition-transform`} />
        <span className="flex-1">{item.label}</span>
        {!!item.badge && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="app-canvas flex h-[100dvh] w-full overflow-hidden">
      <aside className="hidden h-full w-[264px] shrink-0 flex-col border-r border-border/70 bg-sidebar/82 p-4 backdrop-blur-xl lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-3 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
          <div className="brand-mark grid h-9 w-9 place-items-center rounded-[13px] text-lg font-bold text-white">Y</div>
          <div>
            <span className="block font-display text-lg font-bold leading-none tracking-tight">Yor Talks</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.19em] text-primary">Your corner of the web</span>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setCmdOpen(true)}
          className="mb-5 flex h-11 items-center gap-2 rounded-xl border border-border/80 bg-card/70 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open search"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search Yor Talks</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">Ctrl K</kbd>
        </button>

        <nav className="hide-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto pr-1" aria-label="Primary navigation">
          <div className="space-y-1">{primaryNav.map((item) => <NavLink key={item.href} item={item} />)}</div>
          <div>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Connect</p>
            <div className="space-y-1">{connectNav.map((item) => <NavLink key={item.href} item={item} />)}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/75 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <MoreHorizontal className="h-[19px] w-[19px]" />
                <span className="flex-1 text-left">More from Yor</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-52 rounded-xl p-1.5">
              <DropdownMenuLabel className="px-2.5 text-xs text-muted-foreground">Explore every space</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {moreNav.map((item) => (
                <DropdownMenuItem key={item.href} onClick={() => setLocation(item.href)} className="min-h-9 rounded-lg">
                  <item.icon className="mr-2 h-4 w-4" />{item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="mt-4 space-y-3">
          <Button onClick={openComposer} className="h-11 w-full rounded-xl font-semibold shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Share a thought
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="surface flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-8 w-8"><AvatarImage src={currentUser.avatarUrl} /><AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback></Avatar>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{currentUser.displayName}</span><span className="block truncate text-xs text-muted-foreground">@{currentUser.username}</span></span>
                <Menu className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56 rounded-xl p-1.5">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation('/profile')}><UserIcon className="mr-2 h-4 w-4" />Your profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/settings')}><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                {resolvedTheme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} mode
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="glass z-20 flex h-16 items-center justify-between px-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className="brand-mark grid h-8 w-8 place-items-center rounded-xl text-sm font-bold text-white">Y</div>
            <span className="font-display text-base font-bold">Yor Talks</span>
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCmdOpen(true)} aria-label="Search"><Search className="h-5 w-5" /></Button>
            <Link href="/notifications" aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="h-5 w-5" />
              {!!unreadCount && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full" aria-label="Open all spaces"><Menu className="h-5 w-5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Every space</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[...connectNav.filter((item) => item.href !== '/notifications'), ...moreNav].map((item) => <DropdownMenuItem key={item.href} onClick={() => setLocation(item.href)} className="min-h-9 rounded-lg"><item.icon className="mr-2 h-4 w-4" />{item.label}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation('/settings')} className="min-h-9 rounded-lg"><Settings className="mr-2 h-4 w-4" />Settings</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="hide-scrollbar relative z-10 flex-1 overflow-x-hidden overflow-y-auto pb-20 lg:pb-0">{children}</div>
      </main>

      <nav className="glass fixed inset-x-0 bottom-0 z-30 border-t border-border/60 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden" aria-label="Mobile navigation">
        <div className="mx-auto flex max-w-md items-center justify-between">
          {[primaryNav[0], primaryNav[1], primaryNav[2], { icon: UserIcon, label: 'Profile', href: '/profile' }].map((item, index) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} aria-label={item.label} aria-current={active ? 'page' : undefined} className={`grid h-11 w-12 place-items-center rounded-xl transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'} ${index === 2 ? 'order-4' : index === 3 ? 'order-5' : ''}`}>
                <item.icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : ''}`} />
              </Link>
            );
          })}
          <Button onClick={openComposer} size="icon" className="order-3 -mt-6 h-12 w-12 rounded-2xl border-4 border-background shadow-lg shadow-primary/30" aria-label="Share a thought"><Plus className="h-5 w-5" /></Button>
        </div>
      </nav>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search people, conversations, or a space..." />
        <CommandList>
          <CommandEmpty>No results yet. Try a name or space.</CommandEmpty>
          <CommandGroup heading="Go to">
            {allNav.map((item) => <CommandItem key={item.href} onSelect={() => { setLocation(item.href); setCmdOpen(false); }}><item.icon className="mr-2 h-4 w-4" />{item.label}</CommandItem>)}
            <CommandItem onSelect={() => { setLocation('/settings'); setCmdOpen(false); }}><Settings className="mr-2 h-4 w-4" />Settings</CommandItem>
          </CommandGroup>
          <CommandGroup heading="People">
            {Object.values(users).slice(0, 5).map((user) => <CommandItem key={user.id} onSelect={() => { setLocation(`/profile/${user.id}`); setCmdOpen(false); }}><UserIcon className="mr-2 h-4 w-4" /><span>{user.displayName}</span><span className="ml-2 text-xs text-muted-foreground">@{user.username}</span></CommandItem>)}
          </CommandGroup>
          <CommandGroup heading="Circles">
            {communities.slice(0, 5).map((community) => <CommandItem key={community.id} onSelect={() => { setLocation(`/communities/${community.id}`); setCmdOpen(false); }}><Users className="mr-2 h-4 w-4" />{community.name}</CommandItem>)}
          </CommandGroup>
          <CommandGroup heading="Recent posts">
            {posts.slice(0, 4).map((post) => <CommandItem key={post.id} onSelect={() => { setLocation(`/post/${post.id}`); setCmdOpen(false); }}><Sparkles className="mr-2 h-4 w-4" /><span className="truncate">{post.content}</span></CommandItem>)}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
