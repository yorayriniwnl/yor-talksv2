import { useEffect, useRef, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Room, RoomEvent, ParticipantEvent, type Participant } from 'livekit-client';
import { Calendar, Loader2, Mic, Radio, Signal, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { api, type BackendLiveStream } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';

const DEFAULT_COVER = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80';

function GoLiveDialog({ onCreated }: { onCreated: (stream: BackendLiveStream) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Campus');
  const [kind, setKind] = useState<'video' | 'audio'>('video');
  const [contentRating, setContentRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const stream = await api.createStream({
        title: title.trim(),
        category: category.trim(),
        kind,
        coverUrl: DEFAULT_COVER,
        startsAt: new Date().toISOString(),
        contentRating,
      });
      const liveStream = await api.setStreamStatus(stream.id, 'live');
      setOpen(false);
      setTitle('');
      setContentRating(DEFAULT_CONTENT_RATING);
      onCreated(liveStream);
      toast.success('You are live');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start the live room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl font-bold text-xs"><Radio className="w-4 h-4" /> Go live</Button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle className="font-display font-black">Start a live room</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What are you sharing?" minLength={2} maxLength={200} required />
          <div className="grid grid-cols-2 gap-3">
            <Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" maxLength={50} required />
            <select value={kind} onChange={(event) => setKind(event.target.value as 'video' | 'audio')} className="h-10 rounded-md border bg-background px-3 text-sm">
              <option value="video">Video + audio</option>
              <option value="audio">Audio only</option>
            </select>
          </div>
          <ContentRatingSelect id="stream-content-rating" value={contentRating} onChange={setContentRating} />
          <p className="text-xs text-muted-foreground">Your browser will ask for camera and microphone permission after the LiveKit room connects.</p>
          <Button type="submit" disabled={loading || title.trim().length < 2} className="w-full rounded-xl">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Connecting…' : 'Start room'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ParticipantTile({ participant }: { participant: Participant }) {
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountTracks = () => {
      if (!mediaRef.current) return;
      const tracks = participant.getTrackPublications().map((publication) => publication.track).filter(Boolean);
      mediaRef.current.replaceChildren();
      for (const track of tracks) {
        const element = track!.attach();
        element.className = track!.kind === 'video' ? 'h-full w-full object-cover' : 'hidden';
        mediaRef.current.appendChild(element);
      }
    };

    mountTracks();
    participant.on(ParticipantEvent.TrackSubscribed, mountTracks);
    participant.on(ParticipantEvent.TrackUnsubscribed, mountTracks);
    participant.on(ParticipantEvent.LocalTrackPublished, mountTracks);
    participant.on(ParticipantEvent.LocalTrackUnpublished, mountTracks);
    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, mountTracks);
      participant.off(ParticipantEvent.TrackUnsubscribed, mountTracks);
      participant.off(ParticipantEvent.LocalTrackPublished, mountTracks);
      participant.off(ParticipantEvent.LocalTrackUnpublished, mountTracks);
      for (const publication of participant.getTrackPublications()) publication.track?.detach();
      mediaRef.current?.replaceChildren();
    };
  }, [participant]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/50 bg-black/50">
      <div ref={mediaRef} className="h-full w-full" />
      <div className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white">
        {participant.name || participant.identity}{participant.isLocal ? ' (you)' : ''}
      </div>
      {participant.isSpeaking && <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400" />}
    </div>
  );
}

