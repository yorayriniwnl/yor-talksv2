import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Bookmark, Heart, ImagePlus, MessageCircle, MoreHorizontal, Repeat2, SendHorizonal, Share, Smile, X, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { useAppStore, Post as PostType } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { fadeInUp, tapScale, springBouncy } from '@/lib/motion';
import { MiniProfileCard } from '@/components/ui/MiniProfileCard';
import { AudioWaveformPlayer } from '@/components/feed/AudioWaveformPlayer';
import { sounds } from '@/lib/sound';
import { TiltCard } from '@/components/ui/TiltCard';

const MAX_POST_LENGTH = 500;
const QUICK_EMOJIS = ['✨', '💡', '👏', '🔥', '💬', '❤️'];

export function CreatePost() {
  const currentUser = useAppStore((state) => state.currentUser);
  const addPost = useAppStore((state) => state.addPost);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mediaRef = useRef<string[]>([]);
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    return () => {
      mediaRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  if (!currentUser) return null;

  const validPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean);
  const canPublish = Boolean(content.trim()) && content.length <= MAX_POST_LENGTH && (!pollOpen || validPollOptions.length >= 2);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    if (imageFiles.length !== files.length) {
      toast({ title: 'Some images were skipped', description: 'Choose image files smaller than 10 MB.' });
    }
    setMedia((existing) => [...existing, ...imageFiles.map((file) => URL.createObjectURL(file))].slice(0, 4));
  };

  const removeMedia = (url: string) => {
    URL.revokeObjectURL(url);
    setMedia((existing) => existing.filter((item) => item !== url));
  };

  const publish = () => {
    if (!canPublish) return;
    const poll = pollOpen ? {
      question: content.trim(),
      options: validPollOptions.map((text, index) => ({ id: `option_${Date.now()}_${index}`, text, votes: 0 })),
      totalVotes: 0,
    } : undefined;
    addPost(content.trim(), media.length ? media : undefined, poll);
    setMedia([]);
    setContent('');
    setPollOpen(false);
    setPollOptions(['', '']);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 800);
    
    toast({ title: 'Your thought is live', description: 'It is now part of your community’s pulse.' });
  };

  const isNearingLimit = content.length > MAX_POST_LENGTH * 0.8;
  const isOverLimit = content.length > MAX_POST_LENGTH;

  return (
    <div className="border-b border-border/40 pb-4 pt-5 px-5 sm:px-6">
      <div className="flex gap-4">
        <Avatar className="h-10 w-10 shrink-0 ring-1 ring-primary/20">
          <AvatarImage src={currentUser.avatarUrl} />
          <AvatarFallback>{currentUser.displayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            id="post-composer"
            aria-label="Write a post"
            placeholder={pollOpen ? 'Ask your community a great question…' : 'What resonates with you?'}
            value={content}
            onChange={handleInput}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                publish();
              }
            }}
            className="min-h-[56px] w-full resize-none bg-transparent text-[17px] leading-relaxed outline-none placeholder:text-muted-foreground/70 py-1.5"
            rows={1}
          />

          {media.length > 0 && (
            <div className={cn('mb-3 mt-2 grid gap-2 overflow-hidden rounded-xl', media.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
              {media.map((url) => (
                <div key={url} className="group relative overflow-hidden rounded-xl border border-border/40 bg-muted">
                  <img src={url} alt="Selected upload" className="max-h-72 w-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => removeMedia(url)} 
                    className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pollOpen && (
            <div className="mb-3 mt-2 rounded-2xl border border-border/40 bg-surface-2/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">Poll options</p>
                <button type="button" onClick={() => setPollOpen(false)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Remove poll</button>
              </div>
              <div className="space-y-2.5">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input 
                      value={option} 
                      onChange={(event) => setPollOptions((options) => options.map((value, optionIndex) => optionIndex === index ? event.target.value : value))} 
                      placeholder={`Option ${index + 1}`} 
                      className="h-10 rounded-xl bg-surface-1" 
                    />
                    {pollOptions.length > 2 && (
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-muted-foreground" onClick={() => setPollOptions((options) => options.filter((_, optionIndex) => optionIndex !== index))} aria-label={`Remove option ${index + 1}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 4 && (
                <button type="button" className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline" onClick={() => setPollOptions((options) => [...options, ''])}>
                  <Plus className="h-4 w-4" /> Add option
                </button>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-primary">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary hover:bg-primary/10 hover:text-primary" onClick={() => fileInputRef.current?.click()} aria-label="Add an image">
                <ImagePlus className="h-[18px] w-[18px]" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={cn('h-9 w-9 rounded-full text-primary hover:bg-primary/10 hover:text-primary', pollOpen && 'bg-primary/10')} onClick={() => setPollOpen((open) => !open)} aria-label="Add a poll">
                <BarChart2 className="h-[18px] w-[18px]" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary hover:bg-primary/10 hover:text-primary" aria-label="Add an emoji">
                    <Smile className="h-[18px] w-[18px]" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto rounded-2xl p-2">
                  <div className="flex gap-1">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button type="button" key={emoji} onClick={() => { setContent((value) => `${value}${emoji}`); if(textareaRef.current) handleInput({target: {value: content + emoji}} as any); }} className="grid h-9 w-9 place-items-center rounded-lg text-lg transition-colors hover:bg-muted" aria-label={`Add ${emoji}`}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-3.5">
              {isNearingLimit && (
                <span className={cn('text-sm font-medium transition-colors', isOverLimit ? 'text-destructive' : 'text-primary')}>
                  {content.length}/{MAX_POST_LENGTH}
                </span>
              )}
              <Button 
                type="button" 
                className={cn("h-9 rounded-full px-5 font-semibold transition-all duration-300", isSuccess && "shadow-[0_0_15px_rgba(var(--primary),0.6)] bg-primary scale-105")} 
                disabled={!canPublish || isOverLimit} 
                onClick={publish}
              >
                Share
              </Button>
            </div>
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
  const toggleSavePost = useAppStore((state) => state.toggleSavePost);
  const sharePost = useAppStore((state) => state.sharePost);
  const [, setLocation] = useLocation();
  const author = users[post.authorId];
  const handleOpen = useCallback(() => setLocation(`/post/${post.id}`), [post.id, setLocation]);

  if (!author) return null;

  const copyPostLink = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try { await navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`); } catch { /* Ignore */ }
    sharePost(post.id);
    toast({ title: 'Link copied', description: 'Share the conversation anywhere.' });
  };

  const getTextSizeClass = (length: number) => {
    if (length < 100) return 'text-lg';
    if (length < 200) return 'text-base';
    return 'text-sm';
  };

  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);

  const handleMediaDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playPop();
    if (!post.likedByMe) {
      likePost(post.id);
    }
    setShowDoubleTapHeart(true);
    setTimeout(() => setShowDoubleTapHeart(false), 800);
  };

  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;
    const len = post.media.length;
    
    return (
      <div className={cn("mt-3 grid gap-[3px] overflow-hidden rounded-2xl border border-border/20 relative shadow-sm hover:shadow-md transition-shadow duration-300", len === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
        {/* Instagram Double Tap Heart Pop Effect */}
        <AnimatePresence>
          {showDoubleTapHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.8)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {post.media.map((url, index) => (
          <div 
            key={index} 
            onDoubleClick={handleMediaDoubleClick}
            className={cn("relative overflow-hidden bg-muted group/media select-none", len === 3 && index === 0 && 'col-span-2')}
          >
            <img 
              src={url} 
              alt={`${author.displayName}'s post`} 
              className={cn(
                "w-full object-cover transition-transform duration-700 group-hover/media:scale-[1.02] aspect-auto",
                len === 1 ? 'max-h-[480px]' : 'max-h-[320px]',
                len === 3 && index === 0 ? 'max-h-[280px]' : ''
              )} 
              loading="lazy" 
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <TiltCard className="w-full block">
      <motion.article 
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="group cursor-pointer border-b border-border/20 px-5 py-5 transition-all hover:bg-muted/20 card-shine sm:px-6"
        onClick={handleOpen}
      >
      <div className="flex gap-3.5">
        <MiniProfileCard user={author}>
          <Link href={`/profile/${author.id}`} onClick={(event) => event.stopPropagation()} aria-label={`View ${author.displayName}'s profile`}>
            <div className="relative">
              <Avatar className="h-11 w-11 ring-2 ring-primary/10 transition-all duration-300 hover:ring-primary/30 shadow-sm">
                <AvatarImage src={author.avatarUrl} />
                <AvatarFallback className="font-display font-bold">{author.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </Link>
        </MiniProfileCard>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              <MiniProfileCard user={author}>
                <Link href={`/profile/${author.id}`} onClick={(event) => event.stopPropagation()} className="truncate font-bold text-[0.88rem] tracking-tight hover:underline">
                  {author.displayName}
                </Link>
              </MiniProfileCard>
              {author.verified && (
                <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
              )}
              <span className="truncate text-[0.78rem] text-muted-foreground font-mono ml-0.5">@{author.username}</span>
              <span className="shrink-0 text-[0.78rem] text-muted-foreground">&middot;</span>
              <span className="shrink-0 text-[0.72rem] text-muted-foreground font-mono hover:underline">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })}
              </span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 text-muted-foreground hover:text-foreground" onClick={(event) => event.stopPropagation()} aria-label="More post options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={copyPostLink}>Copy link</DropdownMenuItem>
                <DropdownMenuItem>Report</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive">Block user</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <p className={cn("mt-2 whitespace-pre-wrap leading-[1.65] text-foreground font-serif", getTextSizeClass(post.content.length))}>
            {post.content}
          </p>

          {(post.content.toLowerCase().includes('sound') || post.content.toLowerCase().includes('audio') || post.id === 'post-3') && (
            <AudioWaveformPlayer />
          )}
          
          {renderMedia()}
          
          {post.poll && (
            <div className="mt-4 rounded-2xl border border-border/30 bg-card/50 p-5" onClick={(event) => event.stopPropagation()}>
              <h4 className="mb-3.5 font-display font-bold text-[0.95rem]">{post.poll.question}</h4>
              <div className="space-y-2">
                {post.poll.options.map((option) => { 
                  const percentage = post.poll!.totalVotes > 0 ? Math.round((option.votes / post.poll!.totalVotes) * 100) : 0; 
                  const isVoted = post.poll!.votedOptionId === option.id; 
                  return (
                    <button 
                      type="button" 
                      key={option.id} 
                      className={cn(
                        'relative flex h-10 w-full items-center overflow-hidden rounded-xl border transition-colors', 
                        post.poll!.votedOptionId ? 'border-transparent' : 'border-border/60 hover:bg-surface-2', 
                        isVoted && 'font-medium'
                      )} 
                      onClick={() => !post.poll!.votedOptionId && votePoll(post.id, option.id)}
                    >
                      {post.poll!.votedOptionId && (
                        <motion.span 
                          initial={{ width: 0 }} 
                          animate={{ width: `${percentage}%` }} 
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          className={cn('absolute inset-y-0 left-0 rounded-xl', isVoted ? 'bg-primary/20' : 'bg-muted-foreground/10')} 
                        />
                      )}
                      <span className="relative z-10 flex w-full justify-between px-3 text-sm">
                        <span>{option.text}</span>
                        {post.poll!.votedOptionId && <span>{percentage}%</span>}
                      </span>
                    </button>
                  ); 
                })}
              </div>
              <div className="mt-3 flex items-center gap-2 text-[0.72rem] text-muted-foreground font-mono">
                <span>{post.poll.totalVotes.toLocaleString()} votes</span>
                <span>&middot;</span>
                <span>Final results</span>
              </div>
            </div>
          )}
          
          <TooltipProvider delayDuration={400}>
            <div className="mt-4 flex max-w-md items-center justify-between text-muted-foreground pr-4 -ml-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button 
                    {...tapScale}
                    aria-label={post.likedByMe ? 'Remove wave' : 'Wave'}
                    className="group relative flex items-center gap-1.5 focus-visible:outline-none"
                    onClick={(event) => { event.stopPropagation(); sounds.playPop(); likePost(post.id); }}
                  >
                    <div className="relative p-1.5 -ml-1.5 rounded-full group-hover:bg-primary/10 transition-colors">
                      <Heart className={cn('h-[18px] w-[18px] transition-colors', post.likedByMe ? 'fill-primary text-primary' : 'group-hover:text-foreground')} />
                      <AnimatePresence>
                        {post.likedByMe && (
                          <motion.div
                            initial={{ scale: 0.5, opacity: 1 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={springBouncy}
                            className="absolute inset-0 rounded-full bg-primary pointer-events-none"
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <span className="text-xs font-medium group-hover:text-foreground transition-colors">{post.likes > 0 && post.likes}</span>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>Wave</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button 
                    {...tapScale}
                    aria-label="Reply to post"
                    className="group flex items-center gap-1.5 focus-visible:outline-none"
                    onClick={(event) => { event.stopPropagation(); setLocation(`/post/${post.id}`); }}
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-surface-2 transition-colors">
                      <MessageCircle className="h-[18px] w-[18px] transition-colors group-hover:text-foreground" />
                    </div>
                    <span className="text-xs font-medium group-hover:text-foreground transition-colors">{post.comments > 0 && post.comments}</span>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>Reply</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <motion.button 
                        {...tapScale}
                        aria-label="Echo post"
                        className="group flex items-center gap-1.5 focus-visible:outline-none"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="p-1.5 rounded-full group-hover:bg-surface-2 transition-colors">
                          <Repeat2 className="h-[18px] w-[18px] transition-colors group-hover:text-foreground" />
                        </div>
                        <span className="text-xs font-medium group-hover:text-foreground transition-colors">{post.shares > 0 && post.shares}</span>
                      </motion.button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Echo</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="rounded-xl">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); sharePost(post.id); toast({ title: 'Echoed to feed' }); }}>
                    Echo to feed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyPostLink}>
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                    Share via...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button 
                    {...tapScale}
                    aria-label={post.savedByMe ? 'Remove spark' : 'Spark'}
                    className="group flex items-center gap-1.5 focus-visible:outline-none"
                    onClick={(event) => { event.stopPropagation(); toggleSavePost(post.id); toast({ title: post.savedByMe ? 'Removed from sparks' : 'Sparked for later' }); }}
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-amber-500/10 transition-colors">
                      <Bookmark className={cn('h-[18px] w-[18px] transition-colors', post.savedByMe ? 'fill-accent text-accent' : 'group-hover:text-foreground')} />
                    </div>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>Spark</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>
    </motion.article>
    </TiltCard>
  );
}

export const PostCardMemo = React.memo(PostCard);
