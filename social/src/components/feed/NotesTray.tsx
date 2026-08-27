import { useMemo, useState } from 'react';
import { Globe2, LockKeyhole, MessageCircle, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useAppStore, type Note } from '@/lib/store';
import { CONTENT_RATING_OPTIONS, contentRatingLabel, type ContentRating } from '@/lib/content-rating';
import { CONTENT_CATEGORIES, type ContentCategory } from '@/lib/content-category';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const NOTE_LIMIT = 180;

function timeRemaining(expiresAt: string) {
  const hours = Math.max(1, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  return `${hours}h left`;
}

export default function NotesTray() {
  const notes = useAppStore((state) => state.notes);
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const createNote = useAppStore((state) => state.createNote);
  const deleteNote = useAppStore((state) => state.deleteNote);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState<Note['audience']>('followers');
  const [contentCategory, setContentCategory] = useState<ContentCategory>('other');
  const [contentRating, setContentRating] = useState<ContentRating>('regular');
  const [saving, setSaving] = useState(false);

  const myNote = notes.find((note) => note.authorId === currentUser?.id);
  const visibleNotes = useMemo(() => {
    const others = notes.filter((note) => note.authorId !== currentUser?.id);
    return myNote ? [myNote, ...others] : others;
  }, [currentUser?.id, myNote, notes]);

  const openComposer = () => {
    setContent(myNote?.content ?? '');
    setAudience(myNote?.audience ?? 'followers');
    setContentCategory(myNote?.contentCategory ?? 'other');
    setContentRating(myNote?.contentRating ?? 'regular');
    setDialogOpen(true);
  };

  const publish = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      await createNote({ content, audience, contentCategory, contentRating });
      setDialogOpen(false);
      setContent('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="orbit-now-card home-notes-card">
      <div className="home-section-heading">
        <div>
          <span>Small signals, close to the surface</span>
          <h2>Notes</h2>
        </div>
        <button type="button" className="home-notes-compose" onClick={openComposer}>
          <Plus className="h-3.5 w-3.5" /> {myNote ? 'Edit yours' : 'Leave a Note'}
        </button>
      </div>

      <div className="home-notes-row" aria-label="Notes from your network">
        {visibleNotes.length === 0 ? (
          <button type="button" className="home-note-empty" onClick={openComposer}>
            <MessageCircle className="h-5 w-5" />
            <span><strong>Start the conversation</strong><small>Leave a thought that disappears in 24 hours.</small></span>
            <Plus className="ml-auto h-4 w-4" />
          </button>
        ) : (
          visibleNotes.map((note) => {
            const author = note.authorId === currentUser?.id ? currentUser : users[note.authorId];
            if (!author) return null;
            const isMine = note.authorId === currentUser?.id;
            return (
              <article key={note.id} className={cn('home-note-card', isMine && 'is-mine')}>
                <div className="home-note-card__head">
                  <Avatar className="h-9 w-9 border border-border/70">
                    <AvatarImage src={author.avatarUrl} alt="" />
                    <AvatarFallback>{(author.displayName || author.username).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <strong>{isMine ? 'You' : author.displayName}</strong>
                    <small>@{author.username} · {timeRemaining(note.expiresAt)}</small>
                  </div>
                  {isMine && (
                    <button type="button" className="home-note-card__delete" onClick={() => void deleteNote(note.id)} aria-label="Delete your Note">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p>{note.content}</p>
                <div className="home-note-card__meta">
                  <span>{note.audience === 'public' ? <Globe2 className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}{note.audience === 'public' ? 'Public' : 'Followers'}</span>
                  <span><ShieldCheck className="h-3 w-3" />{contentRatingLabel(note.contentRating)}</span>
                </div>
              </article>
            );
          })
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{myNote ? 'Shape your Note' : 'Leave a Note'}</DialogTitle>
            <DialogDescription>Share one short signal. It will disappear automatically after 24 hours.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Textarea
                value={content}
                onChange={(event) => setContent(event.target.value.slice(0, NOTE_LIMIT))}
                placeholder="What is on your mind?"
                maxLength={NOTE_LIMIT}
                rows={4}
                autoFocus
                className="resize-none rounded-2xl"
              />
              <div className="mt-1 flex justify-end text-[0.68rem] text-muted-foreground">{content.length}/{NOTE_LIMIT}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-xs font-semibold">
                <span>Who can see it?</span>
                <select value={audience} onChange={(event) => setAudience(event.target.value as Note['audience'])} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                  <option value="followers">Followers</option>
                  <option value="public">Public</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs font-semibold">
                <span>Content layer</span>
                <select value={contentRating} onChange={(event) => setContentRating(event.target.value as ContentRating)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                  {CONTENT_RATING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <label className="space-y-1.5 text-xs font-semibold">
              <span>Category</span>
              <select value={contentCategory} onChange={(event) => setContentCategory(event.target.value as ContentCategory)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                {CONTENT_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.emoji} {category.label}</option>)}
              </select>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" onClick={() => void publish()} disabled={!content.trim() || saving}>{saving ? 'Publishing…' : myNote ? 'Replace Note' : 'Publish Note'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
