import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bell, BellOff, Check, ChevronRight, LogIn, LogOut, Megaphone, Plus, RefreshCw, Send, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api, type BackendBroadcastChannel, type BackendBroadcastChannelMessage } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { type ContentCategory } from '@/lib/content-category';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { cn } from '@/lib/utils';

function replaceChannel(channels: BackendBroadcastChannel[], updated: BackendBroadcastChannel) {
  return channels.map((channel) => channel.id === updated.id ? updated : channel);
}

export default function BroadcastChannels() {
  const [channels, setChannels] = useState<BackendBroadcastChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [messages, setMessages] = useState<BackendBroadcastChannelMessage[]>([]);
  const [channelLoading, setChannelLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [channelCategory, setChannelCategory] = useState<ContentCategory>('other');
  const [channelRating, setChannelRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
  const [messageContent, setMessageContent] = useState('');
  const [messageCategory, setMessageCategory] = useState<ContentCategory>('other');
  const [messageRating, setMessageRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
  const [saving, setSaving] = useState(false);

  const selectedChannel = useMemo(() => channels.find((channel) => channel.id === selectedChannelId), [channels, selectedChannelId]);

  const loadChannels = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setChannelLoading(true);
    setError('');
    try {
      const nextChannels = await api.getBroadcastChannels();
      setChannels(nextChannels);
      setSelectedChannelId((current) => current && nextChannels.some((channel) => channel.id === current) ? current : nextChannels[0]?.id ?? '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load Broadcast Channels');
    } finally {
      setChannelLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadChannels();
  }, []);

  useEffect(() => {
    let active = true;
    if (!selectedChannel || !selectedChannel.isMember) {
      setMessages([]);
      setMessageError('');
      setMessageLoading(false);
      return () => { active = false; };
    }
    setMessageLoading(true);
    setMessageError('');
    api.getBroadcastChannelMessages(selectedChannel.id)
      .then((nextMessages) => { if (active) setMessages(nextMessages); })
      .catch((loadError) => { if (active) setMessageError(loadError instanceof Error ? loadError.message : 'Could not load channel updates'); })
      .finally(() => { if (active) setMessageLoading(false); });
    return () => { active = false; };
  }, [selectedChannel?.id, selectedChannel?.isMember]);

  const handleJoin = async () => {
    if (!selectedChannel) return;
    setSaving(true);
    try {
      const updated = await api.joinBroadcastChannel(selectedChannel.id);
      setChannels((current) => replaceChannel(current, updated));
    } catch (joinError) {
      setMessageError(joinError instanceof Error ? joinError.message : 'Could not subscribe to this channel');
    } finally {
      setSaving(false);
    }
  };

  const handleLeave = async () => {
    if (!selectedChannel || selectedChannel.isOwner) return;
    setSaving(true);
    try {
      const updated = await api.leaveBroadcastChannel(selectedChannel.id);
      setChannels((current) => replaceChannel(current, updated));
    } catch (leaveError) {
      setMessageError(leaveError instanceof Error ? leaveError.message : 'Could not unsubscribe from this channel');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!channelName.trim() || saving) return;
    setSaving(true);
    try {
      const created = await api.createBroadcastChannel({
        name: channelName.trim(),
        description: channelDescription.trim(),
        contentCategory: channelCategory,
        contentRating: channelRating,
      });
      setChannels((current) => [created, ...current]);
      setSelectedChannelId(created.id);
      setChannelName('');
      setChannelDescription('');
      setChannelCategory('other');
      setChannelRating(DEFAULT_CONTENT_RATING);
      setIsCreateOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create your channel');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!selectedChannel?.isOwner || !messageContent.trim() || saving) return;
    setSaving(true);
    try {
      const created = await api.publishBroadcastChannelMessage(selectedChannel.id, {
        content: messageContent.trim(),
        contentCategory: messageCategory,
        contentRating: messageRating,
      });
      setMessages((current) => [...current, created]);
      setMessageContent('');
      setMessageCategory('other');
      setMessageRating(DEFAULT_CONTENT_RATING);
      const refreshed = await api.getBroadcastChannels();
      setChannels(refreshed);
    } catch (publishError) {
      setMessageError(publishError instanceof Error ? publishError.message : 'Could not publish this update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-tr from-primary via-violet-500 to-accent text-white shadow-lg glow-neon-primary"><Megaphone className="h-5 w-5" /></div>
            <div>
              <p className="text-[0.62rem] font-mono font-bold uppercase tracking-[0.18em] text-primary">Creator signal</p>
              <h1 className="font-display text-xl font-black">Broadcast Channels</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => void loadChannels(true)} disabled={refreshing} className="rounded-xl" aria-label="Refresh channels">
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
            <Button type="button" onClick={() => setIsCreateOpen(true)} className="rounded-xl font-bold"><Plus className="mr-1.5 h-4 w-4" /> Create channel</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]">
        <section className="surface-1 overflow-hidden rounded-3xl border border-border/40">
          <div className="border-b border-border/40 p-5">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[0.62rem] font-mono font-bold uppercase tracking-[0.16em] text-muted-foreground">Your signal map</p><h2 className="mt-1 font-display text-lg font-black">Channels to follow</h2></div><Sparkles className="h-5 w-5 text-primary" /></div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">One-way updates from creators, teams, and movements. Replies stay out of your main inbox.</p>
          </div>
          {error && <div className="m-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{error}</div>}
          {channelLoading ? (
            <div className="space-y-3 p-4">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-muted/50" />)}</div>
          ) : channels.length === 0 ? (
            <div className="p-8 text-center"><Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-bold">No channels yet.</p><p className="mt-1 text-xs text-muted-foreground">Start the first signal for your world.</p><Button type="button" variant="outline" onClick={() => setIsCreateOpen(true)} className="mt-4 rounded-xl text-xs">Create yours</Button></div>
          ) : (
            <div className="divide-y divide-border/30">
              {channels.map((channel) => (
                <button key={channel.id} type="button" onClick={() => setSelectedChannelId(channel.id)} className={cn('flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30', channel.id === selectedChannelId && 'bg-primary/10')}>
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-primary/80 to-accent/80 text-lg font-black text-white">{channel.name.charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{channel.name}</p><p className="mt-1 flex items-center gap-1 text-[0.68rem] text-muted-foreground"><Users className="h-3 w-3" /> {channel.memberCount.toLocaleString()} {channel.memberCount === 1 ? 'subscriber' : 'subscribers'}{channel.isOwner ? ' · You own this' : channel.isMember ? ' · Subscribed' : ''}</p></div>
                  {channel.isMember ? <Check className="h-4 w-4 shrink-0 text-primary" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="surface-1 flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-border/40">
          {!selectedChannel ? (
            <div className="m-auto max-w-sm p-8 text-center"><Megaphone className="mx-auto h-10 w-10 text-primary/50" /><h2 className="mt-4 font-display text-xl font-black">Choose a channel</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Subscribe to a signal to unlock its private update stream.</p></div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-border/40 p-5">
                <div className="flex min-w-0 items-center gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-primary/80 to-accent/80 text-xl font-black text-white">{selectedChannel.name.charAt(0).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate font-display text-lg font-black">{selectedChannel.name}</h2><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{selectedChannel.description || 'A direct line from this creator to the people who care.'}</p></div></div>
                <div className="flex shrink-0 items-center gap-1">
                  {selectedChannel.isMember && <span className="hidden items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[0.62rem] font-bold text-primary sm:inline-flex"><Bell className="h-3 w-3" /> Live signal</span>}
                  {!selectedChannel.isOwner && selectedChannel.isMember && <Button type="button" variant="ghost" onClick={() => void handleLeave()} disabled={saving} className="rounded-xl text-xs text-muted-foreground"><LogOut className="mr-1.5 h-3.5 w-3.5" /> Leave</Button>}
                </div>
              </div>

              {!selectedChannel.isMember ? (
                <div className="m-auto max-w-md p-8 text-center"><BellOff className="mx-auto h-10 w-10 text-muted-foreground/50" /><h3 className="mt-4 font-display text-xl font-black">Subscribe to enter</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">This channel keeps updates intentional. Subscribe to read the archive and receive the creator’s next signal.</p><Button type="button" onClick={() => void handleJoin()} disabled={saving} className="mt-5 rounded-xl font-bold"><LogIn className="mr-1.5 h-4 w-4" /> Subscribe</Button>{messageError && <p className="mt-3 text-xs text-destructive">{messageError}</p>}</div>
              ) : (
                <>
                  <div className="flex-1 space-y-3 overflow-y-auto p-5">
                    {messageError && <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">{messageError}</div>}
                    {messageLoading ? <div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-muted/50" />)}</div> : messages.length === 0 ? <div className="py-16 text-center"><Megaphone className="mx-auto h-8 w-8 text-muted-foreground/40" /><p className="mt-3 text-sm font-bold">The signal is quiet.</p><p className="mt-1 text-xs text-muted-foreground">New announcements from the owner will land here.</p></div> : messages.map((message) => <article key={message.id} className="rounded-2xl border border-border/40 bg-background/35 p-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-[0.62rem] font-mono font-bold uppercase tracking-[0.12em] text-primary"><ShieldCheck className="h-3 w-3" /> Official update</span><time className="text-[0.62rem] text-muted-foreground" dateTime={message.createdAt}>{formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}</time></div><p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p></article>)}
                  </div>
                  {selectedChannel.isOwner && <div className="border-t border-border/40 bg-background/30 p-4"><Textarea value={messageContent} onChange={(event) => setMessageContent(event.target.value)} placeholder="Publish an official update to your subscribers…" maxLength={2000} rows={3} className="resize-none rounded-2xl" /><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><ContentCategorySelect id="broadcast-message-category" value={messageCategory} onChange={(value) => { if (value) setMessageCategory(value); }} /><ContentRatingSelect id="broadcast-message-rating" value={messageRating} onChange={setMessageRating} /><Button type="button" onClick={() => void handlePublish()} disabled={saving || !messageContent.trim()} className="rounded-xl font-bold"><Send className="mr-1.5 h-4 w-4" /> {saving ? 'Sending…' : 'Publish'}</Button></div></div>}
                </>
              )}
            </>
          )}
        </section>
      </main>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-3xl sm:max-w-[500px]">
          <DialogHeader><DialogTitle className="font-display text-xl font-black">Start a Broadcast Channel</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2"><div><label htmlFor="broadcast-channel-name" className="mb-1.5 block text-xs font-bold">Channel name</label><Input id="broadcast-channel-name" value={channelName} onChange={(event) => setChannelName(event.target.value)} placeholder="The signal room" maxLength={80} className="rounded-xl" /></div><div><label htmlFor="broadcast-channel-description" className="mb-1.5 block text-xs font-bold">Description</label><Textarea id="broadcast-channel-description" value={channelDescription} onChange={(event) => setChannelDescription(event.target.value)} placeholder="What will subscribers hear from you?" maxLength={500} rows={3} className="resize-none rounded-xl" /></div><div className="grid gap-3 sm:grid-cols-2"><ContentCategorySelect id="broadcast-channel-category" value={channelCategory} onChange={(value) => { if (value) setChannelCategory(value); }} /><ContentRatingSelect id="broadcast-channel-rating" value={channelRating} onChange={setChannelRating} /></div><p className="text-[0.68rem] leading-relaxed text-muted-foreground">You are the only publisher. Subscribers can read the archive and receive future updates without adding another conversation to their inbox.</p></div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-xl">Cancel</Button><Button type="button" onClick={() => void handleCreate()} disabled={saving || channelName.trim().length < 2} className="rounded-xl font-bold"><Megaphone className="mr-1.5 h-4 w-4" /> {saving ? 'Creating…' : 'Create channel'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
