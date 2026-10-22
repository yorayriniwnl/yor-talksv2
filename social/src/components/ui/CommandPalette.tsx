import { useState, useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { useLocation } from 'wouter';
import { ArrowUpRight, Search, Loader2, FileText } from 'lucide-react';
import { api, type BackendUser } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { navigationGroups, OPEN_SEARCH_EVENT } from '@/components/layout/navigation';

type SearchProfile = { id: string; username: string; displayName: string; avatarUrl?: string };
type SearchPost = { id: string; content: string };
type SearchResult = { users: BackendUser[]; posts: SearchPost[] };
const optionId = (key: string) => 'yor-search-' + encodeURIComponent(key);

export function CommandPalette() {
  const [, setLocation] = useLocation();
  const knownUsers = useAppStore(state => state.users);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ query: string; users: SearchProfile[]; posts: SearchPost[] } | null>(null);
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  const [revision, setRevision] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [browseAll, setBrowseAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const navigating = useRef(false);
  const term = query.trim();
  const show = () => {
    restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    navigating.current = false;
    setOpen(true);
  };
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) { setQuery(''); setResult(null); setError(false); setBrowseAll(false); }
  };
  useEffect(() => {
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (!open && document.querySelector('[role="dialog"][data-state="open"]')) return;
        event.preventDefault();
        if (open) changeOpen(false); else show();
      }
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener(OPEN_SEARCH_EVENT, show);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener(OPEN_SEARCH_EVENT, show);
    };
  }, [open]);
  useEffect(() => {
    if (isOpen && activeTargetId) document.getElementById(activeTargetId)?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeTargetId]);

  useEffect(() => {
    setActiveIndex(0);
  }, [isOpen, query, paletteTargets.length]);

  const handlePaletteKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => targets.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + targets.length) % targets.length : 0);
    } else if (event.key === 'Enter' && targets[activeIndex]) {
      event.preventDefault(); navigate(targets[activeIndex].path);
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
              className="surface-1 flex max-h-[calc(100dvh-6rem)] w-full max-w-xl flex-col overflow-hidden rounded-[1.5rem] border border-border/50 shadow-2xl"
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
                  aria-labelledby="yor-command-palette-title"
                  aria-controls="yor-command-palette-results"
                  aria-expanded="true"
                  aria-activedescendant={activeTargetId}
                  placeholder="Search people, routes, or featuresâ€¦"
                  className="w-full bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground font-serif"
                />
                <button type="button" onClick={closePalette} aria-label="Close search" className="rounded-full p-2 text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div id="yor-command-palette-results" role="listbox" aria-label="Search results" className="custom-scrollbar min-h-0 max-h-[min(60vh,32rem)] flex-1 space-y-5 overflow-y-auto p-3 sm:space-y-6 sm:p-4">
                
                  {/* AI Semantic Results Section */}
                  {query.length > 3 && (
                    <div className="mt-4" role="group" aria-label="Matching posts">
                      <h4 aria-hidden="true" className="flex items-center gap-2 text-[0.68rem] font-mono font-bold uppercase text-primary tracking-wider mb-2 px-2 glow-neon-primary">
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
                  <div role="group" aria-label={query ? 'Matching profiles' : 'Suggested people'}>
                    <h4 aria-hidden="true" className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground tracking-wider mb-2 px-2">
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
                  <div key={group.label} role="group" aria-label={group.label}>
                    <h4 aria-hidden="true" className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground tracking-wider mb-2 px-2">
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
