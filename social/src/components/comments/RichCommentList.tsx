import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Reply, Zap, Mic, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';

export interface CommentItem {
  id: string;
  authorId: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatar?: string;
  content: string;
  imageUrl?: string;
  gifUrl?: string;
  voiceNoteUrl?: string;
  voiceDuration?: number;
  tipAmount?: number;
  likes?: number;
  likedByMe?: boolean;
  createdAt: string;
}

export function RichCommentList({
  comments,
  onLikeComment,
  onReplyComment,
}: {
  comments: CommentItem[];
  onLikeComment?: (id: string) => void;
  onReplyComment?: (comment: CommentItem) => void;
}) {
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const handleLike = (id: string) => {
    sounds.playPop();
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
    onLikeComment?.(id);
  };

  return (
    <div className="space-y-3 font-sans">
      {comments.map((comment) => {
        const isLiked = likedMap[comment.id] || comment.likedByMe;
        const isSuperComment = Boolean(comment.tipAmount);

        return (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-3 rounded-2xl transition-all border",
              isSuperComment
                ? "bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-400/40 shadow-sm"
                : "surface-1 border-border/40"
            )}
          >
            <div className="flex items-start gap-2.5">
              <Avatar className="w-8 h-8 ring-1 ring-border shrink-0 mt-0.5">
                <AvatarImage src={comment.authorAvatar} />
                <AvatarFallback className="font-display font-bold text-xs">
                  {comment.authorName?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs text-foreground hover:underline cursor-pointer">
                    {comment.authorName || 'User'}
                  </span>
                  {comment.authorUsername && (
                    <span className="text-[0.68rem] text-muted-foreground font-mono">
                      @{comment.authorUsername}
                    </span>
                  )}
                  {isSuperComment && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[0.62rem] font-bold font-mono border border-amber-400/30">
                      <Zap className="w-3 h-3 fill-amber-400 text-amber-400" /> ₹{comment.tipAmount} Tip
                    </span>
                  )}
                  <span className="text-[0.65rem] text-muted-foreground font-mono ml-auto">
                    {formatDistanceToNow(new Date(comment.createdAt))} ago
                  </span>
                </div>

                {/* Comment Text */}
                {comment.content && (
                  <p className="text-xs leading-relaxed text-foreground/90 mt-1 font-serif whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}

                {/* Photo Attachment */}
                {comment.imageUrl && (
                  <div className="mt-2 max-w-xs rounded-xl overflow-hidden border border-border/50 shadow-sm">
                    <img src={comment.imageUrl} alt="Comment media" className="w-full h-auto max-h-48 object-cover" />
                  </div>
                )}

                {/* GIF Attachment */}
                {comment.gifUrl && (
                  <div className="mt-2 max-w-xs rounded-xl overflow-hidden border border-border/50 shadow-sm">
                    <img src={comment.gifUrl} alt="GIF" className="w-full h-auto max-h-44 object-cover" />
                  </div>
                )}

                {/* Voice Memo */}
                {comment.voiceNoteUrl && (
                  <div className="mt-2 flex items-center gap-2 p-2 rounded-xl surface-2 border border-primary/20 max-w-xs">
                    <Mic className="w-4 h-4 text-primary shrink-0" />
                    <audio controls src={comment.voiceNoteUrl} className="h-6 max-w-[200px]" />
                  </div>
                )}

                {/* Actions: Like & Reply */}
                <div className="flex items-center gap-4 mt-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleLike(comment.id)}
                    className={cn(
                      "flex items-center gap-1 text-[0.68rem] font-medium transition-colors cursor-pointer",
                      isLiked ? "text-rose-500 font-bold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-rose-500")} />
                    <span>{(comment.likes || 0) + (isLiked ? 1 : 0)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onReplyComment?.(comment)}
                    className="flex items-center gap-1 text-[0.68rem] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
