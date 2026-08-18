import { ReactNode, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { 
  Home, Compass, Film, MessageCircle, Heart, PlusSquare, 
  UserRound, Settings, ImageIcon, Send, ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { ThemeMorpher } from '@/components/ui/ThemeMorpher';
import { CursorGlow } from '@/components/ui/CursorGlow';
import { FloatingParticles } from '@/components/ui/FloatingParticles';
import { ScrollProgress } from '@/components/ui/ScrollProgress';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { NoiseOverlay } from '@/components/ui/NoiseOverlay';
import { GlobalAudioPlayer } from '@/components/player/GlobalAudioPlayer';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const addPost = useAppStore((state) => state.addPost);
  const notifications = useAppStore((state) => state.notifications);
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const handleCreatePost = () => {
    if (!postContent.trim()) return;
    const media = imageUrl.trim() ? [imageUrl.trim()] : undefined;
    addPost(postContent, media);
    setPostContent('');
    setImageUrl('');
    setIsComposing(false);
  };

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Compass, label: 'Explore', path: '/explore' },
    { icon: Film, label: 'Reels', path: '/videos' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Heart, label: 'Notifications', path: '/notifications', badge: unreadNotifs > 0 ? unreadNotifs : null },
    { icon: PlusSquare, label: 'Create', action: () => setIsComposing(true) },
    { icon: UserRound, label: 'Profile', path: currentUser ? `/profile/${currentUser.id}` : '/' },
    { icon: ShoppingBag, label: 'Points Vault', path: '/points-shop' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="app-shell relative flex min-h-screen overflow-hidden bg-background font-sans text-foreground">
      <ScrollProgress />
      <CommandPalette />
      <div className="app-atmosphere" aria-hidden="true">
        <span className="app-atmosphere__field app-atmosphere__field--primary" />
        <span className="app-atmosphere__field app-atmosphere__field--accent" />
        <FloatingParticles />
      </div>
      <CursorGlow />
      <NoiseOverlay />
      
      {/* ── DESKTOP INSTAGRAM SIDEBAR (Left Column) ────────────────────── */}
      <aside className={cn(
        "app-shell__rail hidden h-screen shrink-0 flex-col border-r border-border/40 py-6 backdrop-blur-xl md:sticky md:top-0 md:flex relative",
        sidebarCollapsed ? "w-[72px] px-2" : "w-64 lg:w-72 px-4",
        "transition-all duration-300 ease-out"
      )}>
        
        {/* Brand Logo & Live Theme Morpher */}
        <div className={cn("flex items-center mb-8", sidebarCollapsed ? "justify-center px-0" : "justify-between px-1")}>
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-purple-500 to-accent grid place-items-center text-white text-xl font-bold font-display shadow-md glow-neon-primary group-hover:scale-105 transition-transform shrink-0">
              Y
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <span className="font-display font-extrabold text-xl tracking-tight leading-none text-foreground">Yor Talks</span>
                <span className="text-[0.62rem] font-mono text-primary tracking-wider uppercase mt-0.5 font-bold">Bharat Edition 🇮🇳</span>
              </div>
            )}
          </Link>
          {!sidebarCollapsed && <ThemeMorpher />}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse sidebar"
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
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="rotate-180">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path ? (item.path === '/' ? location === '/' : location.startsWith(item.path)) : false;

            return (
              <button
                key={item.label}
                onClick={() => {
                  if (item.action) item.action();
                  else if (item.path) setLocation(item.path);
                }}
                className={cn(
                  "flex items-center w-full rounded-2xl text-sm font-semibold transition-all duration-200 group text-muted-foreground hover:text-foreground hover:bg-muted/50 hover-lift",
                  sidebarCollapsed ? "justify-center px-2 py-3 gap-0" : "gap-4 px-3.5 py-3",
                  isActive && "text-foreground bg-primary/10 font-bold border border-primary/20 border-l-2 border-l-primary"
                )}
              >
                {item.label === 'Create' ? (
                  <MagneticButton>
                    <div className={cn("flex items-center w-full", sidebarCollapsed ? "justify-center gap-0" : "gap-4")}>
                      <div className="relative">
                        <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary fill-primary/20 drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]")} />
                        {item.badge && (
                          <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-mono text-[0.62rem] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-background">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </div>
                  </MagneticButton>
                ) : (
                  <>
                    <div className="relative">
                      <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary fill-primary/20 drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]")} />
                      {item.badge && (
                        <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-mono text-[0.62rem] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-background">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Mini Profile & Account Switcher */}
        {currentUser && (
          <div className="space-y-2">
            <div className={cn("flex items-center rounded-2xl glass-heavy hover-lift border border-border/40 p-2.5", sidebarCollapsed ? "justify-center p-2" : "gap-2.5")}>
              <Link href={`/profile/${currentUser.id}`} className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group">
                <Avatar className="w-9 h-9 border border-border/50 shrink-0 group-hover:ring-2 ring-primary/40 transition-all">
                  <AvatarImage src={currentUser.avatarUrl} />
                  <AvatarFallback className="font-display font-bold">{currentUser.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs truncate leading-tight group-hover:text-primary transition-colors">{currentUser.displayName}</h4>
                    <p className="text-[0.68rem] text-muted-foreground font-mono truncate">@{currentUser.username}</p>
                  </div>
                )}
              </Link>
              {!sidebarCollapsed && (
                <AccountSwitcherDialog />
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <div className="app-shell__content min-h-screen min-w-0 flex-1">
        <main className="w-full h-full">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ─────────────────────────────────── */}
      <nav className="app-shell__mobile-nav fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/40 px-3 py-2 md:hidden">
        <button onClick={() => setLocation('/')} className={cn("p-2 text-muted-foreground relative", location === '/' && "text-primary")}>
          <Home className="w-6 h-6" />
          {location === '/' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <button onClick={() => setLocation('/explore')} className={cn("p-2 text-muted-foreground relative", location === '/explore' && "text-primary")}>
          <Compass className="w-6 h-6" />
          {location === '/explore' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <MagneticButton intensity={0.4}>
          <button onClick={() => setIsComposing(true)} className="p-2.5 rounded-full bg-primary text-primary-foreground glow-neon-primary -mt-5 shadow-2xl relative">
            <PlusSquare className="w-6 h-6" />
          </button>
        </MagneticButton>
        <button onClick={() => setLocation('/messages')} className={cn("p-2 text-muted-foreground relative", location === '/messages' && "text-primary")}>
          <MessageCircle className="w-6 h-6" />
          {location === '/messages' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <button onClick={() => currentUser && setLocation(`/profile/${currentUser.id}`)} className={cn("p-2 text-muted-foreground relative", location.startsWith('/profile') && "text-primary")}>
          <UserRound className="w-6 h-6" />
          {location.startsWith('/profile') && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
      </nav>

      {/* ── INSTAGRAM CREATE POST MODAL ──────────────────────────────────── */}
      <Dialog open={isComposing} onOpenChange={setIsComposing}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl font-sans">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl text-center">Create new post</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {currentUser && (
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={currentUser.avatarUrl} />
                  <AvatarFallback className="font-display font-bold">{currentUser.displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-bold text-sm">{currentUser.displayName}</span>
              </div>
            )}

            <textarea
              autoFocus
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Write a caption..."
              className="w-full min-h-[120px] bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground font-serif leading-relaxed"
            />

            {/* Optional Image URL Input */}
            <div className="space-y-2 pt-2 border-t border-border/30">
              <label className="text-xs font-mono font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-primary" /> Image URL (Optional)
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full h-10 rounded-xl surface-1 border border-border/50 px-3 text-xs outline-none focus:border-primary/50"
              />
              {imageUrl.trim() && (
                <div className="h-36 rounded-xl overflow-hidden bg-muted mt-2">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCreatePost}
              disabled={!postContent.trim()}
              className={cn(
                "w-full rounded-xl font-bold text-xs h-11 transition-all",
                postContent.trim() ? "glow-neon-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Share Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GlobalAudioPlayer />
    </div>
  );
}

function AccountSwitcherDialog() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const currentUser = useAppStore((state) => state.currentUser);
  const users = useAppStore((state) => state.users);
  const switchAccount = useAppStore((state) => state.switchAccount);

  const userList = Object.values(users);
  const filteredUsers = userList.filter((u) => 
    u.displayName.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.bio && u.bio.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        title="Switch Account"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </button>

      <DialogContent className="max-w-md rounded-2xl glass-heavy border border-border/50 max-h-[85vh] flex flex-col p-5">
        <DialogHeader className="pb-3 border-b border-border/30">
          <DialogTitle className="font-display font-bold text-lg flex items-center justify-between">
            <span>Switch Account</span>
            <span className="text-xs font-mono font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {userList.length} Active Personas
            </span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-sans">
            Instantly switch accounts to create content, test multi-agent interactions, or browse personalized feeds.
          </p>
        </DialogHeader>

        <div className="py-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts by name, username, or role..."
            className="w-full h-10 rounded-xl surface-1 border border-border/50 px-3 text-xs outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground font-sans"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[380px] custom-scrollbar">
          {filteredUsers.map((user) => {
            const isCurrent = currentUser?.id === user.id;
            return (
              <button
                key={user.id}
                onClick={() => {
                  switchAccount(user.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left border cursor-pointer group",
                  isCurrent 
                    ? "bg-primary/15 border-primary/40 ring-1 ring-primary/30" 
                    : "hover:bg-muted/60 border-transparent hover:border-border/40"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="w-10 h-10 border border-border/50">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="font-display font-bold text-xs">{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {isCurrent && (
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] ring-2 ring-background">
                      ✓
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs truncate leading-tight group-hover:text-primary transition-colors">{user.displayName}</h4>
                    {user.verified && (
                      <span className="text-[10px] text-sky-400 font-bold" title="Verified">✓</span>
                    )}
                  </div>
                  <p className="text-[0.68rem] text-muted-foreground font-mono truncate">@{user.username}</p>
                  {user.bio && (
                    <p className="text-[0.68rem] text-muted-foreground/80 line-clamp-1 mt-0.5 font-sans">{user.bio}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[0.65rem] font-mono text-muted-foreground block font-bold">
                    {(user.followers || 0).toLocaleString()}
                  </span>
                  <span className="text-[0.6rem] text-muted-foreground/60 font-sans">followers</span>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
