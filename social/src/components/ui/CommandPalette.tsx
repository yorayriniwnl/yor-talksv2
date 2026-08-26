import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X,
  Activity, Compass, Film, Globe2, MessageCircle, Bell, User, Users, FileText, Orbit, WandSparkles,
  Video, Radio, Scissors,
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

  const [aiResults, setAiResults] = useState<{id: string, content: string, score: number}[]>([]);
  const [searchingAI, setSearchingAI] = useState(false);

  useEffect(() => {
    let active = true;
    if (query.length > 3) {
      const delay = setTimeout(async () => {
        setSearchingAI(true);
        try {
          const res = await api.request<any>(`/ai/search?q=${encodeURIComponent(query)}`);
          if (active) setAiResults(res?.results || []);
        } catch (e) {
          console.error(e);
        } finally {
          if (active) setSearchingAI(false);
        }
      }, 500);
      return () => { active = false; clearTimeout(delay); };
    } else {
      setAiResults([]);
      setSearchingAI(false);
    }
    return () => { active = false; };
  }, [query]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (path: string) => {
    sounds.playSwoosh();
    setLocation(path);
    setIsOpen(false);
    setQuery('');
  };

  const filteredUsers = query
    ? userList.filter((u) => 
        (u.displayName || u.username || '').toLowerCase().includes(query.toLowerCase()) || 
        (u.username || '').toLowerCase().includes(query.toLowerCase())
      )
    : userList.slice(0, 4);

  const navigationGroups = [
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
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-start justify-center pt-20 px-4 font-sans"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full max-w-xl surface-1 border border-border/50 rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Bar Input */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                <Search className="w-5 h-5 text-primary shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search people, routes, or features... (ESC to exit)"
                  className="w-full bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground font-serif"
                />
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                
                  {/* AI Semantic Results Section */}
                  {query.length > 3 && (
                    <div className="mt-4">
                      <h4 className="flex items-center gap-2 text-[0.68rem] font-mono font-bold uppercase text-primary tracking-wider mb-2 px-2 glow-neon-primary">
                        <BrainCircuit className="w-3 h-3" />
                        AI Semantic Search {searchingAI && <span className="animate-pulse">...</span>}
                      </h4>
                      <div className="space-y-2">
                        {aiResults.map((r, i) => (
                          <div key={i} className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-start gap-3 cursor-pointer hover:bg-primary/20 transition-colors">
                            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-foreground">{r.content}</p>
                              <span className="text-[10px] text-primary/70 font-mono mt-1 block">Match Score: {(r.score * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                        {!searchingAI && aiResults.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2">No semantic matches found.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Users Section */}
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
                          onClick={() => handleNavigate(`/profile/${u.id}`)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-muted/60 transition-colors text-left group"
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

                {/* Navigation Groups Section */}
                {!query && navigationGroups.map((group) => (
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
                            onClick={() => handleNavigate(item.path)}
                            className="flex items-center gap-3 p-3 rounded-2xl surface-1 border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                          >
                            <Icon className="w-4 h-4 text-primary shrink-0 transition-transform group-hover:scale-110" />
                            <span className="font-bold text-xs truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="px-5 py-2.5 surface-1 border-t border-border/30 flex items-center justify-between text-[0.68rem] font-mono text-muted-foreground">
                <span>Press <kbd className="px-1.5 py-0.5 rounded bg-muted font-bold text-foreground">Ctrl + K</kbd> anytime to toggle</span>
                <span>Yor Talks Multiverse</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
