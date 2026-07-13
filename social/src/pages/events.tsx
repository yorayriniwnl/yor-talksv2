import { useParams, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, ArrowLeft, Globe, Star } from 'lucide-react';
import { format } from 'date-fns';

function EventDetail({ eventId }: { eventId: string }) {
  const [, setLocation] = useLocation();
  const { events, users, currentUser, toggleEventRsvp } = useAppStore();
  const event = events.find(e => e.id === eventId);

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-muted-foreground">
        <p>This event could not be found.</p>
        <Button variant="secondary" className="mt-4 rounded-full" onClick={() => setLocation('/events')}>Back to Events</Button>
      </div>
    );
  }

  const host = users[event.hostId];
  const going = event.rsvpStatus === 'going';
  const interested = event.rsvpStatus === 'interested';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button onClick={() => setLocation('/events')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Events
      </button>

      <div className="aspect-[2/1] rounded-2xl overflow-hidden mb-6 bg-muted">
        <img src={event.coverUrl} className="w-full h-full object-cover" alt="" />
      </div>

      <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">{event.category}</span>
      <h1 className="font-display font-bold text-3xl mt-3 mb-4">{event.title}</h1>

      <div className="space-y-3 mb-6 text-sm">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          {format(new Date(event.startsAt), 'EEEE, MMMM d · h:mm a')}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          {event.isOnline ? <Globe className="w-5 h-5 text-primary shrink-0" /> : <MapPin className="w-5 h-5 text-primary shrink-0" />}
          {event.location}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Users className="w-5 h-5 text-primary shrink-0" />
          {event.attendeeIds.length} going · {event.interestedIds.length} interested
        </div>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <Avatar className="w-9 h-9">
          <AvatarImage src={host?.avatarUrl} />
          <AvatarFallback>{host?.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="text-sm">
          <p className="text-muted-foreground">Hosted by</p>
          <p className="font-medium">{host?.displayName}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-8">
        <Button className="flex-1 rounded-full h-11" variant={going ? 'default' : 'outline'} onClick={() => toggleEventRsvp(event.id, 'going')}>
          {going ? 'You\'re going' : 'RSVP — Going'}
        </Button>
        <Button className="flex-1 rounded-full h-11" variant={interested ? 'secondary' : 'outline'} onClick={() => toggleEventRsvp(event.id, 'interested')}>
          <Star className={`w-4 h-4 mr-2 ${interested ? 'fill-current' : ''}`} /> Interested
        </Button>
      </div>

      <div>
        <h3 className="font-display font-semibold text-lg mb-2">About this event</h3>
        <p className="text-muted-foreground leading-relaxed">{event.description}</p>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { events, users } = useAppStore();

  if (params.id) {
    return <EventDetail eventId={params.id} />;
  }

  const upcoming = [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl">Events</h1>
          <p className="text-muted-foreground mt-1">Conferences, workshops, and meetups from your network.</p>
        </div>
        <Button className="rounded-full">Create Event</Button>
      </div>

      <div className="space-y-4">
        {upcoming.map((event, i) => {
          const host = users[event.hostId];
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setLocation(`/events/${event.id}`)}
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-border/50 bg-card hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="w-full sm:w-40 aspect-[4/3] sm:aspect-square shrink-0 rounded-xl overflow-hidden bg-muted">
                <img src={event.coverUrl} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Calendar className="w-3.5 h-3.5" /> {format(new Date(event.startsAt), 'MMM d · h:mm a')}
                  <span className="mx-1">·</span>
                  {event.isOnline ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />} {event.location}
                </div>
                <h3 className="font-display font-semibold text-lg mb-1 truncate">{event.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{event.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="w-5 h-5"><AvatarImage src={host?.avatarUrl} /><AvatarFallback>{host?.displayName.charAt(0)}</AvatarFallback></Avatar>
                  {host?.displayName}
                  {event.rsvpStatus && (
                    <span className="ml-2 text-primary font-medium">{event.rsvpStatus === 'going' ? 'You\'re going' : 'Interested'}</span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
