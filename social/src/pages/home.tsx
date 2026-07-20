import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowUpRight, Flame, Plus, Sparkles, Users } from 'lucide-react';
import { Post as PostType, useAppStore } from '@/lib/store';
import { CreatePost, PostCardMemo as PostCard } from '@/components/feed/Post';
import { StoryViewer } from '@/components/feed/StoryViewer';
import { CreateStory } from '@/components/feed/CreateStory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProgressiveList } from '@/hooks/useProgressiveList';
import { VirtualList } from '@/components/virtual/VirtualList';

const trends = [
  { tag: 'DesignSystems', posts: '12.4K', color: 'bg-rose-400' },
  { tag: 'CreativeCoding', posts: '8.2K', color: 'bg-amber-400' },
  { tag: 'SlowInternet', posts: '5.1K', color: 'bg-sky-400' },
];

export default function Home() {
  const posts = useAppStore((s) => s.posts);
  const stories = useAppStore((s) => s.stories);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const communities = useAppStore((s) => s.communities);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const activeStories = useMemo(() => stories.filter((story) => !story.isHighlight), [stories]);
  const storyIds = useMemo(() => activeStories.map((story) => story.id), [activeStories]);
  const firstName = currentUser?.displayName.split(' ')[0] ?? 'there';

  return (
    <div className="mx-auto flex w-full max-w-[1500px] gap-6 px-0 py-0 lg:px-6 lg:py-6 xl:gap-8">
      <section className="surface min-h-full min-w-0 flex-1 overflow-hidden lg:min-h-[calc(100dvh-3rem)] lg:rounded-[1.6rem] xl:max-w-[780px]">
        <header className="border-b border-border/70 px-5 pb-5 pt-6 sm:px-7 sm:pt-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-primary"><Sparkles className="h-3.5 w-3.5" /> Your daily pulse</p>
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">Good to see you, {firstName}.</h1>
              <p className="mt-1 text-sm text-muted-foreground">A quieter corner of the internet, full of good ideas.</p>
            </div>
            <div className="hidden h-11 w-11 shrink-0 rotate-6 place-items-center rounded-2xl bg-primary/10 text-primary sm:grid"><Flame className="h-5 w-5" /></div>
          </div>
        </header>

        <Tabs defaultValue="for-you" className="w-full">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-3 sm:px-7">
            <TabsList className="h-10 rounded-xl bg-muted/75 p-1">
              <TabsTrigger value="for-you" className="rounded-lg px-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">For you</TabsTrigger>
              <TabsTrigger value="following" className="rounded-lg px-3 text-sm text-muted-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm">Following</TabsTrigger>
            </TabsList>
            <span className="hidden text-xs font-medium text-muted-foreground sm:block">Fresh perspectives, not noise</span>
          </div>

          <div className="border-b border-border/70 bg-muted/20 px-5 py-4 sm:px-7">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">People in your orbit</p>
              <button className="text-xs font-semibold text-primary hover:underline">See all</button>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex w-max gap-4 pb-1">
                {currentUser && (
                  <CreateStory>
                    <button className="group flex w-[58px] flex-col items-center gap-2 rounded-xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="relative">
                        <Avatar className="h-[54px] w-[54px] border-2 border-card shadow-sm"><AvatarImage src={currentUser.avatarUrl} /><AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback></Avatar>
                        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground"><Plus className="h-3 w-3" strokeWidth={3} /></span>
                      </span>
                      <span className="w-full truncate text-[11px] font-semibold text-muted-foreground group-hover:text-foreground">Share</span>
                    </button>
                  </CreateStory>
                )}
                {activeStories.map((story, index) => {
                  const author = users[story.authorId];
                  if (!author) return null;
                  return (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.04 }}
                      key={story.id} onClick={() => setViewerIndex(index)}
                      className="group flex w-[58px] flex-col items-center gap-2 rounded-xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className={`rounded-[1.15rem] bg-gradient-to-br p-0.5 shadow-sm ${story.viewed ? 'from-border to-muted' : 'from-primary via-rose-400 to-amber-300'}`}>
                        <Avatar className="h-[50px] w-[50px] border-2 border-card">
                          {story.type === 'text' ? <AvatarFallback className={`bg-gradient-to-br ${story.backgroundGradient ?? 'from-primary to-accent'} px-1 text-center text-[9px] leading-tight text-white`}>{story.textContent?.slice(0, 20)}</AvatarFallback> : <><AvatarImage src={author.avatarUrl} /><AvatarFallback>{author.displayName.charAt(0)}</AvatarFallback></>}
                        </Avatar>
                      </span>
                      <span className="w-full truncate text-[11px] font-medium text-muted-foreground group-hover:text-foreground">{author.displayName.split(' ')[0]}</span>
                    </motion.button>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" className="hidden" />
            </ScrollArea>
          </div>

          <CreatePost />

          <TabsContent value="for-you" className="m-0 focus-visible:outline-none">
            {posts.length > 24 ? <VirtualList items={posts} itemHeight={260} height={800} renderItem={(post) => <PostCard key={post.id} post={post} />} /> : <Feed posts={posts} />}
          </TabsContent>
          <TabsContent value="following" className="m-0 focus-visible:outline-none">
            <Feed posts={posts.filter((post) => post.authorId !== currentUser?.id)} emptyMessage="Follow a few voices and their thoughts will land here." />
          </TabsContent>
        </Tabs>
      </section>

      <aside className="hidden w-[330px] shrink-0 space-y-5 xl:block">
        <section className="surface overflow-hidden rounded-2xl">
          <div className="bg-[linear-gradient(120deg,hsl(var(--primary)/0.16),hsl(38_88%_64%/0.14))] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Your next small win</p>
            <h2 className="mt-2 font-display text-xl font-bold leading-tight">Add one thought to your corner today.</h2>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full w-[43%] rounded-full bg-primary" /></div>
            <p className="mt-2 text-xs text-muted-foreground">3-day sharing streak · 43% to a new badge</p>
          </div>
          <div className="p-4">
            <Link href="/achievements" className="flex items-center justify-between rounded-xl px-2 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10">See your progress <ArrowUpRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section className="surface rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Conversations gaining shape</h2><Flame className="h-4 w-4 text-primary" /></div>
          <div className="space-y-1">
            {trends.map((trend, index) => <Link key={trend.tag} href={`/explore?tag=${trend.tag}`} className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/70"><span className={`h-2.5 w-2.5 rounded-full ${trend.color}`} /><span className="min-w-0 flex-1"><span className="block text-xs text-muted-foreground">#{index + 1} in community</span><span className="block truncate text-sm font-semibold group-hover:text-primary">#{trend.tag}</span></span><span className="text-xs text-muted-foreground">{trend.posts}</span></Link>)}
          </div>
          <Link href="/explore" className="mt-3 block px-2 text-sm font-semibold text-primary hover:underline">Explore conversations</Link>
        </section>

        <section className="surface rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Your circles</h2><Users className="h-4 w-4 text-muted-foreground" /></div>
          <div className="space-y-3">
            {communities.filter((community) => community.isMember).slice(0, 3).map((community) => <Link key={community.id} href={`/communities/${community.id}`} className="group flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-muted/70"><img src={community.coverUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold group-hover:text-primary">{community.name}</span><span className="block text-xs text-muted-foreground">{community.members.toLocaleString()} members</span></span></Link>)}
          </div>
        </section>

        <p className="px-2 text-xs leading-5 text-muted-foreground">Yor Talks is built for real conversation. <Link href="/settings" className="underline hover:text-foreground">Your privacy settings</Link> · <Link href="/articles" className="underline hover:text-foreground">Guides</Link></p>
      </aside>

      {viewerIndex !== null && <StoryViewer storyIds={storyIds} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
    </div>
  );
}

function Feed({ posts, emptyMessage = 'You are all caught up for now. Come back when there is something new.' }: { posts: PostType[]; emptyMessage?: string }) {
  const { visibleItems, hasMore, sentinelRef } = useProgressiveList(posts, 8);
  if (!posts.length) return <div className="p-10 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  return <>
    {visibleItems.map((post) => <PostCard key={post.id} post={post} />)}
    <div ref={sentinelRef as any} />
    {!hasMore && <div className="p-9 text-center text-sm text-muted-foreground">{emptyMessage}</div>}
  </>;
}
