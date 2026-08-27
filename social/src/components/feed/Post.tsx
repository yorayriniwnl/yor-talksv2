import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Bookmark, Globe2, Heart, ImagePlus, LockKeyhole, MessageCircle, MoreHorizontal, Repeat2, SendHorizonal, Smile, UsersRound, X, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link, useLocation } from 'wouter';
import { useAppStore, Post as PostType } from '@/lib/store';
import { api } from '@/lib/api-client';
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
import { CinematicMediaLightbox } from '@/components/feed/CinematicMediaLightbox';
import { sounds } from '@/lib/sound';
import { RippleEffect } from '@/components/ui/RippleEffect';
import { useHeartBurst, HeartBurstLayer } from '@/components/ui/HeartBurst';
import { RichCommentComposer, type RichCommentData } from '@/components/comments/RichCommentComposer';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, contentRatingLabel, type ContentRating } from '@/lib/content-rating';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { type ContentCategory } from '@/lib/content-category';
import { ContentCategoryBadge } from '@/components/content/ContentCategoryBadge';

const MAX_POST_LENGTH = 500;
const QUICK_EMOJIS = ['✨', '💡', '👏', '🔥', '💬', '❤️'];

interface CreatePostProps {
  onPublished?: () => void;
  compact?: boolean;
}

