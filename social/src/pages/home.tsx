import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import StoriesRow from '@/components/feed/StoriesRow';
import { CreatePost, PostCardMemo as PostCard } from '@/components/feed/Post';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Sparkles, TrendingUp, Compass, Shield } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/motion';

export default function Home() {
  const posts = useAppStore((state) => state.posts);
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const followUser = useAppStore((state) => state.followUser);
  const unfollowUser = useAppStore((state) => state.unfollowUser);

  // Suggested users list
  const suggestedUsers = useMemo(() => {
    return Object.values(users)
      .filter((u) => u.id !== currentUser?.id && !currentUser?.followingIds?.includes(u.id))
      .slice(0, 5);
  }, [users, currentUser]);

  const handleToggleFollow = (userId: string) => {
    if (!currentUser) return;
    const isFollowing = currentUser.followingIds?.includes(userId);
    if (isFollowing) {
      unfollowUser(userId);
    } else {
      followUser(userId);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      <div className="max-w-[1020px] mx-auto px-0 sm:px-4 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Feed Column (Instagram Style) */}
          <main className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-4">
            
            {/* Stories Row Container */}
            <div className="surface-1 rounded-none sm:rounded-2xl p-4 border-y sm:border border-border/40 overflow-hidden">
              <StoriesRow />
            </div>

            {/* Create Post Inline Box */}
            <div className="surface-1 rounded-none sm:rounded-2xl border-y sm:border border-border/40">
              <CreatePost />
            </div>

            {/* Feed Stream */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {posts.map((post, i) => (
                <ScrollReveal
                  key={post.id}
                  delay={Math.min(i * 0.05, 0.3)}
                  className="surface-1 rounded-none sm:rounded-2xl border-y sm:border border-border/40 overflow-hidden shadow-sm hover:border-border/60 transition-colors"
                >
                  <PostCard post={post} />
                </ScrollReveal>
              ))}
            </motion.div>
          </main>

          {/* Right Sidebar (Desktop Instagram Style) */}
          <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 space-y-6 sticky top-6 h-fit">
            
            {/* Current User Card */}
            {currentUser && (
              <div className="flex items-center justify-between p-3 rounded-2xl surface-1 border border-border/40">
                <Link href={`/profile/${currentUser.id}`} className="flex items-center gap-3 min-w-0 group">
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-2 ring-primary/30 group-hover:ring-primary transition-all">
                      <AvatarImage src={currentUser.avatarUrl} />
                      <AvatarFallback className="font-display font-bold">{currentUser.displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-sm truncate group-hover:underline">{currentUser.displayName}</h4>
                    <p className="text-xs text-muted-foreground font-mono truncate">@{currentUser.username}</p>
                  </div>
                </Link>
                <div className="level-badge text-[0.65rem] shrink-0">
                  <Shield className="w-3 h-3" /> Lv. 5
                </div>
              </div>
            )}

            {/* Suggested for You */}
            <div className="surface-1 rounded-2xl p-5 border border-border/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-sm text-foreground/80 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Suggested for you
                </h3>
                <Link href="/explore" className="text-xs font-mono font-bold text-primary hover:underline">
                  See all
                </Link>
              </div>

              <div className="space-y-4">
                {suggestedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between gap-3">
                    <Link href={`/profile/${user.id}`} className="flex items-center gap-3 min-w-0 group flex-1">
                      <Avatar className="w-10 h-10 border border-border/40 shrink-0">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback className="font-display font-bold text-xs">{user.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs truncate group-hover:underline">{user.displayName}</h5>
                        <p className="text-[0.68rem] text-muted-foreground font-mono truncate">@{user.username}</p>
                      </div>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleFollow(user.id)}
                      className="text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 h-8 px-3 rounded-xl shrink-0"
                    >
                      Follow
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer / Meta Links */}
            <div className="px-2 text-[0.68rem] text-muted-foreground/60 font-mono space-y-2">
              <div className="flex flex-wrap gap-x-2 gap-y-1">
                <Link href="/explore" className="hover:underline">Explore</Link> •
                <Link href="/articles" className="hover:underline">Articles</Link> •
                <Link href="/communities" className="hover:underline">Circles</Link> •
                <Link href="/settings" className="hover:underline">Settings</Link>
              </div>
              <p>© 2026 Yor Talks Inc. • Built for humans</p>
            </div>

          </aside>

        </div>
      </div>
    </div>
  );
}
