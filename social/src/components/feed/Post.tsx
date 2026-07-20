import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, Bookmark, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, Repeat2, SendHorizonal, Share, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { useAppStore, Post as PostType } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function CreatePost() {
  const currentUser = useAppStore((state) => state.currentUser);
  const addPost = useAppStore((state) => state.addPost);
  const [content, setContent] = useState('');

  if (!currentUser) return null;

  return (
    <div className="border-b border-border/70 bg-card/40 px-5 py-5 sm:px-7">
      <div className="flex gap-4">
        <Avatar className="h-10 w-10 shrink-0 ring-2 ring-primary/10">
          <AvatarImage src={currentUser.avatarUrl} />
          <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <textarea
            id="post-composer"
            aria-label="Write a post"
            placeholder="What is on your mind?"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[72px] w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/70"
          />
          <div className="mt-2 flex items-center justify-between border-t border-border/70 pt-3">
            <div className="flex items-center gap-0.5 text-primary">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 hover:text-primary" aria-label="Add an image"><ImageIcon className="h-[18px] w-[18px]" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 hover:text-primary" aria-label="Create a poll"><BarChart2 className="h-[18px] w-[18px]" /></Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-primary hover:bg-primary/10 hover:text-primary" aria-label="Add an emoji"><Smile className="h-[18px] w-[18px]" /></Button>
            </div>
            <Button
              className="h-9 rounded-xl px-4 font-semibold shadow-md shadow-primary/20 transition-transform hover:scale-[1.02]"
              disabled={!content.trim()}
              onClick={() => { addPost(content); setContent(''); }}
            >
              <SendHorizonal className="h-4 w-4" /> Post
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PostCard({ post }: { post: PostType }) {
  const users = useAppStore((state) => state.users);
  const likePost = useAppStore((state) => state.likePost);
  const votePoll = useAppStore((state) => state.votePoll);
  const [, setLocation] = useLocation();
  const author = users[post.authorId];
  const handleOpen = useCallback(() => setLocation(`/post/${post.id}`), [post.id, setLocation]);

  if (!author) return null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group cursor-pointer border-b border-border/70 px-5 py-5 transition-colors hover:bg-muted/35 sm:px-7"
      onClick={handleOpen}
    >
      <div className="flex gap-3.5">
        <Link href={`/profile/${author.id}`} onClick={(event) => event.stopPropagation()} aria-label={`View ${author.displayName}'s profile`}>
          <Avatar className="h-10 w-10 ring-2 ring-transparent transition-all hover:ring-primary/25">
            <AvatarImage src={author.avatarUrl} />
            <AvatarFallback>{author.displayName.charAt(0)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <Link href={`/profile/${author.id}`} onClick={(event) => event.stopPropagation()} className="truncate font-semibold hover:underline">{author.displayName}</Link>
              {author.verified && <svg className="h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>}
              <span className="truncate text-sm text-muted-foreground">@{author.username}</span>
              <span className="shrink-0 text-sm text-muted-foreground">&middot;</span>
              <span className="shrink-0 text-sm text-muted-foreground hover:underline">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" onClick={(event) => event.stopPropagation()} aria-label="More post options"><MoreHorizontal className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end"><DropdownMenuItem>Copy link</DropdownMenuItem><DropdownMenuItem>Not interested</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/95">{post.content}</p>

          {post.media && post.media.length > 0 && (
            <div className={cn('mt-3 grid overflow-hidden rounded-2xl border border-border/60 bg-muted/20', post.media.length > 1 ? 'grid-cols-2 gap-2' : 'grid-cols-1')}>
              {post.media.map((url, index) => <img key={index} src={url} alt={`${author.displayName}'s post`} className="max-h-[400px] w-full object-cover transition-opacity hover:opacity-90" loading="lazy" />)}
            </div>
          )}

          {post.poll && (
            <div className="mt-3 rounded-2xl border border-border/60 bg-muted/20 p-4" onClick={(event) => event.stopPropagation()}>
              <h4 className="mb-3 font-semibold">{post.poll.question}</h4>
              <div className="space-y-2">
                {post.poll.options.map((option) => {
                  const percentage = post.poll!.totalVotes > 0 ? Math.round((option.votes / post.poll!.totalVotes) * 100) : 0;
                  const isVoted = post.poll!.votedOptionId === option.id;
                  return (
                    <button
                      type="button" key={option.id}
                      className={cn('relative flex h-10 w-full items-center overflow-hidden rounded-xl border px-3 text-left transition-colors', post.poll!.votedOptionId ? 'border-transparent' : 'border-border hover:bg-muted/60', isVoted && 'font-semibold')}
                      onClick={() => !post.poll!.votedOptionId && votePoll(post.id, option.id)}
                    >
                      {post.poll!.votedOptionId && <motion.span initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={cn('absolute inset-y-0 left-0 opacity-20', isVoted ? 'bg-primary' : 'bg-muted-foreground')} />}
                      <span className="relative z-10 flex w-full justify-between text-sm"><span>{option.text}</span>{post.poll!.votedOptionId && <span>{percentage}%</span>}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{post.poll.totalVotes} votes</div>
            </div>
          )}

          <div className="mt-3 flex max-w-md items-center justify-between text-muted-foreground">
            <button aria-label="Comment on post" className="group/btn -ml-1.5 flex items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => event.stopPropagation()}><span className="rounded-lg p-1.5 transition-colors group-hover/btn:bg-primary/10"><MessageCircle className="h-4 w-4" /></span><span className="text-xs">{post.comments > 0 && post.comments}</span></button>
            <button aria-label="Repost" className="group/btn flex items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => event.stopPropagation()}><span className="rounded-lg p-1.5 transition-colors group-hover/btn:bg-green-500/10"><Repeat2 className="h-4 w-4" /></span><span className="text-xs">{post.shares > 0 && post.shares}</span></button>
            <button aria-label={post.likedByMe ? 'Unlike post' : 'Like post'} className={cn('group/btn flex items-center gap-1.5 rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', post.likedByMe ? 'text-red-500' : 'hover:text-red-500')} onClick={(event) => { event.stopPropagation(); likePost(post.id); }}><span className={cn('rounded-lg p-1.5 transition-colors', post.likedByMe ? 'bg-red-500/10' : 'group-hover/btn:bg-red-500/10')}><Heart className={cn('h-4 w-4', post.likedByMe && 'fill-current')} /></span><span className="text-xs">{post.likes > 0 && post.likes}</span></button>
            <button aria-label="Save post" className={cn('group/btn flex items-center gap-1.5 rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', post.savedByMe ? 'text-primary' : 'hover:text-primary')} onClick={(event) => event.stopPropagation()}><span className="rounded-lg p-1.5 transition-colors group-hover/btn:bg-primary/10"><Bookmark className={cn('h-4 w-4', post.savedByMe && 'fill-current')} /></span></button>
            <button aria-label="Share post" className="group/btn flex items-center gap-1.5 rounded-lg p-1.5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(event) => event.stopPropagation()}><span className="rounded-lg p-1.5 transition-colors group-hover/btn:bg-primary/10"><Share className="h-4 w-4" /></span></button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export const PostCardMemo = React.memo(PostCard);
