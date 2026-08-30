import { useState, useEffect, useMemo, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X,
  Activity, Compass, Film, Globe2, MessageCircle, Bell, User, Users, FileText, Orbit, WandSparkles,
  Video, Radio, Megaphone, Scissors,
  Trophy, Swords, Gamepad2, Target, Award, Medal, Calendar,
  BarChart3, Store, ShoppingCart, Briefcase, Shirt, Layers,
  ShoppingBag, Coins, Ticket, Shield, Building2, HandCoins,
  Crown, Star, Brain,
  LayoutDashboard, Settings, Headphones, Mic2, Key, Gauge
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sounds } from '@/lib/sound';

export function CommandPalette() {
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const userList = Object.values(useAppStore((s) => s.users));

  const [smartResults, setSmartResults] = useState<{ id: string; content: string }[]>([]);
  const [searchingSmart, setSearchingSmart] = useState(false);
  const [smartSearchFailed, setSmartSearchFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const paletteRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    if (query.length > 3) {
      const delay = setTimeout(async () => {
        setSearchingSmart(true);
        setSmartSearchFailed(false);
        try {
          const res = await api.request<{ posts?: Array<{ id: string; content: string }> }>(`/search?q=${encodeURIComponent(query)}`);
          if (active) setSmartResults((res?.posts ?? []).slice(0, 4));
        } catch {
          if (active) {
            setSmartResults([]);
            setSmartSearchFailed(true);
          }
        } finally {
          if (active) setSearchingSmart(false);
        }
      }, 500);
      return () => { active = false; clearTimeout(delay); };
    } else {
      setSmartResults([]);
      setSearchingSmart(false);
      setSmartSearchFailed(false);
    }
    return () => { active = false; };
  }, [query]);


  const closePalette = () => {
    setIsOpen(false);
    setQuery('');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (isOpen) {
          closePalette();
        } else {
          restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setIsOpen(true);
        }
      }
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        closePalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => searchInputRef.current?.focus());

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !paletteRef.current) return;
      const focusable = Array.from(paletteRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => !element.hasAttribute('aria-hidden'));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleTab);
      document.body.style.overflow = previousOverflow;
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (restoreTarget) window.requestAnimationFrame(() => restoreTarget.focus());
    };
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    sounds.playSwoosh();
    setLocation(path);
    closePalette();
  };

  const filteredUsers = query
    ? userList.filter((u) => 
        (u.displayName || u.username || '').toLowerCase().includes(query.toLowerCase()) || 
        (u.username || '').toLowerCase().includes(query.toLowerCase())
      )
    : userList.slice(0, 4);

  const navigationGroups = useMemo(() => [
    {
      label: 'Living internet',
      items: [
        { icon: Orbit, label: 'Orbit', path: '/' },
        { icon: Activity, label: 'Pulse', path: '/pulse' },
        { icon: Globe2, label: 'Worlds', path: '/worlds' },
        { icon: WandSparkles, label: 'Dream Engine', path: '/dream' },
        { icon: MessageCircle, label: 'Inbox', path: '/messages' },
      ]
    },
    {
      label: 'Discover & create',
      items: [
        { icon: Compass, label: 'Explore', path: '/explore' },
        { icon: Film, label: 'Reels & Videos', path: '/videos' },
        { icon: Bell, label: 'Notifications', path: '/notifications' },
        { icon: Users, label: 'Legacy Communities', path: '/communities' },
        { icon: FileText, label: 'Articles', path: '/articles' },
        { icon: Radio, label: 'Live', path: '/live' },
        { icon: Megaphone, label: 'Broadcast Channels', path: '/channels' },
        { icon: Calendar, label: 'Events', path: '/events' },
      ]
    },
    {
      label: 'Gaming & Esports',
      items: [
        { icon: Trophy, label: 'Tournaments', path: '/tournaments' },
        { icon: Swords, label: 'Scrims', path: '/scrims' },
        { icon: Shield, label: 'Clans', path: '/clans' },
        { icon: Gamepad2, label: 'Arcade', path: '/arcade' },
        { icon: Target, label: 'Predictions', path: '/predictions' },
        { icon: Star, label: 'Achievements', path: '/achievements' },
        { icon: Award, label: 'Power Rankings', path: '/rankings' },
        { icon: Medal, label: 'Trophy Room', path: '/trophies' },
        { icon: Calendar, label: 'Esports Calendar', path: '/calendar' },
      ]
    },
    {
      label: 'Creator Tools',
      items: [
        { icon: Video, label: 'Creator Studio', path: '/studio' },
        { icon: Gauge, label: 'Control Room', path: '/control-room' },
        { icon: Shield, label: 'Moderation Command', path: '/moderation' },
        { icon: BarChart3, label: 'Analytics', path: '/analytics' },
        { icon: ShoppingCart, label: 'Creator Store', path: '/store' },
        { icon: Scissors, label: 'Clip Studio', path: '/clips' },
        { icon: Briefcase, label: 'Media Kit', path: '/media-kit' },
        { icon: Shirt, label: 'Merch Studio', path: '/merch' },
        { icon: Layers, label: 'Overlay Studio', path: '/overlays' },
      ]
    },
    {
      label: 'Economy',
      items: [
        { icon: Store, label: 'Marketplace', path: '/marketplace' },
        { icon: ShoppingBag, label: 'Game Bazaar', path: '/bazaar' },
        { icon: HandCoins, label: 'Bounties', path: '/bounties' },
        { icon: Building2, label: 'Clan Treasury', path: '/treasury' },
        { icon: Coins, label: 'Points Shop', path: '/points-shop' },
        { icon: Ticket, label: 'Battle Pass', path: '/pass' },
      ]
    },
    {
      label: 'Social & Tools',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Brain, label: 'AI Assistant', path: '/ai' },
        { icon: Headphones, label: 'Lounge', path: '/lounge' },
        { icon: Crown, label: 'Fan Club', path: '/fanclub' },
        { icon: Mic2, label: 'Squad Comms', path: '/comms' },
        { icon: Key, label: 'Custom Rooms', path: '/rooms' },
        { icon: Radio, label: 'Podcasts', path: '/podcasts' },
        { icon: Settings, label: 'Settings', path: '/settings' },
      ]
    },
  ], []);

  const matchingNavigationGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return navigationGroups;
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery)),
      }))
      .filter((group) => group.items.length > 0);
  }, [navigationGroups, query]);

  const visibleNavigationGroups = useMemo(() => {
    if (query.trim()) return matchingNavigationGroups;
    const quickPaths = new Set(['/', '/explore', '/messages', '/notifications', '/settings']);
    const items = navigationGroups.flatMap((group) => group.items).filter((item) => quickPaths.has(item.path));
    return items.length > 0 ? [{ label: 'Quick jump', items }] : [];
  }, [matchingNavigationGroups, navigationGroups, query]);

  const paletteTargets = useMemo(() => [
    ...smartResults.map((result) => ({ key: `post:${result.id}`, path: `/post/${result.id}` })),
    ...filteredUsers.map((user) => ({ key: `user:${user.id}`, path: `/profile/${user.id}` })),
    ...visibleNavigationGroups.flatMap((group) => group.items.map((item) => ({ key: `route:${item.path}`, path: item.path }))),
  ], [filteredUsers, smartResults, visibleNavigationGroups]);

  const activeTargetKey = paletteTargets[activeIndex]?.key;
  const activeTargetId = activeTargetKey
    ? `palette-${activeTargetKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [isOpen, query, paletteTargets.length]);

  const handlePaletteKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => paletteTargets.length ? (index + 1) % paletteTargets.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => paletteTargets.length ? (index - 1 + paletteTargets.length) % paletteTargets.length : 0);
    } else if (event.key === 'Enter') {
      const target = paletteTargets[activeIndex];
      if (target) {
        event.preventDefault();
        handleNavigate(target.path);
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center bg-background/80 px-4 pb-4 pt-[max(4.5rem,env(safe-area-inset-top))] font-sans backdrop-blur-xl"
            onClick={closePalette}
          >
            <motion.div
              ref={paletteRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="yor-command-palette-title"
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="surface-1 max-h-[calc(100dvh-6rem)] w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-border/50 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Bar Input */}
              <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3 sm:px-5 sm:py-4">
                <Search className="w-5 h-5 text-primary shrink-0" />
                <span id="yor-command-palette-title" className="sr-only">Search Yor</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handlePaletteKeyDown}
                  role="combobox"
                  aria-controls="yor-command-palette-results"
                  aria-expanded="true"
                  aria-activedescendant={activeTargetId}
                  placeholder="Search people, routes, or features…"
                  className="w-full bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground font-serif"
                />
                <button type="button" onClick={closePalette} aria-label="Close search" className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div id="yor-command-palette-results" role="listbox" aria-label="Search results" className="custom-scrollbar max-h-[min(60vh,32rem)] space-y-5 overflow-y-auto p-3 sm:space-y-6 sm:p-4">
                
                  {/* AI Semantic Results Section */}
                  {query.length > 3 && (
                    <div className="mt-4">
                      <h4 className="flex items-center gap-2 text-[0.68rem] font-mono font-bold uppercase text-primary tracking-wider mb-2 px-2 glow-neon-primary">
                        <BrainCircuit className="w-3 h-3" />
                        Smart search {searchingSmart && <span className="animate-pulse">...</span>}
                      </h4>
                      <div className="space-y-2">
                        {smartResults.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleNavigate(`/post/${r.id}`)}
                            aria-label={`Open matching post: ${r.content}`}
                            id={`palette-post-${r.id}`}
                            role="option"
                            aria-selected={activeTargetKey === `post:${r.id}`}
                            className={`w-full p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-start gap-3 text-left hover:bg-primary/20 transition-colors ${activeTargetKey === `post:${r.id}` ? 'ring-2 ring-primary/30' : ''}`}
                          >
                            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-foreground">{r.content}</p>
                              <span className="text-[10px] text-primary/70 font-mono mt-1 block">Open matching post</span>
                            </div>
                          </button>
                        ))}
                        {!searchingSmart && smartResults.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2">
                            {smartSearchFailed ? 'Smart search is unavailable right now. Try a profile or route search.' : 'No matching posts found.'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Users Section */}
                {filteredUsers.length > 0 && (
                  <div>
                    <h4 className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground tracking-wider mb-2 px-2">
                      {query ? 'Matching Profiles' : 'Suggested People'}
                    </h4>
                    <div className="space-y-1">
                      {filteredUsers.map((u) => {
                        const displayName = u.displayName || u.username || 'User';
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleNavigate(`/profile/${u.id}`)}
                            id={`palette-user-${u.id}`}
                            role="option"
                            aria-selected={activeTargetKey === `user:${u.id}`}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted/60 transition-colors text-left group ${activeTargetKey === `user:${u.id}` ? 'bg-primary/10 ring-1 ring-primary/20' : ''}`}
                          >
                            <Avatar className="w-9 h-9 border border-border/40 shrink-0">
                              <AvatarImage src={u.avatarUrl} />
                              <AvatarFallback className="font-display font-bold">{displayName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{displayName}</h5>
                              <p className="text-xs text-muted-foreground font-mono truncate">@{u.username}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Navigation Groups Section */}
                {visibleNavigationGroups.map((group) => (
                  <div key={group.label}>
                    <h4 className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground tracking-wider mb-2 px-2">
                      {group.label}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handleNavigate(item.path)}
                            id={`palette-route-${item.path.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                            role="option"
                            aria-selected={activeTargetKey === `route:${item.path}`}
                            className={`flex items-center gap-3 p-3 rounded-2xl surface-1 border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group ${activeTargetKey === `route:${item.path}` ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/20' : ''}`}
                          >
                            <Icon className="w-4 h-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
                            <span className="font-bold text-xs truncate">{item.label}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              ))}
              {paletteTargets.length === 0 && !searchingSmart && (
                <div role="status" className="rounded-2xl border border-dashed border-border/50 px-4 py-8 text-center">
                  <Search className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-foreground">No matches yet.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try a name, route, or a shorter phrase.</p>
                </div>
              )}
              </div>

              {/* Footer hint */}
              <div className="surface-1 flex items-center justify-between gap-3 border-t border-border/30 px-4 py-2.5 text-[0.68rem] font-mono text-muted-foreground sm:px-5">
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-bold text-foreground">Ctrl + K</kbd> anytime to toggle</span>
                <span className="hidden sm:inline">Yor Talks Multiverse</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
