import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAppStore } from '@/lib/store';
import { 
  Home, 
  Search, 
  Bell, 
  Mail, 
  Users, 
  BookOpen, 
  Video, 
  User as UserIcon, 
  Settings,
  LogOut,
  Menu,
  Plus,
  Command,
  Radio,
  Calendar,
  ShoppingBag,
  Sparkles,
  Trophy,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command as CommandPrimitive, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandDialog } from '@/components/ui/command';
import { useTheme } from 'next-themes';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const users = useAppStore((s) => s.users);
  const posts = useAppStore((s) => s.posts);
  const communities = useAppStore((s) => s.communities);
  const notifications = useAppStore((s) => s.notifications);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { setTheme, theme } = useTheme();
  const unreadCount = notifications.filter(n => !n.read).length;

  // Keyboard shortcut for Command palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const navItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Explore', href: '/explore', hideDesktop: true },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: Mail, label: 'Messages', href: '/messages' },
    { icon: Users, label: 'Communities', href: '/communities' },
    { icon: Radio, label: 'Live', href: '/live' },
    { icon: Calendar, label: 'Events', href: '/events' },
    { icon: ShoppingBag, label: 'Marketplace', href: '/marketplace' },
    { icon: BookOpen, label: 'Knowledge', href: '/articles' },
    { icon: Video, label: 'Videos', href: '/videos' },
    { icon: Sparkles, label: 'AI Assistant', href: '/ai' },
    { icon: Trophy, label: 'Achievements', href: '/achievements' },
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: UserIcon, label: 'Profile', href: '/profile' },
  ];

  if (!currentUser) return null;

  // Prefetch mapping for important routes — keeps chunks ready on hover/focus
  const prefetchMap: Record<string, () => void> = {
    '/': () => import('@/pages/home'),
    '/profile': () => import('@/pages/profile'),
    '/messages': () => import('@/pages/messages'),
    '/notifications': () => import('@/pages/notifications'),
    '/explore': () => import('@/pages/explore'),
  };

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[280px] border-r border-border/40 bg-sidebar/70 backdrop-blur-2xl h-full p-5 justify-between min-h-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="flex flex-col min-h-0 gap-4">
          <Link href="/" className="flex items-center gap-2 px-2 py-1 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold text-lg shadow-primary/30 shadow-lg">
              Y
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Yor Talks</span>
          </Link>

          <nav className="space-y-1 overflow-y-auto hide-scrollbar min-h-0 pr-1">
            {navItems.filter(i => !i.hideDesktop).map((item) => {
              const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    onMouseEnter={() => prefetchMap[item.href]?.()}
                    onFocus={() => prefetchMap[item.href]?.()}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 group relative ${isActive ? 'bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20' : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground hover:translate-x-1'}`}
                  >
                    <item.icon className={`w-[22px] h-[22px] shrink-0 ${isActive ? 'text-primary-foreground' : 'group-hover:scale-110 transition-transform'}`} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[15px] flex-1">{item.label}</span>
                    {item.label === 'Notifications' && unreadCount > 0 && (
                      <span className={`text-[11px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center ${isActive ? 'bg-background text-primary' : 'bg-primary text-primary-foreground'}`}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          <Link href="/" className="shrink-0 mt-2">
            <Button className="w-full rounded-2xl shadow-lg shadow-primary/25 gap-2 h-12 font-medium transition-transform hover:scale-[1.02]">
              <Plus className="w-5 h-5" />
              Create Post
            </Button>
          </Link>
        </div>

        <div>
          <button 
            className="flex items-center gap-3 w-full px-3 py-3 rounded-2xl hover:bg-muted/80 transition-all duration-300 text-left text-muted-foreground hover:text-foreground mb-4 text-sm border border-transparent hover:border-border/50"
            onClick={() => setCmdOpen(true)}
          >
            <Command className="w-[18px] h-[18px]" />
            <span className="flex-1">Search</span>
            <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/80 cursor-pointer transition-all duration-300 w-full border border-transparent hover:border-border/50">
                <Avatar className="w-10 h-10 ring-2 ring-transparent hover:ring-primary/30 transition-all shadow-sm">
                  <AvatarImage src={currentUser.avatarUrl} />
                  <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentUser.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{currentUser.username}</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation('/profile')}>
                <UserIcon className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <span className="flex items-center"><Command className="mr-2 h-4 w-4" />Light Mode</span> : <span className="flex items-center"><Command className="mr-2 h-4 w-4" />Dark Mode</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center justify-between p-4 glass z-20">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-display font-bold shadow-lg">
              Y
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setCmdOpen(true)}>
              <Search className="w-5 h-5" />
            </Button>
            <Avatar className="w-8 h-8 cursor-pointer" onClick={() => setLocation('/profile')}>
              <AvatarImage src={currentUser.avatarUrl} />
              <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-20 md:pb-0 relative z-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-border/50 pb-safe z-30">
        <div className="flex items-center justify-around p-2">
          {navItems.filter(i => ['Home', 'Explore', 'Notifications', 'Messages', 'Profile'].includes(i.label)).map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`p-3 rounded-full flex flex-col items-center justify-center transition-all ${isActive ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}`}>
                  <item.icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.5 : 2} />
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* CmdK Dialog */}
      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Search users, posts, communities, or jump to a page..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navItems.map((item) => (
              <CommandItem key={item.href} onSelect={() => { setLocation(item.href); setCmdOpen(false); }}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            ))}
            <CommandItem onSelect={() => { setLocation('/settings'); setCmdOpen(false); }}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="People">
            {Object.values(users).slice(0, 5).map((user) => (
              <CommandItem key={user.id} onSelect={() => { setLocation(`/profile/${user.id}`); setCmdOpen(false); }}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>{user.displayName}</span>
                <span className="ml-2 text-xs text-muted-foreground">@{user.username}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Communities">
            {communities.slice(0, 5).map((c) => (
              <CommandItem key={c.id} onSelect={() => { setLocation(`/communities/${c.id}`); setCmdOpen(false); }}>
                <Users className="mr-2 h-4 w-4" />
                <span>{c.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Recent Posts">
            {posts.slice(0, 4).map((p) => (
              <CommandItem key={p.id} onSelect={() => { setLocation(`/post/${p.id}`); setCmdOpen(false); }}>
                <Mail className="mr-2 h-4 w-4" />
                <span className="truncate">{p.content}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