export function CreatePost({ onPublished, compact = false }: CreatePostProps = {}) {
  const currentUser = useAppStore((state) => state.currentUser);
  const closeFriends = useAppStore((state) => state.closeFriends);
  const addPost = useAppStore((state) => state.addPost);
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [contentRating, setContentRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
  const [contentCategory, setContentCategory] = useState<ContentCategory | ''>('');
  const [audience, setAudience] = useState<'followers' | 'close_friends' | 'public'>('public');
  const [isExpanded, setIsExpanded] = useState(!compact);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mediaRef = useRef<string[]>([]);
  const draftStorageKey = `yor-composer-draft:${currentUser?.id ?? 'anonymous'}`;
  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    return () => {
      mediaRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(draftStorageKey);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft) as { content?: string; pollOpen?: boolean; pollOptions?: string[]; contentCategory?: ContentCategory | ''; contentRating?: ContentRating; audience?: 'followers' | 'close_friends' | 'public' };
        if (draft.content || draft.pollOpen || draft.contentCategory || draft.audience) {
          setContent(typeof draft.content === 'string' ? draft.content : '');
          setPollOpen(Boolean(draft.pollOpen));
          setPollOptions(Array.isArray(draft.pollOptions) && draft.pollOptions.length >= 2 ? draft.pollOptions.slice(0, 4) : ['', '']);
          setContentCategory(draft.contentCategory ?? '');
          setContentRating(draft.contentRating ?? DEFAULT_CONTENT_RATING);
          setAudience(draft.audience ?? 'public');
          setDraftSaved(true);
        }
      }
    } catch {
      // Local draft restoration is best-effort in restricted browser contexts.
    } finally {
      setDraftReady(true);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (!draftReady) return;
    const hasDraft = Boolean(content.trim() || pollOpen || contentCategory || media.length || audience !== 'public');
    try {
      if (hasDraft) {
        window.localStorage.setItem(draftStorageKey, JSON.stringify({
          content,
          pollOpen,
          pollOptions,
          contentCategory,
          contentRating,
          audience,
          savedAt: new Date().toISOString(),
        }));
        setDraftSaved(true);
      } else {
        window.localStorage.removeItem(draftStorageKey);
        setDraftSaved(false);
      }
    } catch {
      // Draft persistence is an enhancement; posting must work without storage.
    }
  }, [audience, content, contentCategory, contentRating, draftReady, draftStorageKey, media.length, pollOpen, pollOptions]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  if (!currentUser) return null;

  const validPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean);
  const canPublish = Boolean(content.trim()) && Boolean(contentCategory) && content.length <= MAX_POST_LENGTH && (!pollOpen || validPollOptions.length >= 2) && !(audience === 'close_friends' && closeFriends.length === 0);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024);
    if (imageFiles.length !== files.length) {
      toast({ title: 'Some images were skipped', description: 'Choose image files smaller than 10 MB.' });
    }
    const availableSlots = Math.max(0, 4 - media.length);
    const selectedFiles = imageFiles.slice(0, availableSlots);
    if (selectedFiles.length < imageFiles.length) {
      toast({ title: 'You can add up to four images', description: 'Remove an image to choose another.' });
    }
    setMedia((existing) => [...existing, ...selectedFiles.map((file) => URL.createObjectURL(file))]);
    setMediaFiles((existing) => [...existing, ...selectedFiles]);
  };

  const removeMedia = (url: string) => {
    const index = media.indexOf(url);
    if (index < 0) return;
    URL.revokeObjectURL(url);
    setMedia((existing) => existing.filter((item) => item !== url));
    setMediaFiles((files) => files.filter((_, fileIndex) => fileIndex !== index));
  };

  const publish = async () => {
    if (!canPublish) return;
    setIsUploading(true);
    const poll = pollOpen ? {
      question: content.trim(),
      options: validPollOptions.map((text, index) => ({ id: `option_${Date.now()}_${index}`, text, votes: 0 })),
      totalVotes: 0,
    } : undefined;
    try {
      const uploadedMedia = mediaFiles.length
        ? (await Promise.all(mediaFiles.map((file) => api.uploadPostImage(file)))).map(({ url }) => url)
        : undefined;
      await addPost(content.trim(), uploadedMedia, poll, contentRating, contentCategory as ContentCategory, audience);
    } catch (error) {
      toast({ title: 'Could not publish your thought', description: error instanceof Error ? error.message : 'Try again in a moment.' });
      setIsUploading(false);
      return;
    }
    media.forEach((url) => URL.revokeObjectURL(url));
    setMedia([]);
    setMediaFiles([]);
    setContent('');
    setPollOpen(false);
    setPollOptions(['', '']);
    setContentCategory('');
    setContentRating(DEFAULT_CONTENT_RATING);
    setAudience('public');
    if (compact) setIsExpanded(false);
    try { window.localStorage.removeItem(draftStorageKey); } catch { /* Ignore storage failures. */ }
    setDraftSaved(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 800);
    setIsUploading(false);
    onPublished?.();
    
    toast({ title: 'Your thought is live', description: 'It is now part of your community’s pulse.' });
  };

  const isNearingLimit = content.length > MAX_POST_LENGTH * 0.8;
  const isOverLimit = content.length > MAX_POST_LENGTH;

  const currentDisplayName = currentUser.displayName || currentUser.username || 'User';

  return (
    <div className="yor-composer border-b border-border/40 pb-4 pt-5 px-5 sm:px-6" data-compact={compact ? 'true' : undefined} data-expanded={isExpanded ? 'true' : 'false'}>
      <div className="flex gap-4">
        <Avatar className="h-10 w-10 shrink-0 ring-1 ring-primary/20">
          <AvatarImage src={currentUser.avatarUrl} />
          <AvatarFallback>{currentDisplayName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            id="post-composer"
            aria-label="Write a post"
            placeholder={pollOpen ? 'Ask a question…' : "What's on your mind?"}
            value={content}
            onChange={handleInput}
            onFocus={() => setIsExpanded(true)}
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

          <div className="yor-composer__publishing-controls">
            <ContentCategorySelect id="post-content-category" value={contentCategory} onChange={setContentCategory} />
            <ContentRatingSelect id="post-content-rating" value={contentRating} onChange={setContentRating} />
            <label htmlFor="post-audience" className="mt-2 block text-xs font-semibold">
              <span className="mb-1.5 flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-primary" /> Audience</span>
              <select id="post-audience" value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)} className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm">
                <option value="public">Public · Everyone can see this</option>
                <option value="followers">Followers · Your followers only</option>
                <option value="close_friends" disabled={closeFriends.length === 0}>Close Friends · {closeFriends.length} people</option>
              </select>
              {audience === 'close_friends' && closeFriends.length === 0 && <span className="mt-1 block text-[0.68rem] font-normal text-muted-foreground">Add people in Settings → Close Friends first.</span>}
            </label>
          </div>

          <div className="yor-composer__footer mt-2 flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-primary">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ''; }} />
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-primary hover:bg-primary/10 hover:text-primary" onClick={() => { setIsExpanded(true); fileInputRef.current?.click(); }} aria-label="Add an image">
                <ImagePlus className="h-[18px] w-[18px]" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className={cn('h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary', pollOpen ? 'text-primary' : 'text-muted-foreground')} onClick={() => { setIsExpanded(true); setPollOpen((open) => !open); }} title={pollOpen ? 'Remove poll' : 'Add a poll'} aria-label={pollOpen ? 'Remove poll' : 'Add a poll'}>
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
              {draftSaved && !isUploading && <span className="yor-composer__draft-status">Draft saved</span>}
              <Button 
                type="button" 
                className={cn("h-9 rounded-full px-5 font-semibold transition-all duration-300", isSuccess && "shadow-[0_0_15px_rgba(var(--primary),0.6)] bg-primary scale-105")} 
                disabled={!canPublish || isOverLimit || isUploading}
                onClick={publish}
              >
                {isUploading ? 'Posting…' : 'Post'}
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
  const currentUser = useAppStore((state) => state.currentUser);
  const likePost = useAppStore((state) => state.likePost);
  const votePoll = useAppStore((state) => state.votePoll);
  const toggleSavePost = useAppStore((state) => state.toggleSavePost);
  const sharePost = useAppStore((state) => state.sharePost);
  const syncPostFromBackend = useAppStore((state) => state.syncPostFromBackend);
  const toggleRepost = useAppStore((state) => state.toggleRepost);
  const toggleBlockUser = useAppStore((state) => state.toggleBlockUser);
  const [, setLocation] = useLocation();
  const { particles, burst: heartBurst } = useHeartBurst();
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const author = users[post.authorId];
  const handleOpen = useCallback(() => setLocation(`/post/${post.id}`), [post.id, setLocation]);

  if (!author) return null;

  const copyPostLink = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try { await navigator.clipboard?.writeText(`${window.location.origin}/post/${post.id}`); } catch { /* Ignore */ }
    sharePost(post.id);
    toast({ title: 'Link copied', description: 'Share the conversation anywhere.' });
  };

  const reportPost = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await api.submitReport({ entityType: 'post', entityId: post.id, reason: 'other', details: 'Reported from the post action menu.' });
      toast({ title: 'Report submitted', description: 'Thanks — the trust queue will review this post.' });
    } catch (error) {
      toast({ title: 'Could not submit report', description: error instanceof Error ? error.message : 'Try again in a moment.' });
    }
  };

  const blockAuthor = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await toggleBlockUser(author.id);
    toast({ title: 'User blocked', description: 'You will no longer see this user’s content.' });
  };

  const handleInlineComment = async (data: RichCommentData) => {
    const media = data.voiceNoteUrl
      ? { mediaUrl: data.voiceNoteUrl, mediaType: 'audio' as const, mediaDuration: data.voiceDuration }
      : data.gifUrl
        ? { mediaUrl: data.gifUrl, mediaType: 'gif' as const }
        : data.imageUrl
          ? { mediaUrl: data.imageUrl, mediaType: 'image' as const }
          : {};
    const result = await api.commentOnPost(post.id, { content: data.text.trim(), ...media });
    syncPostFromBackend(result.post);
    setShowCommentInput(false);
    toast({ title: 'Comment published', description: 'Your reply is now part of the conversation.' });
  };

  const getTextSizeClass = (length: number) => {
    if (length < 100) return 'text-lg';
    if (length < 200) return 'text-base';
    return 'text-sm';
  };

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);

  const handleDoubleTap = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!post.likedByMe) {
      likePost(post.id);
    }
    setShowHeartOverlay(true);
    setTimeout(() => setShowHeartOverlay(false), 900);
  };

  const openMediaViewer = (event: React.MouseEvent, index: number) => {
    event.stopPropagation();
    setActiveMediaIndex(index);
    setMediaViewerOpen(true);
  };

  const renderMedia = () => {
    if (!post.media || post.media.length === 0) return null;
    const len = post.media.length;
    
    const authorDisplayName = author.displayName || author.username || 'User';

    // Single image: keep current behavior
    if (len === 1) {
      return (
        <div 
          className="yor-post-media mt-3 overflow-hidden rounded-2xl border border-border/20 relative shadow-sm hover:shadow-md transition-shadow duration-300 image-hover-zoom"
          onDoubleClick={handleDoubleTap}
        >
          {showHeartOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <Heart 
                className="w-20 h-20 text-white fill-white drop-shadow-lg" 
                style={{ animation: 'heart-pop 0.9s ease-out forwards' }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={(event) => openMediaViewer(event, 0)}
            className="relative overflow-hidden bg-muted group/media select-none text-left w-full focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Open image 1 of 1"
          >
            <img 
              src={post.media[0]} 
              alt={`${authorDisplayName}'s post`} 
              className="w-full object-cover transition-transform duration-700 group-hover/media:scale-[1.02] max-h-[480px]" 
              loading="lazy" 
            />
          </button>
        </div>
      );
    }
    
    // Multiple images: swipable carousel
    return (
      <div className="yor-post-media mt-3 relative overflow-hidden rounded-2xl border border-border/20 shadow-sm" onDoubleClick={handleDoubleTap}>
        {showHeartOverlay && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <Heart 
              className="w-20 h-20 text-white fill-white drop-shadow-lg" 
              style={{ animation: 'heart-pop 0.9s ease-out forwards' }}
            />
          </div>
        )}
        <div 
          className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
          onScroll={(e) => {
            const el = e.currentTarget;
            const index = Math.round(el.scrollLeft / el.clientWidth);
            setActiveMediaIndex(index);
          }}
        >
          {post.media.map((url, index) => (
            <button
              type="button"
              key={index}
              onClick={(event) => openMediaViewer(event, index)}
              className="min-w-full snap-center flex-shrink-0 relative bg-muted select-none text-left focus-visible:outline-none"
              aria-label={`Image ${index + 1} of ${len}`}
            >
              <img 
                src={url} 
                alt={`${authorDisplayName}'s post`} 
                className="w-full object-cover max-h-[480px]" 
                loading="lazy" 
              />
            </button>
          ))}
        </div>
        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {post.media.map((_, index) => (
            <span
              key={index}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                index === activeMediaIndex 
                  ? "bg-white w-2 h-2 shadow-sm" 
                  : "bg-white/50"
              )}
            />
          ))}
        </div>
      </div>
    );
  };

  const authorDisplayName = author.displayName || author.username || 'User';

  return (
    <div className="yor-post-shell w-full">
      <style>{`
        @keyframes heart-pop {
          0% { transform: scale(0); opacity: 0; }
          15% { transform: scale(1.2); opacity: 1; }
          30% { transform: scale(0.95); opacity: 1; }
          45% { transform: scale(1.05); opacity: 0.9; }
          80% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>
      {post.media && post.media.length > 0 && (
        <CinematicMediaLightbox
          media={post.media}
          activeIndex={activeMediaIndex}
          onActiveIndexChange={setActiveMediaIndex}
          open={mediaViewerOpen}
          onOpenChange={setMediaViewerOpen}
          authorName={authorDisplayName}
          caption={post.content}
        />
      )}
      <motion.article 
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        tabIndex={0}
        className="yor-post group cursor-pointer px-5 py-5 transition-colors sm:px-6"
        onClick={handleOpen}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpen();
          }
        }}
      >
      <div className="yor-post__body flex gap-3.5">
        <MiniProfileCard user={author}>
          <Link href={`/profile/${author.id}`} onClick={(event) => event.stopPropagation()} aria-label={`View ${authorDisplayName}'s profile`}>
            <div className="relative">
              <Avatar className="h-11 w-11 ring-2 ring-primary/10 transition-all duration-300 hover:ring-primary/30 shadow-sm">
                <AvatarImage src={author.avatarUrl} />
                <AvatarFallback className="font-display font-bold">{authorDisplayName.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="yor-post__status-dot" aria-label="Creator online" />
            </div>
          </Link>
        </MiniProfileCard>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              <MiniProfileCard user={author}>
                <Link href={`/profile/${author.id}`} onClick={(event) => event.stopPropagation()} className="truncate font-bold text-[0.88rem] tracking-tight hover:underline">
                  {authorDisplayName}
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
              <span className="shrink-0 rounded-full border border-border/50 px-1.5 py-0.5 text-[0.58rem] font-semibold text-muted-foreground">
                {contentRatingLabel(post.contentRating)}
              </span>
              <ContentCategoryBadge value={post.contentCategory} className="hidden sm:inline-flex" />
              {post.audience !== 'public' && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[0.58rem] font-semibold text-primary" title={post.audience === 'close_friends' ? 'Close Friends post' : 'Followers-only post'}>
                  {post.audience === 'close_friends' ? <UsersRound className="h-3 w-3" /> : <LockKeyhole className="h-3 w-3" />}
                  <span className="hidden sm:inline">{post.audience === 'close_friends' ? 'Close Friends' : 'Followers'}</span>
                </span>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 text-muted-foreground hover:text-foreground" onClick={(event) => event.stopPropagation()} aria-label="More post options">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={copyPostLink}>Copy link</DropdownMenuItem>
                <DropdownMenuItem onClick={reportPost}>Report</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={blockAuthor}>Block user</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {renderMedia()}

          <p className={cn("yor-post__caption mt-2 whitespace-pre-wrap leading-[1.65] text-foreground", getTextSizeClass(post.content.length))}>
            {post.content}
          </p>
          
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
            <div className="yor-post__actions mt-4 flex max-w-md items-center justify-between text-muted-foreground pr-4 -ml-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button 
                    {...tapScale}
                    aria-label={post.likedByMe ? 'Unlike post' : 'Like post'}
                    className="group relative flex items-center gap-1.5 focus-visible:outline-none"
                    onClick={(event) => { event.stopPropagation(); sounds.playPop(); likePost(post.id); heartBurst(event); }}
                  >
                    <RippleEffect className="rounded-full">
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
                    </RippleEffect>
                    <span className="text-xs font-medium group-hover:text-foreground transition-colors">{post.likes > 0 && post.likes}</span>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>{post.likedByMe ? 'Unlike' : 'Like'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button 
                    {...tapScale}
                    aria-label="Reply to post"
                    className="group flex items-center gap-1.5 focus-visible:outline-none"
                    onClick={(event) => { event.stopPropagation(); setShowCommentInput(prev => !prev); }}
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
                        aria-label="Share post"
                        className="group flex items-center gap-1.5 focus-visible:outline-none"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <RippleEffect className="rounded-full">
                        <div className="p-1.5 rounded-full group-hover:bg-surface-2 transition-colors">
                          <SendHorizonal className="h-[18px] w-[18px] transition-colors group-hover:text-foreground" />
                        </div>
                        </RippleEffect>
                        <span className="text-xs font-medium group-hover:text-foreground transition-colors">{post.shares > 0 && post.shares}</span>
                      </motion.button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Share</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start" className="rounded-xl">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); sharePost(post.id); toast({ title: 'Echoed to feed' }); }}>
                    Repost to feed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyPostLink}>
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    const url = window.location.origin + '/post/' + post.id;
                    if (navigator.share) {
                      navigator.share({ title: 'Check this post on Yor Talks', url }).catch(() => {});
                    } else {
                      navigator.clipboard?.writeText(url);
                      toast({ title: 'Link copied to clipboard!' });
                    }
                  }}>
                    Share via...
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    {...tapScale}
                    aria-label={post.repostedByMe ? 'Remove repost' : 'Repost'}
                    className="group flex items-center gap-1.5 focus-visible:outline-none"
                    onClick={(event) => { event.stopPropagation(); void toggleRepost(post.id); }}
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-emerald-500/10 transition-colors">
                      <Repeat2 className={cn('h-[18px] w-[18px] transition-colors', post.repostedByMe ? 'text-emerald-500' : 'group-hover:text-foreground')} />
                    </div>
                    <span className="text-xs font-medium group-hover:text-foreground transition-colors">{post.reposts > 0 && post.reposts}</span>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>{post.repostedByMe ? 'Remove repost' : 'Repost'}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button 
                    {...tapScale}
                    aria-label={post.savedByMe ? 'Remove from saved' : 'Save post'}
                    className="group flex items-center gap-1.5 focus-visible:outline-none"
                    onClick={(event) => { event.stopPropagation(); toggleSavePost(post.id); toast({ title: post.savedByMe ? 'Removed from saved' : 'Saved for later' }); }}
                  >
                    <div className="p-1.5 rounded-full group-hover:bg-amber-500/10 transition-colors">
                      <Bookmark className={cn('h-[18px] w-[18px] transition-colors', post.savedByMe ? 'fill-accent text-accent' : 'group-hover:text-foreground')} />
                    </div>
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent>{post.savedByMe ? 'Unsave' : 'Save'}</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {post.comments > 0 && (
        <button
          type="button"
          className="px-5 sm:px-6 pb-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => { e.stopPropagation(); setLocation(`/post/${post.id}`); }}
        >
          View all {post.comments} comments
        </button>
      )}

      {/* Inline Rich Comment Composer (Photos, GIFs, Voice Memos, Super Comments) */}
      {showCommentInput && (
        <div className="px-5 pb-4 pt-1 sm:px-6" onClick={(e) => e.stopPropagation()}>
          <RichCommentComposer
            postId={post.id}
            creatorUser={author}
            onCommentSubmit={handleInlineComment}
          />
        </div>
      )}
    </motion.article>
    <HeartBurstLayer particles={particles} />
    </div>
  );
}

export const PostCardMemo = React.memo(PostCard);
