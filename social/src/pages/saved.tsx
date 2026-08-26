import { useEffect, useState } from 'react';
import { Bookmark, Compass, Play, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { PostCardMemo as PostCard } from '@/components/feed/Post';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { api, type BackendVideo } from '@/lib/api-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function Saved() {
  const posts = useAppStore((state) => state.posts.filter((post) => post.savedByMe));
  const loading = useAppStore((state) => state.isInitializing);
  const loadSavedPosts = useAppStore((state) => state.loadSavedPosts);
  const users = useAppStore((state) => state.users);
  const loadUserProfile = useAppStore((state) => state.loadUserProfile);
  const [videos, setVideos] = useState<BackendVideo[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    setRefreshing(true);
    void Promise.all([loadSavedPosts(), api.getSavedVideos()]).then(([, result]) => {
      if (active) setVideos(result);
    }).catch(() => {
      if (active) setVideos([]);
    }).finally(() => {
      if (active) setRefreshing(false);
    });
    return () => { active = false; };
  }, [loadSavedPosts]);

  useEffect(() => {
    videos.forEach((video) => {
      if (!users[video.authorId]) void loadUserProfile(video.authorId);
    });
  }, [videos, users, loadUserProfile]);

  const handleRefresh = () => {
    setRefreshing(true);
    void Promise.all([loadSavedPosts(), api.getSavedVideos()]).then(([, result]) => setVideos(result)).catch(() => setVideos([])).finally(() => setRefreshing(false));
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-card to-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Bookmark className="h-4 w-4" /> Private collection</div>
              <h2 className="mt-2 font-display text-3xl font-black tracking-tight">Saved for later.</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Your saved posts and Reels stay private to you and respect the same audience and content-safety rules as the original content.</p>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={loading || refreshing} className="rounded-2xl"><RefreshCw className={loading || refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh</Button>
          </div>
        </section>

        {posts.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-display text-xl font-black">Saved posts</h3>
            <div className="space-y-5">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
          </section>
        )}

        {videos.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-display text-xl font-black">Saved Reels & videos</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {videos.map((video) => {
                const author = users[video.authorId];
                return (
                  <article key={video.id} className="surface-1 overflow-hidden rounded-3xl border border-border/40">
                    <div className="relative bg-black">
                      <video src={video.videoUrl} poster={video.thumbnailUrl} controls preload="metadata" className="aspect-video w-full object-cover" />
                      <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[0.62rem] font-mono font-bold text-white"><Play className="h-3 w-3 fill-white" /> {video.type === 'short' ? 'REEL' : 'VIDEO'}</span>
                    </div>
                    <div className="p-4">
                      <h4 className="font-display font-bold leading-tight">{video.title}</h4>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="h-6 w-6"><AvatarImage src={author?.avatarUrl} /><AvatarFallback>{author?.displayName?.charAt(0) ?? '?'}</AvatarFallback></Avatar>
                        <span>{author?.displayName ?? 'Creator'}</span>
                        <span className="ml-auto">{video.likes ?? 0} likes</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {posts.length === 0 && videos.length === 0 && !refreshing ? (
          <section className="rounded-3xl border border-dashed border-border/50 p-10 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <h3 className="mt-4 font-display text-xl font-black">Nothing saved yet.</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Tap the bookmark icon on a post, Reel, or video when you find an idea, guide, or moment worth returning to.</p>
            <Link href="/explore" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"><Compass className="h-4 w-4" /> Explore posts</Link>
          </section>
        ) : null}
      </main>
    </div>
  );
}
