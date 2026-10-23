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
    let current = true;
    setResult(null);
    setError(false);
    if (!open || term.length < 2) { setPending(false); return; }
    setPending(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await api.request<SearchResult>('/search?q=' + encodeURIComponent(term), { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]) });
        if (!Array.isArray(data.users) || !Array.isArray(data.posts)) throw new Error('Invalid search response');
        if (current) setResult({
          query: term,
          users: data.users.filter(user => user && typeof user.id === 'string' && typeof user.username === 'string').slice(0, 6).map(user => ({
            id: user.id, username: user.username, displayName: user.fullName || user.username, avatarUrl: user.avatarUrl ?? undefined,
          })),
          posts: data.posts.filter(post => post && typeof post.id === 'string' && typeof post.content === 'string').slice(0, 5),
        });
      } catch { if (current) setError(true); }
      finally { if (current) setPending(false); }
    }, 300);
    return () => { current = false; window.clearTimeout(timer); controller.abort(); };
  }, [open, term, revision]);
  const people = useMemo(() => {
    if (term.length >= 2) return result?.query === term ? result.users : [];
    return Object.values(knownUsers).filter(user => !term || (user.displayName + ' ' + user.username).toLowerCase().includes(term.toLowerCase())).slice(0, 4);
  }, [knownUsers, result, term]);
  const posts = result?.query === term ? result.posts : [];
  const groups = useMemo(() => {
    if (term) return navigationGroups.map(group => ({ ...group, items: group.items.filter(item => (item.label + ' ' + item.path.slice(1).replaceAll('-', ' ')).toLowerCase().includes(term.toLowerCase())) })).filter(group => group.items.length);
    if (browseAll) return navigationGroups;
    const quickPaths = new Set(['/', '/explore', '/messages', '/saved', '/profile', '/settings']);
    return [{ label: 'Quick jump', items: navigationGroups.flatMap(group => group.items).filter(item => quickPaths.has(item.path)) }];
  }, [term, browseAll]);
  const targets = [
    ...people.map(person => ({ key: 'person:' + person.id, path: '/profile/' + person.id })),
    ...posts.map(post => ({ key: 'post:' + post.id, path: '/post/' + post.id })),
    ...groups.flatMap(group => group.items.map(item => ({ key: 'route:' + item.path, path: item.path }))),
  ];
  const activeKey = targets[activeIndex]?.key;
  useEffect(() => { setActiveIndex(0); }, [term, result, open, browseAll]);
  useEffect(() => {
    if (open && activeKey) document.getElementById(optionId(activeKey))?.scrollIntoView({ block: 'nearest' });
  }, [activeKey, open]);
  const navigate = (path: string) => {
    navigating.current = true;
    changeOpen(false);
    setLocation(path);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => targets.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + targets.length) % targets.length : 0);
    } else if (event.key === 'Enter' && targets[activeIndex]) {
      event.preventDefault(); navigate(targets[activeIndex].path);
    }
  };
  const optionProps = (key: string) => ({
    id: optionId(key), role: 'option', 'aria-selected': activeKey === key, tabIndex: -1,
    className: 'yor-search-option' + (activeKey === key ? ' is-selected' : ''),
    onMouseMove: () => setActiveIndex(targets.findIndex(target => target.key === key)),
  });
  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogContent className="yor-search-dialog" onOpenAutoFocus={event => { event.preventDefault(); inputRef.current?.focus(); }} onCloseAutoFocus={event => {
      event.preventDefault();
      if (navigating.current) document.getElementById('main-content')?.focus({ preventScroll: true });
      else restoreFocus.current?.focus({ preventScroll: true });
    }}>
      <DialogTitle className="sr-only">Search Yor</DialogTitle>
      <DialogDescription className="sr-only">Find people, posts, and every feature. Use the arrow keys to choose a result and Enter to open it.</DialogDescription>
      <div className="yor-search-field">
        <Search size={21} aria-hidden="true" />
        <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={handleKeyDown} role="combobox" aria-label="Search people, posts, and features" aria-autocomplete="list" aria-controls="yor-search-results" aria-expanded="true" aria-activedescendant={activeKey ? optionId(activeKey) : undefined} placeholder="What are you looking for?" autoComplete="off" maxLength={200} />
      </div>
      <div className="yor-search-status" aria-live="polite">
        {pending && <span><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Searching people and posts…</span>}
        {error && <div><p>People and posts couldn’t be searched. Your shortcuts are still available.</p><button type="button" onClick={() => setRevision(value => value + 1)}>Retry search</button></div>}
        {!pending && !error && term.length >= 2 && result && <span>{people.length + posts.length} matching people and posts</span>}
      </div>
      <div id="yor-search-results" role="listbox" aria-label="Search results" className="yor-search-results">
        {people.length > 0 && <div role="group" aria-label={term ? 'People' : 'People you know'}>
          <p aria-hidden="true">{term ? 'People' : 'People you know'}</p>
          {people.map(person => <button key={person.id} type="button" {...optionProps('person:' + person.id)} onClick={() => navigate('/profile/' + person.id)}>
            <Avatar className="h-9 w-9 shrink-0"><AvatarImage src={person.avatarUrl} alt="" /><AvatarFallback>{person.displayName.charAt(0)}</AvatarFallback></Avatar>
            <span><strong>{person.displayName}</strong><small>@{person.username}</small></span><ArrowUpRight size={15} aria-hidden="true" />
          </button>)}
        </div>}
        {posts.length > 0 && <div role="group" aria-label="Posts"><p aria-hidden="true">Posts</p>{posts.map(post => <button key={post.id} type="button" {...optionProps('post:' + post.id)} onClick={() => navigate('/post/' + post.id)}>
          <FileText size={20} aria-hidden="true" /><span className="line-clamp-2">{post.content || 'Photo or video post'}</span><ArrowUpRight size={15} aria-hidden="true" />
        </button>)}</div>}
        {groups.map(group => <div role="group" aria-label={group.label} key={group.label}><p aria-hidden="true">{group.label}</p><div className="yor-search-shortcuts">{group.items.map(({ icon: Icon, label, path }) => <button key={path} type="button" {...optionProps('route:' + path)} onClick={() => navigate(path)}><Icon size={18} aria-hidden="true" /><span>{label}</span></button>)}</div></div>)}
      </div>
      {targets.length === 0 && !pending && !error && <div role="status" className="yor-search-empty"><Search size={24} aria-hidden="true" /><p>No matches for “{term}”</p><span>Try a name, interest, or shorter phrase.</span></div>}
      <footer className="yor-search-footer"><span>↑ ↓ to choose · Enter to open</span>{!term && <button type="button" onClick={() => setBrowseAll(value => !value)}>{browseAll ? 'Quick shortcuts' : 'Browse all features'}</button>}</footer>
    </DialogContent>
  </Dialog>;
}
