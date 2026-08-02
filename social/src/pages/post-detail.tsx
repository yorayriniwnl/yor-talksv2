import { useParams, Link } from 'wouter';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { PostCardMemo as PostCard } from '@/components/feed/Post';
import { ArrowLeft, MessageCircle, Sparkles, SendHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { fadeInUp, springGentle } from '@/lib/motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function PostDetail() {
  const { id } = useParams();
  const posts = useAppStore((s) => s.posts);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const [replyText, setReplyText] = useState('');
  
  const post = posts.find((p) => p.id === id);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm font-mono text-muted-foreground">Loading post details…</p>
        </div>
      </div>
    );
  }

  // Mock related posts
  const relatedPosts = posts.filter(p => p.id !== id).slice(0, 2);

  // Mock comments
  const comments = [
    { id: 'c1', authorId: Object.keys(users)[1] || currentUser?.id, content: 'This is an insightful comment about the post above. Really makes you think.', createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: 'c2', authorId: Object.keys(users)[2] || currentUser?.id, content: 'Completely agree with this perspective!', createdAt: new Date(Date.now() - 7200000).toISOString() },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0 h-9 w-9">
            <ArrowLeft className="w-4.5 h-4.5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-bold text-base leading-tight">Thread</h2>
          <p className="text-[0.65rem] text-muted-foreground font-mono">Conversation View</p>
        </div>
      </div>

      <motion.div 
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="max-w-2xl mx-auto px-4 sm:px-6 pt-6"
      >
        <div className="mb-8 rounded-2xl overflow-hidden surface-1 border border-border/40 shadow-sm">
          <PostCard post={post} />
        </div>

        {/* Thread Section */}
        <div className="mb-10">
          <div className="showcase-section-title mb-6">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h3>Replies</h3>
          </div>
          
          {/* Composer */}
          <div className="comment-composer mb-6">
            <Avatar className="w-10 h-10 shrink-0 ring-1 ring-border/50">
              <AvatarImage src={currentUser?.avatarUrl} />
              <AvatarFallback className="font-display font-bold">{currentUser?.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex flex-col gap-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Post your reply..."
                className="w-full bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground/60 min-h-[50px]"
              />
              <div className="flex justify-end">
                <Button 
                  disabled={!replyText.trim()}
                  className={cn(
                    "rounded-xl font-bold text-xs h-9 px-5 transition-all",
                    replyText.trim() ? "glow-neon-primary bg-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <SendHorizontal className="w-3.5 h-3.5 mr-1.5" /> Reply
                </Button>
              </div>
            </div>
          </div>

          {/* Comments list */}
          <div className="space-y-3">
            {comments.map((comment) => {
              const author = users[comment.authorId as string];
              if (!author) return null;
              return (
                <div key={comment.id} className="comment-card group">
                  <Avatar className="w-9 h-9 shrink-0 ring-1 ring-border">
                    <AvatarImage src={author.avatarUrl} />
                    <AvatarFallback className="font-display text-xs">{author.displayName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm hover:underline cursor-pointer">
                        {author.displayName}
                      </span>
                      <span className="text-muted-foreground text-xs font-mono">
                        @{author.username}
                      </span>
                      <span className="text-muted-foreground text-[0.65rem] font-mono ml-auto">
                        {formatDistanceToNow(new Date(comment.createdAt))} ago
                      </span>
                    </div>
                    <p className="text-sm font-serif leading-relaxed text-foreground/90">
                      {comment.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div>
            <div className="showcase-section-title mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3>More from the community</h3>
            </div>
            <div className="space-y-4">
              {relatedPosts.map(p => (
                <div key={p.id} className="surface-1 rounded-2xl overflow-hidden border border-border/30">
                  <PostCard post={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
