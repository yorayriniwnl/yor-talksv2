import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ThemeMorpher } from '@/components/ui/ThemeMorpher';
import { navigationGroups, isNavigationActive } from './navigation';

export function NavigationDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [location] = useLocation();
  const [query, setQuery] = useState('');
  const trigger = useRef<HTMLElement | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);
  const groups = navigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => `${item.label} ${group.label}`.toLowerCase().includes(query.trim().toLowerCase())),
  })).filter(group => group.items.length);

  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent ref={panel} tabIndex={-1} side="left" className="yor-navigation-drawer" onOpenAutoFocus={event => {
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      event.preventDefault();
      panel.current?.focus();
    }} onCloseAutoFocus={event => {
      event.preventDefault();
      trigger.current?.focus();
    }}>
      <SheetHeader className="text-left pr-8">
        <SheetTitle className="font-serif text-2xl">Your corner of Yor</SheetTitle>
        <SheetDescription>People, ideas, and a little more you.</SheetDescription>
      </SheetHeader>
      <label className="yor-navigation-search">
        <Search size={18} aria-hidden="true" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a feature" aria-label="Find a feature" type="search" autoComplete="off" />
      </label>
      <nav aria-label="All features" className="yor-navigation-sections">
        {groups.map(group => <section key={group.label} aria-label={group.label}>
          <h2>{group.label}</h2>
          <div>{group.items.map(({ icon: Icon, label, path }) => <Link key={path} href={path} onClick={() => onOpenChange(false)} aria-current={isNavigationActive(location, path) ? 'page' : undefined}>
            <Icon size={19} aria-hidden="true" /><span>{label}</span>
          </Link>)}</div>
        </section>)}
        {groups.length === 0 && <p role="status" className="py-8 text-center text-sm text-muted-foreground">No features match “{query}”. Try a shorter name.</p>}
      </nav>
      <div className="yor-navigation-footer"><span>Your space, your pace.</span><ThemeMorpher /></div>
    </SheetContent>
  </Sheet>;
}
