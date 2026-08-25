import { useParams, Link } from 'wouter';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { PostCardMemo as PostCard } from '@/components/feed/Post';
import { ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import { RichCommentComposer, RichCommentData } from '@/components/comments/RichCommentComposer';
import { RichCommentList, CommentItem } from '@/components/comments/RichCommentList';

export default function PostDetail() {
  const { id } = useParams<{ id?: string }>();
  const posts = useAppStore((s) => s.posts);
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  
  const post = posts.find((p) => p.id === id);

  // Initial demo comments
  const [commentList, setCommentList] = useState<CommentItem[]>([
    {
      id: 'c1',
      authorId: 'u_aarav',
      authorName: 'Aarav Patel',
      authorUsername: 'aarav_p',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200',
      content: 'This Bharat creator update is revolutionary! The UPI tip jar is instant. 🇮🇳',
      tipAmount: 100,
      likes: 14,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'c2',
      authorId: 'u_sneha',
      authorName: 'Sneha Sharma',
      authorUsername: 'sneha_creates',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200',
      content: 'Loving the Cyberpunk and Bharat Gold filters on the 4K studio camera!',
      gifUrl: 'https://media.giphy.com/media/l1IY8mBoHYpksZG7C/giphy.gif',
      likes: 8,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ]);

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

  // Related posts
  const relatedPosts = posts.filter(p => p.id !== id).slice(0, 2);

  const handleAddComment = (data: RichCommentData) => {
    const newComment: CommentItem = {
      id: `c_${Date.now()}`,
      authorId: currentUser?.id || 'guest',
      authorName: currentUser?.displayName || currentUser?.username || 'You',
      authorUsername: currentUser?.username || 'you',
      authorAvatar: currentUser?.avatarUrl,
      content: data.text,
      imageUrl: data.imageUrl,
      gifUrl: data.gifUrl,
      voiceNoteUrl: data.voiceNoteUrl,
      voiceDuration: data.voiceDuration,
      tipAmount: data.tipAmount,
      likes: 0,
      createdAt: new Date().toISOString(),
    };

    setCommentList((prev) => [newComment, ...prev]);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 flex items-center gap-4 border-b border-border/30">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full shrink-0 h-9 w-9 cursor-pointer">
            <ArrowLeft className="w-4.5 h-4.5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-black text-base leading-tight text-foreground">Thread & Conversation</h2>
          <p className="text-[0.65rem] text-muted-foreground font-mono">Replies, Photos, GIFs & Super Comments 🇮🇳</p>
        </div>
      </div>

      <motion.div 
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="max-w-2xl mx-auto px-4 sm:px-6 pt-6"
      >
        <div className="mb-6 rounded-3xl overflow-hidden surface-1 border border-border/40 shadow-sm">
          <PostCard post={post} />
        </div>

        {/* Rich Media Comment Section */}
        <div className="mb-10 space-y-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-primary" />
            <h3 className="font-display font-extrabold text-sm text-foreground">
              Replies & Super Comments ({commentList.length})
            </h3>
          </div>
          
          {/* Rich Composer */}
          <RichCommentComposer
            postId={post.id}
            creatorUser={users[post.authorId]}
            placeholder="Add a reply, photo, GIF, voice note or tip..."
            onCommentSubmit={handleAddComment}
          />

          {/* Comments List */}
          <RichCommentList comments={commentList} />
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-accent" />
              <h3 className="font-display font-extrabold text-sm text-foreground">More from the community</h3>
            </div>
            <div className="space-y-4">
              {relatedPosts.map(p => (
                <div key={p.id} className="surface-1 rounded-3xl overflow-hidden border border-border/30">
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
