import { useAppStore } from '@/lib/store';
import { CreatePost, PostCard } from '@/components/feed/Post';
import { StoryViewer } from '@/components/feed/StoryViewer';
import { CreateStory } from '@/components/feed/CreateStory';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Plus } from 'lucide-react';

export default function Home() {
  const { posts, stories, users, currentUser } = useAppStore();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const activeStories = stories.filter(s => !s.isHighlight);
  const storyIds = activeStories.map(s => s.id);

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Main Feed */}
      <div className="flex-1 max-w-2xl border-r border-border/50 min-h-screen">
        <div className="sticky top-0 z-20 glass px-4 py-3 flex items-center justify-between md:hidden">
          <span className="font-display font-bold text-xl tracking-tight">Home</span>
        </div>

        <Tabs defaultValue="for-you" className="w-full">
          <div className="sticky top-0 md:top-0 z-20 glass border-b border-border/50 px-4 pt-2">
            <TabsList className="w-full bg-transparent h-12 p-0 rounded-none grid grid-cols-2">
              <TabsTrigger 
                value="for-you" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium h-full"
              >
                For you
              </TabsTrigger>
              <TabsTrigger 
                value="following" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium h-full text-muted-foreground data-[state=active]:text-foreground"
              >
                Following
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="w-full whitespace-nowrap border-b border-border/50 bg-background/50">
            <div className="flex w-max space-x-4 p-4">
              {currentUser && (
                <CreateStory>
                  <div className="flex flex-col items-center gap-1 cursor-pointer">
                    <div className="relative">
                      <Avatar className="w-16 h-16 border-2 border-background">
                        <AvatarImage src={currentUser.avatarUrl} />
                        <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full border-2 border-background flex items-center justify-center text-primary-foreground">
                        <Plus className="w-3 h-3" strokeWidth={3} />
                      </div>
                    </div>
                    <span className="text-xs font-medium">Add Story</span>
                  </div>
                </CreateStory>
              )}
              {activeStories.map((story, i) => {
                const author = users[story.authorId];
                if (!author) return null;
                return (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    key={story.id} 
                    onClick={() => setViewerIndex(i)}
                    className="flex flex-col items-center gap-1 cursor-pointer group"
                  >
                    <div className={`p-0.5 rounded-full bg-gradient-to-tr ${story.viewed ? 'from-muted to-muted' : 'from-primary to-accent'} group-hover:scale-105 transition-transform`}>
                      <Avatar className="w-15 h-15 border-2 border-background">
                        {story.type === 'text' ? (
                          <AvatarFallback className={`bg-gradient-to-br ${story.backgroundGradient ?? 'from-primary to-accent'} text-white text-[9px] px-1 text-center leading-tight`}>
                            {story.textContent?.slice(0, 20)}
                          </AvatarFallback>
                        ) : (
                          <>
                            <AvatarImage src={author.avatarUrl} />
                            <AvatarFallback>{author.displayName.charAt(0)}</AvatarFallback>
                          </>
                        )}
                      </Avatar>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground truncate w-16 text-center">{author.displayName.split(' ')[0]}</span>
                  </motion.div>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" className="hidden" />
          </ScrollArea>

          <CreatePost />

          <TabsContent value="for-you" className="m-0 focus-visible:outline-none">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            <div className="p-8 text-center text-muted-foreground text-sm">
              You've caught up for now.
            </div>
          </TabsContent>
          <TabsContent value="following" className="m-0 focus-visible:outline-none">
            {posts.filter(p => p.authorId !== currentUser?.id).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Sidebar (Trending/Suggestions) */}
      <div className="hidden lg:block w-[350px] p-4 space-y-6">
        <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
          <h3 className="font-display font-medium text-lg mb-4">Trending on Yor Talks</h3>
          <div className="space-y-4">
            {[
              { tag: 'DesignSystems', posts: '12.4K' },
              { tag: 'Frontend', posts: '8.2K' },
              { tag: 'ReactConf2024', posts: '5.1K' },
              { tag: 'UIUX', posts: '3.9K' }
            ].map((trend, i) => (
              <div key={i} className="flex justify-between items-start cursor-pointer group">
                <div>
                  <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">Trending in Tech</p>
                  <p className="font-medium">#{trend.tag}</p>
                  <p className="text-xs text-muted-foreground">{trend.posts} posts</p>
                </div>
                <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted/30 rounded-2xl p-4 border border-border/50">
          <h3 className="font-display font-medium text-lg mb-4">Who to follow</h3>
          <div className="space-y-4">
            {Object.values(users).filter(u => u.id !== currentUser?.id).slice(0, 3).map((user) => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate hover:underline cursor-pointer">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                  </div>
                </div>
                <button className="shrink-0 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-full transition-colors">
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 px-2">
          <a href="#" className="hover:underline">Terms of Service</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Cookie Policy</a>
          <a href="#" className="hover:underline">Accessibility</a>
          <span>© 2024 Yor Talks.</span>
        </div>
      </div>

      {viewerIndex !== null && (
        <StoryViewer storyIds={storyIds} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
      )}
    </div>
  );
}
