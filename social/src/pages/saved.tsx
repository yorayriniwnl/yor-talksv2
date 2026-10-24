import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Compass, Play, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { PostCardMemo as PostCard } from '@/components/feed/Post';
import { Button } from '@/components/ui/button';
import { useAppStore, type Post } from '@/lib/store';
import { api, type BackendVideo } from '@/lib/api-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProtectedMediaVideo } from '@/lib/protected-media';

type SavedVideoState = {
  ownerId: string;
  videos: BackendVideo[];
  loaded: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  errorCursor?: string;
  nextCursor?: string;
  hasMore: boolean;
};

const emptySavedVideos = (ownerId = ''): SavedVideoState => ({ ownerId, videos: [], loaded: false, loading: false, loadingMore: false, error: null, hasMore: false });

export default function Saved() {
  const cachedPosts = useAppStore((state) => state.posts);
  const savedPostIds = useAppStore((state) => state.savedPostIds);
  const currentUserId = useAppStore((state) => state.currentUser?.id ?? '');
  const savedPostsLoaded = useAppStore((state) => state.savedPostsLoaded);
  const savedPostsLoading = useAppStore((state) => state.savedPostsLoading);
  const savedPostsLoadingMore = useAppStore((state) => state.savedPostsLoadingMore);
  const savedPostsError = useAppStore((state) => state.savedPostsError);
  const savedPostsErrorCursor = useAppStore((state) => state.savedPostsErrorCursor);
  const savedPostsCursor = useAppStore((state) => state.savedPostsCursor);
  const savedPostsHasMore = useAppStore((state) => state.savedPostsHasMore);
  const loadSavedPosts = useAppStore((state) => state.loadSavedPosts);
  const users = useAppStore((state) => state.users);
  const loadUserProfile = useAppStore((state) => state.loadUserProfile);
  const posts = useMemo(() => {
    const byId = new Map(cachedPosts.map(post => [post.id, post]));
    return savedPostIds.map(id => byId.get(id)).filter((post): post is Post => Boolean(post?.savedByMe));
  }, [cachedPosts, savedPostIds]);
  const [videoState, setVideoState] = useState<SavedVideoState>(() => emptySavedVideos());
  const videoSnapshot = useRef(videoState);
  videoSnapshot.current = videoState;
  const videoRequest = useRef(0);
  const videoBusy = useRef(false);
  const currentOwner = useRef(currentUserId);
  currentOwner.current = currentUserId;
  const videos = videoState.ownerId === currentUserId ? videoState.videos : [];
  const videosLoaded = videoState.ownerId === currentUserId && videoState.loaded;
  const videosLoading = videoState.ownerId !== currentUserId || videoState.loading;
  const videosLoadingMore = videoState.ownerId === currentUserId && videoState.loadingMore;
  const videosHasMore = videoState.ownerId === currentUserId && videoState.hasMore;
  const videosError = videoState.ownerId === currentUserId ? videoState.error : null;
  const refreshing = savedPostsLoading || savedPostsLoadingMore || videosLoading || videosLoadingMore;

  const loadSavedVideos = useCallback(async (cursor?: string) => {
    if (cursor && (videoBusy.current || videoSnapshot.current.ownerId !== currentUserId || videoSnapshot.current.nextCursor !== cursor)) return;
    const request = ++videoRequest.current;
    videoBusy.current = true;
    setVideoState(previous => ({ ...(previous.ownerId === currentUserId ? previous : emptySavedVideos(currentUserId)), loading: !cursor, loadingMore: Boolean(cursor), error: null, errorCursor: undefined }));
    try {
      const result = await api.getSavedVideosPage(50, cursor);
      if (request !== videoRequest.current || currentOwner.current !== currentUserId) return;
      setVideoState(previous => ({ ownerId: currentUserId, videos: cursor ? [...new Map([...previous.videos, ...result.data].map(video => [video.id, video])).values()] : result.data, loaded: true, loading: false, loadingMore: false, error: null, nextCursor: result.nextCursor, hasMore: Boolean(result.hasMore && result.nextCursor) }));
    } catch {
      if (request !== videoRequest.current || currentOwner.current !== currentUserId) return;
      setVideoState(previous => ({ ...previous, loading: false, loadingMore: false, error: cursor ? 'Older saved videos could not load. Check your connection and retry.' : 'Saved videos could not load. Check your connection and retry.', errorCursor: cursor }));
    } finally {
      if (request === videoRequest.current) videoBusy.current = false;
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadSavedPosts();
    void loadSavedVideos();
    return () => { videoRequest.current++; videoBusy.current = false; };
  }, [loadSavedPosts, loadSavedVideos]);

  useEffect(() => {
    videos.forEach((video) => {
      if (!users[video.authorId]) void loadUserProfile(video.authorId);
    });
  }, [videos, users, loadUserProfile]);

  const handleRefresh = () => {
    void loadSavedPosts();
    void loadSavedVideos();
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      <section aria-label="Saved collection" className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.14] via-card to-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary"><Bookmark className="h-4 w-4" /> Private collection</div>
              <h1 className="mt-2 font-display text-3xl font-black tracking-tight">Saved for later.</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">Your saved posts and Reels stay private to you and respect the same audience and content-safety rules as the original content.</p>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="rounded-2xl"><RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh</Button>
          </div>
        </section>

        {savedPostsError && <section role="alert" className="rounded-2xl border border-destructive/40 p-4 text-sm"><p>{savedPostsError}</p>{savedPostsLoaded && <p className="mt-1 text-muted-foreground">Your last loaded saved posts are still shown.</p>}<Button variant="outline" className="mt-3" disabled={savedPostsLoading || savedPostsLoadingMore} onClick={() => void loadSavedPosts(savedPostsErrorCursor ?? undefined)}>Retry saved posts</Button></section>}
        {videosError && <section role="alert" className="rounded-2xl border border-destructive/40 p-4 text-sm"><p>{videosError}</p>{videosLoaded && <p className="mt-1 text-muted-foreground">Your last loaded saved videos are still shown.</p>}<Button variant="outline" className="mt-3" disabled={videosLoading || videosLoadingMore} onClick={() => void loadSavedVideos(videoState.errorCursor)}>Retry saved videos</Button></section>}
        {refreshing && <p role="status" className="text-sm text-muted-foreground">Loading your saved collection…</p>}

        {posts.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-display text-xl font-black">Saved posts</h3>
            <div className="space-y-5">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
          </section>
        )}
        {savedPostsHasMore && savedPostsCursor && <Button variant="outline" disabled={savedPostsLoading || savedPostsLoadingMore} onClick={() => void loadSavedPosts(savedPostsCursor)}>{savedPostsLoadingMore ? 'Loading older posts…' : 'Load older saved posts'}</Button>}

        {videos.length > 0 && (
          <section className="space-y-4">
            <h3 className="font-display text-xl font-black">Saved Reels & videos</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {videos.map((video) => {
                const author = users[video.authorId];
                return (
                  <article key={video.id} className="surface-1 overflow-hidden rounded-3xl border border-border/40">
                    <div className="relative bg-black">
                      <ProtectedMediaVideo src={video.videoUrl} poster={video.thumbnailUrl} controls preload="metadata" className="aspect-video w-full object-cover" />
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
        {videosHasMore && videoState.nextCursor && <Button variant="outline" disabled={videosLoading || videosLoadingMore} onClick={() => void loadSavedVideos(videoState.nextCursor)}>{videosLoadingMore ? 'Loading older videos…' : 'Load older saved videos'}</Button>}

        {posts.length === 0 && videos.length === 0 && savedPostsLoaded && videosLoaded && !savedPostsHasMore && !videosHasMore && !savedPostsError && !videosError && !refreshing ? (
          <section className="rounded-3xl border border-dashed border-border/50 p-10 text-center">
            <Bookmark className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <h3 className="mt-4 font-display text-xl font-black">Nothing saved yet.</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Tap the bookmark icon on a post, Reel, or video when you find an idea, guide, or moment worth returning to.</p>
            <Link href="/explore" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"><Compass className="h-4 w-4" /> Explore posts</Link>
          </section>
        ) : null}
      </section>
    </div>
  );
}
