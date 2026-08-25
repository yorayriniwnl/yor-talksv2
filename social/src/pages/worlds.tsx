import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  ArrowUpRight,
  Check,
  Globe2,
  LockKeyhole,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const WORLD_FILTERS = ['All worlds', 'Joined', 'Technology', 'Creative', 'Gaming', 'Culture'] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function matchesFilter(name: string, description: string, category: string, filter: string) {
  if (filter === 'All worlds') return true;
  const text = `${name} ${description} ${category}`.toLowerCase();
  const terms: Record<string, string[]> = {
    Technology: ['tech', 'code', 'ai', 'developer', 'engineering', 'startup'],
    Creative: ['art', 'design', 'film', 'music', 'photo', 'creator'],
    Gaming: ['game', 'esport', 'arcade', 'valorant', 'chess'],
    Culture: ['culture', 'language', 'dance', 'literature', 'social', 'community'],
  };
  return (terms[filter] ?? [filter.toLowerCase()]).some((term) => text.includes(term));
}

export default function Worlds() {
  const communities = useAppStore((state) => state.communities);
  const toggleMembership = useAppStore((state) => state.toggleCommunityMembership);
  const createCommunity = useAppStore((state) => state.createCommunity);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof WORLD_FILTERS)[number]>('All worlds');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const visibleWorlds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return communities
      .filter((world) => filter !== 'Joined' || world.isMember)
      .filter((world) => filter === 'Joined' || matchesFilter(world.name, world.description, world.category, filter))
      .filter((world) => !normalizedQuery || `${world.name} ${world.description} ${world.category}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => Number(b.isMember) - Number(a.isMember) || b.members - a.members);
  }, [communities, filter, query]);

  const joinedCount = communities.filter((world) => world.isMember).length;
  const totalPeople = communities.reduce((sum, world) => sum + world.members, 0);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      toast.error('Give your world a name with at least three characters.');
      return;
    }
    setCreating(true);
    try {
      await createCommunity(trimmedName, slugify(trimmedName), description.trim());
      setName('');
      setDescription('');
      setShowCreate(false);
      toast.success('Your world is live.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="yor-product-page worlds-page">
      <div className="yor-product-wrap">
        <section className="worlds-hero">
          <div className="worlds-hero__copy">
            <span className="yor-eyebrow"><Globe2 className="h-3.5 w-3.5" /> Worlds</span>
            <h1>Find a corner of the internet that feels alive.</h1>
            <p>
              Worlds hold people, rituals, projects, and memories around one shared obsession. KIIT is the first world; the shape is built to travel.
            </p>
            <div className="worlds-hero__actions">
              <Button onClick={() => setShowCreate(true)} className="yor-primary-action">
                <Plus className="h-4 w-4" /> Create a world
              </Button>
              <Link href="/explore" className="yor-secondary-action">
                Discover people <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="worlds-first-card" aria-label="KIIT is Yor's first world">
            <div className="worlds-first-card__orbit" aria-hidden="true">
              <span /><span /><span />
            </div>
            <div className="worlds-first-card__content">
              <span className="worlds-first-card__status"><i /> First world online</span>
              <strong>KIIT</strong>
              <p>A trusted starting point for a much larger universe.</p>
              <div>
                <span>{communities.length}<small>spaces</small></span>
                <span>{joinedCount}<small>joined</small></span>
                <span>{totalPeople.toLocaleString()}<small>memberships</small></span>
              </div>
            </div>
          </div>
        </section>

        <section className="worlds-toolbar" aria-label="Filter worlds">
          <div className="worlds-search">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search worlds, ideas, or interests"
              aria-label="Search worlds"
            />
          </div>
          <div className="worlds-filters">
            {WORLD_FILTERS.map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={cn(filter === item && 'is-active')}>
                {item}
              </button>
            ))}
          </div>
        </section>

        {visibleWorlds.length > 0 ? (
          <motion.section
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.055 } } }}
            className="worlds-grid"
          >
            {visibleWorlds.map((world, index) => (
              <motion.article
                key={world.id}
                variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.32 }}
                className={cn('world-card', index === 0 && 'world-card--featured')}
              >
                <Link href={`/communities/${world.id}`} className="world-card__media" aria-label={`Open ${world.name}`}>
                  {world.coverUrl ? <img src={world.coverUrl} alt="" /> : <div className="world-card__fallback" />}
                  <div className="world-card__veil" />
                  <span className="world-card__category">{world.category}</span>
                  {world.trending && <span className="world-card__signal"><Sparkles className="h-3 w-3" /> Rising</span>}
                </Link>
                <div className="world-card__body">
                  <Link href={`/communities/${world.id}`}>
                    <h2>{world.name}</h2>
                  </Link>
                  <p>{world.description || 'A new world is taking shape. Join early and help decide what it becomes.'}</p>
                  <div className="world-card__footer">
                    <span><Users className="h-4 w-4" /> {world.members.toLocaleString()}</span>
                    {world.visibility !== 'public' && <span><LockKeyhole className="h-3.5 w-3.5" /> {world.visibility}</span>}
                    <button
                      onClick={() => toggleMembership(world.id)}
                      className={cn('world-card__join', world.isMember && 'is-joined')}
                      aria-label={world.isMember ? `Leave ${world.name}` : `Join ${world.name}`}
                    >
                      {world.isMember ? <><Check className="h-3.5 w-3.5" /> Joined</> : <><Plus className="h-3.5 w-3.5" /> Join</>}
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.section>
        ) : (
          <section className="yor-empty-state">
            <Globe2 className="h-8 w-8" />
            <h2>No world matches that signal.</h2>
            <p>Clear the filters or create the space you were hoping to find.</p>
            <Button onClick={() => { setQuery(''); setFilter('All worlds'); }} variant="outline">Clear filters</Button>
          </section>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="yor-dialog sm:max-w-[520px]">
          <DialogHeader>
            <span className="yor-eyebrow"><Globe2 className="h-3.5 w-3.5" /> New world</span>
            <DialogTitle className="text-2xl font-display">Create the place you wish existed.</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-3">
            <label className="yor-field">
              <span>Name</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Midnight filmmakers" maxLength={80} />
            </label>
            <label className="yor-field">
              <span>What pulls people here?</span>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="A place for people who want to make strange, beautiful short films after class..."
                rows={4}
                maxLength={500}
              />
            </label>
            <div className="yor-dialog-note">
              <Sparkles className="h-4 w-4" />
              <p><strong>Start specific.</strong> The strongest worlds form around a clear reason to return.</p>
            </div>
            <Button onClick={handleCreate} disabled={creating} className="yor-primary-action w-full">
              {creating ? 'Opening your world…' : 'Open this world'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
