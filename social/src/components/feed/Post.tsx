import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, Post as PostType } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Share, Image as ImageIcon, Smile, BarChart2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function CreatePost() {
  const currentUser = useAppStore((s) => s.currentUser);
  const addPost = useAppStore((s) => s.addPost);
  const [content, setContent] = useState('');
  
  if (!currentUser) return null;

  return (
    <div className="p-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
      <div className="flex gap-4">
        <Avatar className="w-10 h-10">
          <AvatarImage src={currentUser.avatarUrl} />
          <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <textarea
            placeholder="What's moving?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-transparent resize-none outline-none text-lg placeholder:text-muted-foreground min-h-[60px]"
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1 text-primary">
              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-primary hover:text-primary hover:bg-primary/10"><ImageIcon className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-primary hover:text-primary hover:bg-primary/10"><BarChart2 className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 text-primary hover:text-primary hover:bg-primary/10"><Smile className="w-5 h-5" /></Button>
            </div>
            <Button 
              className="rounded-full px-6 font-medium" 
              disabled={!content.trim()}
              onClick={() => {
                addPost(content);
                setContent('');
              }}
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostCard({ post }: { post: PostType }) {
  const users = useAppStore((s) => s.users);
  const likePost = useAppStore((s) => s.likePost);
  const votePoll = useAppStore((s) => s.votePoll);
  const [, setLocation] = useLocation();
  const author = users[post.authorId];
  
  if (!author) return null;

  const handleOpen = useCallback(() => setLocation(`/post/${post.id}`), [post.id, setLocation]);

  return (
    <motion.article 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer group"
      onClick={handleOpen}
    >
      <div className="flex gap-4">
        <Link href={`/profile/${author.id}`} onClick={(e) => e.stopPropagation()}>
          <Avatar className="w-10 h-10 ring-2 ring-transparent hover:ring-primary/20 transition-all">
            <AvatarImage src={author.avatarUrl} />
            <AvatarFallback>{author.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Link href={`/profile/${author.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline truncate">
                {author.displayName}
              </Link>
              {author.verified && (
                <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
              <span className="text-muted-foreground text-sm truncate">@{author.username}</span>
              <span className="text-muted-foreground text-sm shrink-0">·</span>
              <span className="text-muted-foreground text-sm shrink-0 hover:underline">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Copy link</DropdownMenuItem>
                <DropdownMenuItem>Not interested</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>

          {post.media && post.media.length > 0 && (
            <div className={cn("mt-3 grid gap-2 overflow-hidden rounded-2xl", post.media.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
              {post.media.map((url, i) => (
                <img key={i} src={url} alt="" className="w-full h-auto object-cover max-h-[400px] hover:opacity-90 transition-opacity" loading="lazy" />
              ))}
            </div>
          )}

          {post.poll && (
            <div className="mt-3 border border-border/50 rounded-2xl p-4 bg-muted/10" onClick={(e) => e.stopPropagation()}>
              <h4 className="font-medium mb-3">{post.poll.question}</h4>
              <div className="space-y-2">
                {post.poll.options.map(opt => {
                  const percentage = post.poll!.totalVotes > 0 ? Math.round((opt.votes / post.poll!.totalVotes) * 100) : 0;
                  const isVoted = post.poll!.votedOptionId === opt.id;
                  
                  return (
                    <div 
                      key={opt.id} 
                      className={cn(
                        "relative h-10 rounded-lg overflow-hidden flex items-center px-3 cursor-pointer border transition-colors",
                        post.poll!.votedOptionId ? "border-transparent" : "border-border hover:bg-muted/50",
                        isVoted && "font-medium"
                      )}
                      onClick={() => !post.poll!.votedOptionId && votePoll(post.id, opt.id)}
                    >
                      {post.poll!.votedOptionId && (
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn("absolute left-0 top-0 bottom-0 opacity-20", isVoted ? "bg-primary" : "bg-muted-foreground")}
                        />
                      )}
                      <div className="relative z-10 flex justify-between w-full text-sm">
                        <span>{opt.text}</span>
                        {post.poll!.votedOptionId && <span>{percentage}%</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-2">{post.poll.totalVotes} votes</div>
            </div>
          )}

          <div className="flex items-center justify-between mt-3 text-muted-foreground max-w-md">
            <button className="flex items-center gap-1.5 hover:text-primary transition-colors group/btn p-1.5 -ml-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="p-1.5 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span className="text-xs">{post.comments > 0 && post.comments}</span>
            </button>
            <button className="flex items-center gap-1.5 hover:text-green-500 transition-colors group/btn p-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="p-1.5 rounded-full group-hover/btn:bg-green-500/10 transition-colors">
                <Repeat2 className="w-4 h-4" />
              </div>
              <span className="text-xs">{post.shares > 0 && post.shares}</span>
            </button>
            <button 
              className={cn("flex items-center gap-1.5 transition-colors group/btn p-1.5", post.likedByMe ? "text-red-500" : "hover:text-red-500")}
              onClick={(e) => { e.stopPropagation(); likePost(post.id); }}
            >
              <div className={cn("p-1.5 rounded-full transition-colors", post.likedByMe ? "bg-red-500/10" : "group-hover/btn:bg-red-500/10")}>
                <Heart className={cn("w-4 h-4", post.likedByMe && "fill-current")} />
              </div>
              <span className="text-xs">{post.likes > 0 && post.likes}</span>
            </button>
            <button 
              className={cn("flex items-center gap-1.5 transition-colors group/btn p-1.5", post.savedByMe ? "text-primary" : "hover:text-primary")} 
              onClick={(e) => { e.stopPropagation(); }}
            >
              <div className="p-1.5 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                <Bookmark className={cn("w-4 h-4", post.savedByMe && "fill-current")} />
              </div>
            </button>
            <button className="flex items-center gap-1.5 hover:text-primary transition-colors group/btn p-1.5" onClick={(e) => e.stopPropagation()}>
              <div className="p-1.5 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                <Share className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export const PostCardMemo = React.memo(PostCard);
