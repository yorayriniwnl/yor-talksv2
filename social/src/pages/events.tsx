import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, MapPin, Users, Globe, Plus, Sparkles, Check } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const EVENT_CATEGORIES = ['Design', 'Tech', 'Business', 'Music', 'Social', 'Other'];

function CreateEventDialog() {
  const createEvent = useAppStore((s) => s.createEvent);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EVENT_CATEGORIES[0]);
  const [startsAt, setStartsAt] = useState('');
  const [location, setLocationField] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim(),
        coverUrl: `https://picsum.photos/seed/${encodeURIComponent(title)}/600/300`,
        category,
        startsAt: new Date(startsAt).toISOString(),
        location: location.trim(),
        isOnline,
      });
      setOpen(false);
      setTitle(''); setDescription(''); setStartsAt(''); setLocationField(''); setIsOnline(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold text-xs px-4 glow-neon-primary bg-primary"><Plus className="w-4 h-4 mr-1.5" /> Create Event</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl font-sans">
        <DialogHeader><DialogTitle className="font-display font-bold text-xl">Create an Event</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <div className="space-y-1.5">
            <Label htmlFor="event-title" className="text-xs font-mono uppercase text-muted-foreground">Title</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} placeholder="Design Meetup" className="rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-description" className="text-xs font-mono uppercase text-muted-foreground">Description</Label>
            <Textarea id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this event about?" className="rounded-xl resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-category" className="text-xs font-mono uppercase text-muted-foreground">Category</Label>
              <select id="event-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium">
                {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-starts" className="text-xs font-mono uppercase text-muted-foreground">Starts At</Label>
              <Input id="event-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required className="rounded-xl" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/50 p-3 surface-1">
            <Label htmlFor="event-online" className="text-sm font-semibold">Online event</Label>
            <Switch id="event-online" checked={isOnline} onCheckedChange={setIsOnline} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-location" className="text-xs font-mono uppercase text-muted-foreground">{isOnline ? 'Link or Platform' : 'Location'}</Label>
            <Input id="event-location" value={location} onChange={(e) => setLocationField(e.target.value)} required placeholder={isOnline ? 'zoom.us/...' : '123 Main St'} className="rounded-xl" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading || title.trim().length < 2 || !startsAt || !location.trim()} className="rounded-xl font-bold text-xs px-6">
              {loading ? 'Creating…' : 'Publish Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function EventsPage() {
  const events = useAppStore((s) => s.events);
  const users = useAppStore((s) => s.users);
  const loadEvents = useAppStore((s) => s.loadEvents);
  const toggleEventRsvp = useAppStore((s) => s.toggleEventRsvp);
  const [tab, setTab] = useState<'Upcoming' | 'Going' | 'Interested'>('Upcoming');

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const filteredEvents = events.filter((e) => {
    if (tab === 'Upcoming') return true;
    if (tab === 'Going') return e.rsvpStatus === 'going';
    if (tab === 'Interested') return e.rsvpStatus === 'interested';
    return true;
  }).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display text-foreground">Community Events</h1>
          <p className="text-[0.68rem] text-muted-foreground font-mono">Gatherings & Meetups</p>
        </div>
        <CreateEventDialog />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        {/* Category Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar pb-1">
          {(['Upcoming', 'Going', 'Interested'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                tab === t ? "bg-primary text-primary-foreground glow-neon-primary" : "surface-1 text-muted-foreground hover:bg-muted"
              )}
            >
              {t === 'Upcoming' ? '📅 Upcoming Events' : t === 'Going' ? '✅ Going' : '⭐ Interested'}
            </button>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-20 rounded-3xl border border-dashed border-border/50 surface-1">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="font-display font-bold text-lg mb-1">No events found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">Create an event or check back later for upcoming community gatherings.</p>
          </div>
        )}

        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
        >
          {filteredEvents.map((event) => {
            const attendeeIds = event.attendeeIds || [];
            const attendees = attendeeIds.slice(0, 3).map(id => users[id]).filter(Boolean);

            return (
              <motion.div
                variants={staggerItem}
                key={event.id}
                className="surface-1 rounded-2xl overflow-hidden flex flex-col group border border-border/40 hover:border-primary/40 transition-all duration-300"
              >
                <div className="h-44 relative bg-muted overflow-hidden">
                  <img src={event.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={event.title} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {event.isOnline && (
                    <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[0.65rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md backdrop-blur-md flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" /> Online Event
                    </div>
                  )}
                </div>
                
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(event.startsAt), 'MMM d, yyyy · h:mm a')}</span>
                  </div>
                  
                  <h3 className="font-display font-bold text-xl mb-1 line-clamp-1 group-hover:text-primary transition-colors">{event.title}</h3>
                  
                  <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono mb-4">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-accent" />
                    <span className="truncate">{event.location}</span>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/30">
                    <div className="flex items-center">
                      <div className="flex -space-x-2 mr-2">
                        {attendees.map((a) => (
                          <Avatar key={a.id} className="w-7 h-7 border-2 border-background ring-1 ring-border/50">
                            <AvatarImage src={a.avatarUrl} />
                            <AvatarFallback>{(a.displayName ?? '?').charAt(0)}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      {attendeeIds.length > 0 && (
                        <span className="text-[0.7rem] text-muted-foreground font-mono font-medium">
                          {attendeeIds.length} attending
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant={event.rsvpStatus === 'interested' ? 'default' : 'outline'} 
                        size="sm" 
                        className={cn("rounded-xl h-8 text-xs font-bold px-3", event.rsvpStatus === 'interested' && "glow-neon-primary")}
                        onClick={() => toggleEventRsvp(event.id, 'interested')}
                      >
                        Interested
                      </Button>
                      <Button 
                        variant={event.rsvpStatus === 'going' ? 'default' : 'outline'} 
                        size="sm" 
                        className={cn("rounded-xl h-8 text-xs font-bold px-3", event.rsvpStatus === 'going' && "glow-neon-primary bg-emerald-600 hover:bg-emerald-700 text-white")}
                        onClick={() => toggleEventRsvp(event.id, 'going')}
                      >
                        {event.rsvpStatus === 'going' && <Check className="w-3.5 h-3.5 mr-1" />} Going
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
