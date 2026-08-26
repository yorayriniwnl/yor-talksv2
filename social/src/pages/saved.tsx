import { useEffect } from 'react';
import { Bookmark, Compass, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { PostCardMemo as PostCard } from '@/components/feed/Post';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';

export default function Saved() {
  const posts = useAppStore((state) => state.posts.filter((post) => post.savedByMe));
  const loading = useAppStore((state) => state.isInitializing);
  const loadSavedPosts = useAppStore((state) => state.loadSavedPosts);

  useEffect(() => {
    void loadSavedPosts();
  }, [loadSavedPosts]);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-card to-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Bookmark className="h-4 w-4" /> Private collection</div>
              <h2 className="mt-2 font-display text-3xl font-black tracking-tight">Saved for later.</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Your saved posts stay private to you and respect the same audience and content-safety rules as the original post.</p>
            </div>
            <Button variant="outline" onClick={() => void loadSavedPosts()} disabled={loading} className="rounded-2xl"><RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh</Button>
          </div>
        </section>

        {posts.length > 0 ? (
          <div className="space-y-5">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
        ) : (
          <section className="rounded-3xl border border-dashed border-border/50 p-10 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <h3 className="mt-4 font-display text-xl font-black">Nothing saved yet.</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Tap the bookmark icon on a post when you find an idea, guide, or moment worth returning to.</p>
            <Link href="/explore" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"><Compass className="h-4 w-4" /> Explore posts</Link>
          </section>
        )}
      </main>
    </div>
  );
}
