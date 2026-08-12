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

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [location, setLocation] = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const addPost = useAppStore((state) => state.addPost);
  const notifications = useAppStore((state) => state.notifications);
  const unreadNotifs = notifications.filter(n => !n.read).length;

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
    { icon: ShoppingBag, label: 'Points Shop', path: '/points-shop' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans relative overflow-hidden">
      <CommandPalette />
      <CursorGlow />
      
      {/* ── DESKTOP INSTAGRAM SIDEBAR (Left Column) ────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 border-r border-border/40 glass-heavy backdrop-blur-xl px-4 py-6 z-40 shrink-0">
        
        {/* Brand Logo & Live Theme Morpher */}
        <div className="flex items-center justify-between mb-8 px-1">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary via-purple-500 to-accent grid place-items-center text-white text-xl font-bold font-display shadow-md glow-neon-primary group-hover:scale-105 transition-transform">
              Y
            </div>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-xl tracking-tight leading-none text-foreground">Yor Talks</span>
              <span className="text-[0.62rem] font-mono text-muted-foreground tracking-widest uppercase mt-0.5">Multiverse</span>
            </div>
          </Link>
          <ThemeMorpher />
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
                  "flex items-center gap-4 w-full px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group text-muted-foreground hover:text-foreground hover:bg-muted/50 hover-lift",
                  isActive && "text-foreground bg-primary/10 font-bold border border-primary/20 border-l-2 border-l-primary"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-primary fill-primary/20 drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]")} />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-mono text-[0.62rem] font-bold px-1.5 py-0.2 rounded-full ring-2 ring-background">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Mini Profile Snippet */}
        {currentUser && (
          <Link href={`/profile/${currentUser.id}`} className="flex items-center gap-3 p-3 rounded-2xl glass-heavy hover-lift hover:bg-muted/60 transition-colors border border-border/40 cursor-pointer">
            <Avatar className="w-10 h-10 border border-border/50 shrink-0">
              <AvatarImage src={currentUser.avatarUrl} />
              <AvatarFallback className="font-display font-bold">{currentUser.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs truncate leading-tight">{currentUser.displayName}</h4>
              <p className="text-[0.68rem] text-muted-foreground font-mono truncate">@{currentUser.username}</p>
            </div>
          </Link>
        )}
      </aside>

      {/* ── MAIN CONTENT AREA ────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 min-h-screen">
        <main className="w-full h-full">
          {children}
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ─────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-heavy border-t border-border/40 px-3 py-2 flex items-center justify-around">
        <button onClick={() => setLocation('/')} className={cn("p-2 text-muted-foreground relative", location === '/' && "text-primary")}>
          <Home className="w-6 h-6" />
          {location === '/' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <button onClick={() => setLocation('/explore')} className={cn("p-2 text-muted-foreground relative", location === '/explore' && "text-primary")}>
          <Compass className="w-6 h-6" />
          {location === '/explore' && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
        </button>
        <button onClick={() => setIsComposing(true)} className="p-2.5 rounded-full bg-primary text-primary-foreground glow-neon-primary -mt-5 shadow-2xl relative">
          <PlusSquare className="w-6 h-6" />
        </button>
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
    </div>
  );
}