function LiveRoom({ streamId }: { streamId: string }) {
  const [, setLocation] = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const [stream, setStream] = useState<BackendLiveStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    let activeRoom: Room | null = null;

    const connect = async () => {
      try {
        const streamData = await api.getStream(streamId);
        if (disposed) return;
        setStream(streamData);
        const access = await api.getStreamToken(streamId);
        if (disposed) return;
        const connectedRoom = new Room({ adaptiveStream: true, dynacast: true });
        activeRoom = connectedRoom;
        const refreshParticipants = () => {
          if (!disposed) setParticipants([connectedRoom.localParticipant, ...connectedRoom.remoteParticipants.values()]);
        };
        connectedRoom.on(RoomEvent.ParticipantConnected, refreshParticipants);
        connectedRoom.on(RoomEvent.ParticipantDisconnected, refreshParticipants);
        connectedRoom.on(RoomEvent.TrackSubscribed, refreshParticipants);
        connectedRoom.on(RoomEvent.TrackUnsubscribed, refreshParticipants);
        connectedRoom.on(RoomEvent.Disconnected, () => setError('The live room disconnected'));
        await connectedRoom.connect(access.wsUrl, access.token);
        if (streamData.hostId === currentUser?.id) {
          await connectedRoom.localParticipant.setMicrophoneEnabled(true);
          await connectedRoom.localParticipant.setCameraEnabled(streamData.kind === 'video');
        }
        if (!disposed) {
          setRoom(connectedRoom);
          refreshParticipants();
          setLoading(false);
        }
      } catch (connectError) {
        if (!disposed) {
          setError(connectError instanceof Error ? connectError.message : 'Could not connect to the live room');
          setLoading(false);
        }
      }
    };

    void connect();
    return () => {
      disposed = true;
      activeRoom?.disconnect();
      setRoom(null);
    };
  }, [currentUser?.id, streamId]);

  const endRoom = async () => {
    if (!stream || stream.hostId !== currentUser?.id) return;
    try {
      await api.setStreamStatus(stream.id, 'ended');
      room?.disconnect();
      setLocation('/live');
    } catch (endError) {
      toast.error(endError instanceof Error ? endError.message : 'Could not end the room');
    }
  };

  if (loading) {
    return <main className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button onClick={() => setLocation('/live')} className="mb-2 text-xs text-muted-foreground hover:text-foreground">← Back to live</button>
          <h1 className="font-display text-2xl font-black tracking-tight">{stream?.title || 'Live room'}</h1>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><Signal className="h-3.5 w-3.5 text-rose-400" /> LiveKit room · {participants.length} connected</p>
        </div>
        {stream?.hostId === currentUser?.id && <Button variant="destructive" onClick={endRoom} className="rounded-xl text-xs font-bold"><X className="h-4 w-4" /> End room</Button>}
      </div>
      {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      <section className="grid gap-4 sm:grid-cols-2">
        {participants.map((participant) => <ParticipantTile key={participant.identity} participant={participant} />)}
      </section>
      {!participants.length && <div className="rounded-2xl border border-border/50 bg-card/40 p-10 text-center text-sm text-muted-foreground">Waiting for someone to publish media…</div>}
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mic className="h-4 w-4" /> Only the host can publish media in this beta room.</div>
    </main>
  );
}

export default function Live() {
  const [, params] = useRoute<{ id: string }>('/live/:id');
  const [, setLocation] = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const [streams, setStreams] = useState<BackendLiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params?.id) return;
    let active = true;
    api.getStreams()
      .then((data) => { if (active) setStreams(data); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load live rooms'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params?.id]);

  if (params?.id) return <LiveRoom streamId={params.id} />;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6">
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-border/50 bg-card/40 p-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-rose-400"><Radio className="h-4 w-4" /> Live rooms</p>
          <h1 className="font-display text-3xl font-black tracking-tight">Real-time campus conversations.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Join a LiveKit room to watch or listen. Hosts publish from their browser and all payment actions remain server-verified.</p>
        </div>
        {currentUser && <GoLiveDialog onCreated={(stream) => setLocation(`/live/${stream.id}`)} />}
      </section>

      {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}
      {loading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {streams.map((stream) => (
            <button key={stream.id} onClick={() => setLocation(`/live/${stream.id}`)} className="group overflow-hidden rounded-2xl border border-border/50 bg-card/40 text-left transition hover:border-primary/50">
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img src={stream.coverUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <span className={`absolute left-3 top-3 rounded-lg px-2 py-1 text-[0.65rem] font-bold text-white ${stream.status === 'live' ? 'bg-rose-500' : 'bg-black/60'}`}>
                  {stream.status === 'live' ? 'LIVE' : stream.status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-2 p-4">
                <h2 className="line-clamp-2 font-display font-bold">{stream.title}</h2>
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{stream.category} · {stream.kind}</span><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(stream.startsAt), 'PPp')}</span></div>
              </div>
            </button>
          ))}
        </section>
      )}
      {!loading && !streams.length && <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">No live rooms yet. Start the first one for your campus.</div>}
    </main>
  );
}
