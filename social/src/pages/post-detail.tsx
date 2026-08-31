import { useParams, Link } from 'wouter';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { PostCardMemo as PostCard } from '@/components/feed/Post';
import { ArrowLeft, MessageCircle, Sparkles, X } from 'lucide-react';
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
  const syncPostFromBackend = useAppStore((s) => s.syncPostFromBackend);
  
  const post = posts.find((p) => p.id === id);

  const [commentList, setCommentList] = useState<CommentItem[]>([]);
  const [replyingTo, setReplyingTo] = useState<CommentItem | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [postError, setPostError] = useState('');
  const [postAttempt, setPostAttempt] = useState(0);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [commentsAttempt, setCommentsAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setPostLoading(true);
    setPostError('');
    setReplyingTo(null);
    if (!id) { setPostError('This post is unavailable.'); setPostLoading(false); return; }
    void api.getPost(id).then((loaded) => { if (active) syncPostFromBackend(loaded); })
      .catch(() => { if (active) setPostError('This post may be private, removed, or temporarily unavailable.'); })
      .finally(() => { if (active) setPostLoading(false); });
    return () => { active = false; };
  }, [id, postAttempt, syncPostFromBackend]);

  useEffect(() => {
    if (!post || postLoading || postError) return;
    let active = true;
    setCommentsLoading(true);
    setCommentsError('');
    setCommentList([]);
    void api.getPostComments(post.id).then((comments) => {
      if (!active) return;
      setCommentList(comments.map((comment) => ({
        id: comment.id,
        authorId: comment.authorId,
        authorName: comment.author?.fullName,
        authorUsername: comment.author?.username,
        authorAvatar: comment.author?.avatarUrl ?? undefined,
        content: comment.content,
        imageUrl: comment.mediaType === 'image' ? comment.mediaUrl ?? undefined : undefined,
        gifUrl: comment.mediaType === 'gif' ? comment.mediaUrl ?? undefined : undefined,
        voiceNoteUrl: comment.mediaType === 'audio' ? comment.mediaUrl ?? undefined : undefined,
        voiceDuration: comment.mediaDuration ?? undefined,
        likes: comment.likes ?? 0,
        likedByMe: comment.likedByMe ?? false,
        repliesCount: comment.repliesCount ?? comment.replies?.length ?? 0,
        createdAt: comment.createdAt,
      })));
    }).catch(() => {
      if (active) setCommentsError('Replies could not load. Please try again.');
    }).finally(() => { if (active) setCommentsLoading(false); });
    return () => { active = false; };
  }, [post?.id, postLoading, postError, commentsAttempt]);

  if (!post || postError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          {postLoading ? <><div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" /><p role="status" className="text-sm text-muted-foreground">Loading post details…</p></> : <>
            <h2 className="text-xl font-semibold">Post unavailable</h2>
            <p role="alert" className="max-w-sm text-center text-sm text-muted-foreground">{postError}</p>
            <Button onClick={() => setPostAttempt((value) => value + 1)}>Retry post</Button>
            <Link href="/">Back to home</Link>
          </>}
        </div>
      </div>
    );
  }

  // Related posts
  const relatedPosts = posts.filter(p => p.id !== id).slice(0, 2);

  const handleAddComment = async (data: RichCommentData) => {
    if (!post) return;
    if (!data.text.trim() && !data.imageUrl && !data.gifUrl && !data.voiceNoteUrl) return;
    if (replyingTo) {
      if (data.imageUrl || data.gifUrl || data.voiceNoteUrl) {
        throw new Error('Text replies are required for nested replies. Add media as a top-level comment instead.');
      }
      const result = await api.replyToPostComment(post.id, replyingTo.id, data.text.trim());
      syncPostFromBackend(result.post);
      setCommentList((prev) => prev.map((comment) => comment.id === replyingTo.id
        ? { ...comment, repliesCount: (comment.repliesCount ?? 0) + 1 }
        : comment));
      setReplyingTo(null);
      return;
    }

    const media = data.voiceNoteUrl
      ? { mediaUrl: data.voiceNoteUrl, mediaType: 'audio' as const, mediaDuration: data.voiceDuration }
      : data.gifUrl
        ? { mediaUrl: data.gifUrl, mediaType: 'gif' as const }
        : data.imageUrl
          ? { mediaUrl: data.imageUrl, mediaType: 'image' as const }
          : {};
    const result = await api.commentOnPost(post.id, { content: data.text.trim(), ...media });
    const newComment: CommentItem = {
      id: result.comment.id,
      authorId: currentUser?.id || 'guest',
      authorName: currentUser?.displayName || currentUser?.username || 'You',
      authorUsername: currentUser?.username || 'you',
      authorAvatar: currentUser?.avatarUrl,
      content: result.comment.content,
      imageUrl: result.comment.mediaType === 'image' ? result.comment.mediaUrl ?? undefined : undefined,
      gifUrl: result.comment.mediaType === 'gif' ? result.comment.mediaUrl ?? undefined : undefined,
      voiceNoteUrl: result.comment.mediaType === 'audio' ? result.comment.mediaUrl ?? undefined : undefined,
      voiceDuration: result.comment.mediaDuration ?? undefined,
      likes: 0,
      createdAt: result.comment.createdAt,
    };
    syncPostFromBackend(result.post);
    setCommentList((prev) => [...prev, newComment]);
  };

  const handleLikeComment = async (commentId: string) => {
    const updated = await api.likePostComment(post.id, commentId);
    setCommentList((prev) => prev.map((comment) => comment.id === commentId
      ? { ...comment, likes: updated.likes ?? 0, likedByMe: updated.likedByMe ?? false }
      : comment));
    return { likes: updated.likes ?? 0, likedByMe: updated.likedByMe ?? false };
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 flex items-center gap-4 border-b border-border/30">
        <Link href="/">
          <Button aria-label="Back to home" variant="ghost" size="icon" className="rounded-full shrink-0 h-9 w-9 cursor-pointer">
            <ArrowLeft className="w-4.5 h-4.5" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-black text-base leading-tight text-foreground">Thread & Conversation</h2>
          <p className="text-xs text-muted-foreground">A thought worth talking about.</p>
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
              Replies{!commentsLoading && !commentsError ? ` (${commentList.length})` : ''}
            </h3>
          </div>
          
          {/* Rich Composer */}
          {replyingTo && (
            <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              <span className="truncate text-muted-foreground">Replying to <strong className="text-foreground">@{replyingTo.authorUsername || 'user'}</strong></span>
              <button type="button" onClick={() => setReplyingTo(null)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Cancel reply">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <RichCommentComposer
            postId={post.id}
            creatorUser={users[post.authorId]}
            placeholder={replyingTo ? 'Write a text reply...' : 'Add a reply, photo, GIF, or voice note...'}
            onCommentSubmit={handleAddComment}
          />

          {/* Comments List */}
          {commentsLoading ? <p role="status">Loading replies…</p> : commentsError ? <div role="alert" className="space-y-3"><p>{commentsError}</p><Button onClick={() => setCommentsAttempt((value) => value + 1)}>Retry replies</Button></div> : <RichCommentList comments={commentList} onLikeComment={handleLikeComment} onReplyComment={setReplyingTo} />}
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
