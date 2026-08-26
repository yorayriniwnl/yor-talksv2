import { useState } from 'react';
import { 
  Calendar, Bell, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

interface ScheduledMatch {
  id: string;
  tournament: string;
  game: string;
  teamA: { name: string; tag: string; logo: string };
  teamB: { name: string; tag: string; logo: string };
  stage: string;
  startsAt: Date;
  streamUrl: string;
  reminderSet?: boolean;
}

const UPCOMING_MATCHES: ScheduledMatch[] = [
  {
    id: 'm-1',
    tournament: 'BGIS Grand Finals 2026 🏆',
    game: 'BGMI',
    teamA: {
      name: 'Team GodLike',
      tag: 'GODL',
      logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop'
    },
    teamB: {
      name: 'Team Soul',
      tag: 'SOUL',
      logo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop'
    },
    startsAt: getMatchStart(0, 18, 0),
    stage: 'Grand Final Match 6 (Erangel)',
    streamUrl: '/live'
  },
  {
    id: 'm-2',
    tournament: 'VCT South Asia Stage 2 🔱',
    game: 'Valorant',
    teamA: {
      name: 'Global Esports',
      tag: 'GE',
      logo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=200&auto=format&fit=crop'
    },
    teamB: {
      name: 'Reckoning Esports',
      tag: 'RCK',
      logo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop'
    },
    startsAt: getMatchStart(1, 19, 30),
    stage: 'Upper Bracket Semifinals (Bo3)',
    streamUrl: '/live'
  }
];

function getMatchStart(daysFromToday: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function toIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export default function EsportsCalendar() {
  const [matches, setMatches] = useState<ScheduledMatch[]>(() => {
    if (typeof window === 'undefined') return UPCOMING_MATCHES;
    let reminderIds: string[] = [];
    try {
      const stored = localStorage.getItem('yor-esports-calendar-reminders');
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) reminderIds = parsed.filter((id): id is string => typeof id === 'string');
    } catch {
      // Ignore malformed local reminder state.
    }
    return UPCOMING_MATCHES.map((match) => ({ ...match, reminderSet: reminderIds.includes(match.id) }));
  });
  const [selectedGame, setSelectedGame] = useState<'all' | 'BGMI' | 'Valorant'>('all');

  const handleSetReminder = (id: string, matchName: string) => {
    const match = matches.find((item) => item.id === id);
    if (!match) return;
    const end = new Date(match.startsAt.getTime() + 90 * 60 * 1000);
    const event = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Yor Talks//Esports Calendar//EN',
      'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${match.id}@yor.talks`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(match.startsAt)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(`${match.teamA.name} vs ${match.teamB.name} · ${match.tournament}`)}`,
      `DESCRIPTION:${escapeIcsText(`${match.stage}. Watch on Yor Talks: ${match.streamUrl}`)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([event], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `yor-${match.id}-calendar.ics`;
    link.click();
    URL.revokeObjectURL(url);

    sounds.playChime();
    setMatches(prev => {
      const next = prev.map(m => m.id === id ? { ...m, reminderSet: true } : m);
      localStorage.setItem('yor-esports-calendar-reminders', JSON.stringify(next.filter((m) => m.reminderSet).map((m) => m.id)));
      return next;
    });
    toast.success(`Calendar file downloaded for ${matchName}. Add it to your calendar to receive reminders.`);
  };

  const filtered = matches.filter(m => selectedGame === 'all' || m.game === selectedGame);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Esports Schedule & Match Calendar</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live timetable and downloadable calendar reminders</p>
          </div>
        </div>

        <div className="flex gap-2">
          {['all', 'BGMI', 'Valorant'].map((g) => (
            <Button
              key={g}
              size="sm"
              variant={selectedGame === g ? 'default' : 'outline'}
              onClick={() => {
                sounds.playPop();
                setSelectedGame(g as any);
              }}
              className={cn("rounded-2xl text-xs font-bold font-mono", selectedGame === g && "bg-primary text-primary-foreground")}
            >
              {g === 'all' ? 'All Games' : g}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="space-y-4">
          {filtered.map((match) => (
            <div
              key={match.id}
              className="surface-1 rounded-3xl p-6 border border-border/40 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6"
            >
              {/* Left Column: Match Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-[0.65rem] font-mono font-bold">
                    {match.game}
                  </span>
                  <span className="text-xs font-mono font-bold text-foreground">{match.tournament}</span>
                  <span className="text-xs font-mono text-muted-foreground">&middot; {match.stage}</span>
                </div>

                <div className="flex items-center gap-6">
                  {/* Team A */}
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border border-border">
                      <AvatarImage src={match.teamA.logo} />
                      <AvatarFallback>{match.teamA.tag}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-display font-black text-base text-foreground">{match.teamA.name}</h4>
                      <span className="text-xs font-mono text-muted-foreground">[{match.teamA.tag}]</span>
                    </div>
                  </div>

                  <span className="font-display font-black text-lg text-rose-500">VS</span>

                  {/* Team B */}
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border border-border">
                      <AvatarImage src={match.teamB.logo} />
                      <AvatarFallback>{match.teamB.tag}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-display font-black text-base text-foreground">{match.teamB.name}</h4>
                      <span className="text-xs font-mono text-muted-foreground">[{match.teamB.tag}]</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Time & Calendar Sync Action */}
              <div className="flex items-center justify-between sm:justify-end gap-5 font-mono text-xs">
                <div className="text-right">
                  <span className="text-emerald-400 font-bold block text-sm">{match.startsAt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {match.startsAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}</span>
                  <span className="text-[0.65rem] text-muted-foreground">Broadcast details may change; check the stream before joining</span>
                </div>

                {match.reminderSet ? (
                  <Button
                    variant="outline"
                    onClick={() => handleSetReminder(match.id, `${match.teamA.tag} vs ${match.teamB.tag}`)}
                    className="rounded-2xl font-bold text-xs h-11 px-5 border-emerald-500/30 text-emerald-400"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Download Again
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleSetReminder(match.id, `${match.teamA.tag} vs ${match.teamB.tag}`)}
                    className="rounded-2xl font-bold text-xs h-11 px-5 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
                  >
                    <Bell className="w-3.5 h-3.5 mr-1.5" /> Remind Me (.ics)
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
