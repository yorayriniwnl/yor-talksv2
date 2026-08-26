import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Video } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Heart, MessageCircle, Share2, X, Music, Volume2, VolumeX, 
  Send, Bookmark, Sparkles, Copy, Check, QrCode, Zap, 
  Gauge, Subtitles, Wand2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { UpiTipJarModal } from '@/components/monetization/UpiTipJarModal';
import { StudioCameraModal } from '@/components/studio/StudioCameraModal';
import { RichCommentComposer, RichCommentData } from '@/components/comments/RichCommentComposer';
import { RichCommentList, CommentItem } from '@/components/comments/RichCommentList';
import { toast } from 'sonner';
import { api, type BackendComment } from '@/lib/api-client';

interface ReelsSwiperProps {
  videos: Video[];
  initialIndex: number;
  onClose: () => void;
}

function mapVideoComment(comment: BackendComment): CommentItem {
  return {
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
    createdAt: comment.createdAt,
  };
}

export default function ReelsSwiper({ videos, initialIndex, onClose }: ReelsSwiperProps) {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const likeVideo = useAppStore((s) => s.likeVideo);
  const toggleVideoBookmark = useAppStore((s) => s.toggleVideoBookmark);
  const followUser = useAppStore((s) => s.followUser);
  const unfollowUser = useAppStore((s) => s.unfollowUser);

  const containerRef = useRef<HTMLDivElement>(null);
  const [playingIndex, setPlayingIndex] = useState(initialIndex);
  const [isMuted, setIsMuted] = useState(false);
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [savedVideos, setSavedVideos] = useState<Record<string, boolean>>({});
  const [followedAuthors, setFollowedAuthors] = useState<Record<string, boolean>>({});
  
  // Double-tap heart burst effect
  const [heartBurst, setHeartBurst] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);

  // Comments drawer & share modal
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);

  // Pro Playback & Studio Controls
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [studioOpen, setStudioOpen] = useState<boolean>(false);
  const [activeRemixAudio, setActiveRemixAudio] = useState<{ title: string; artist: string } | undefined>(undefined);
  const [tippingCreator, setTippingCreator] = useState<{ id: string; displayName: string; username: string; avatarUrl?: string } | null>(null);

  // Keyboard navigation for reels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPlayingIndex((prev) => Math.min(videos.length - 1, prev + 1));
        sounds.playSwoosh();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPlayingIndex((prev) => Math.max(0, prev - 1));
        sounds.playSwoosh();
      } else if (e.key === 'Escape') {
        if (showComments) setShowComments(false);
        else if (showShareModal) setShowShareModal(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videos, onClose, showComments, showShareModal]);

  useEffect(() => {
    if (containerRef.current) {
      const el = containerRef.current.children[initialIndex] as HTMLElement;
      if (el) el.scrollIntoView();
    }
  }, [initialIndex]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            setPlayingIndex(index);
          }
        });
      },
      { threshold: 0.6 }
    );

    const children = containerRef.current?.children;
    if (children) {
      Array.from(children).forEach((child) => observer.observe(child));
    }

    return () => observer.disconnect();
  }, [videos]);

  useEffect(() => {
    const video = videos[playingIndex];
    if (!video) {
      setComments([]);
      return;
    }
    let active = true;
    void api.getVideoComments(video.id).then((items) => {
      if (active) setComments(items.map(mapVideoComment));
    }).catch(() => {
      if (active) setComments([]);
    });
    return () => { active = false; };
  }, [playingIndex, videos]);

  useEffect(() => {
    const players = containerRef.current?.querySelectorAll('video');
    if (!players) return;
    players.forEach((player, index) => {
      player.muted = isMuted;
      if (index === playingIndex) {
        void player.play().catch(() => {
          // Autoplay can be blocked until the viewer interacts with the page.
        });
      } else {
        player.pause();
        player.currentTime = 0;
      }
    });
  }, [playingIndex, isMuted, videos]);

  const handleDoubleTap = (e: React.MouseEvent, videoId: string) => {
    const now = Date.now();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (now - lastTapRef.current < 350) {
      // Double tap recognized!
      sounds.playLike();
      const target = videos.find((video) => video.id === videoId);
      const alreadyLiked = likedVideos[videoId] ?? target?.likedByMe ?? false;
      if (!alreadyLiked) {
        setLikedVideos((prev) => ({ ...prev, [videoId]: true }));
        void likeVideo(videoId).then((success) => {
          if (!success) setLikedVideos((prev) => ({ ...prev, [videoId]: alreadyLiked }));
        });
      }

      setHeartBurst({ visible: true, x, y });
      setTimeout(() => setHeartBurst({ visible: false, x: 0, y: 0 }), 1000);
    }
    lastTapRef.current = now;
  };

  const handleAddRichComment = async (data: RichCommentData) => {
    const video = videos[playingIndex];
    if (!video) return;
    sounds.playPop();
    const media = data.voiceNoteUrl
      ? { mediaUrl: data.voiceNoteUrl, mediaType: 'audio' as const, mediaDuration: data.voiceDuration }
      : data.gifUrl
        ? { mediaUrl: data.gifUrl, mediaType: 'gif' as const }
        : data.imageUrl
          ? { mediaUrl: data.imageUrl, mediaType: 'image' as const }
          : {};
    const result = await api.commentOnVideo(video.id, { content: data.text.trim(), ...media });
    setComments((prev) => [mapVideoComment({ ...result.comment, author: {
      id: currentUser?.id || result.comment.authorId,
      username: currentUser?.username || 'you',
      fullName: currentUser?.displayName || 'You',
      avatarUrl: currentUser?.avatarUrl || null,
    }}), ...prev]);
  };

  const handleLikeComment = async (commentId: string) => {
    const video = videos[playingIndex];
    if (!video) return;
    const updated = await api.likeVideoComment(video.id, commentId);
    const result = { likes: updated.likes ?? 0, likedByMe: updated.likedByMe ?? false };
    setComments((prev) => prev.map((comment) => comment.id === commentId ? { ...comment, ...result } : comment));
    return result;
  };

  const handleCopyShareLink = async () => {
    sounds.playPop();
    try {
      const shareUrl = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Clipboard access is unavailable');
      }
      triggerConfetti();
      toast.success('Reel link copied to clipboard!');
      setShowShareModal(false);
    } catch {
      toast.error('Could not copy the reel link. Please copy it from the address bar.');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-50 bg-black flex justify-center font-sans text-white"
      >
        {/* Top Floating Action Bar */}
        <div className="absolute top-6 left-4 right-4 z-50 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors border border-white/10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Playback Speed Controller */}
            <button
              onClick={() => {
                const speeds = [1, 1.5, 2, 0.5];
                const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                setPlaybackSpeed(nextSpeed);
                sounds.playPop();
                toast.success(`Speed: ${nextSpeed}x`);
              }}
              className="px-3 py-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors border border-white/10 text-xs font-mono font-bold flex items-center gap-1"
              title="Change Speed"
            >
              <Gauge className="w-3.5 h-3.5 text-primary" /> {playbackSpeed}x
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto-Subtitles Toggle */}
            <button
              onClick={() => {
                setShowSubtitles(!showSubtitles);
                sounds.playPop();
              }}
              className={cn(
                "p-3 rounded-full backdrop-blur-md transition-colors border border-white/10",
                showSubtitles ? "bg-primary text-black font-bold" : "bg-black/50 text-white hover:bg-black/80"
              )}
              title="Toggle Captions"
            >
              <Subtitles className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/80 transition-colors border border-white/10"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="w-full h-[100dvh] max-w-[480px] overflow-y-scroll snap-y snap-mandatory hide-scrollbar relative bg-zinc-950"
        >
          {videos.map((video, idx) => {
            const author = users[video.authorId];
            const isPlaying = playingIndex === idx;
            const isLiked = likedVideos[video.id] ?? Boolean(video.likedByMe);
            const isSaved = savedVideos[video.id] ?? Boolean(video.savedByMe);
            const serverLiked = Boolean(video.likedByMe);
            const displayedLikes = Math.max(0, video.likes + (isLiked === serverLiked ? 0 : isLiked ? 1 : -1));
            const isFollowing = followedAuthors[video.authorId] ?? Boolean(currentUser?.followingIds?.includes(video.authorId));

            return (
              <div 
                key={video.id} 
                data-index={idx}
                onClick={(e) => handleDoubleTap(e, video.id)}
                className="w-full h-[100dvh] snap-center snap-always relative flex items-center justify-center bg-black select-none overflow-hidden"
              >
                {/* Video / Visual Asset */}
                <div className="relative w-full h-full">
                  <video
                    src={video.videoUrl}
                    poster={video.thumbnailUrl}
                    className="w-full h-full object-cover opacity-90"
                    muted={isMuted}
                    loop
                    playsInline
                    preload={isPlaying ? 'auto' : 'metadata'}
                    aria-label={video.title}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />
                </div>

                {/* Double Tap Heart Burst Animation */}
                <AnimatePresence>
                  {heartBurst.visible && (
                    <motion.div
                      initial={{ scale: 0, opacity: 1, rotate: -20 }}
                      animate={{ scale: 1.8, opacity: 0.9, rotate: 0 }}
                      exit={{ scale: 2.2, opacity: 0 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      style={{ left: heartBurst.x - 40, top: heartBurst.y - 40 }}
                      className="absolute z-40 text-rose-500 pointer-events-none drop-shadow-2xl"
                    >
                      <Heart className="w-24 h-24 fill-rose-500 text-rose-500" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Right Side Action Bar (Insta / TikTok Style) */}
                <div className="absolute right-4 bottom-24 flex flex-col items-center gap-5 z-20">
                  {/* Like Button */}
                  <div className="flex flex-col items-center gap-1 group">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playLike();
                        const nextLiked = !isLiked;
                        setLikedVideos(prev => ({ ...prev, [video.id]: nextLiked }));
                        void likeVideo(video.id).then((success) => {
                          if (!success) setLikedVideos(prev => ({ ...prev, [video.id]: isLiked }));
                        });
                      }}
                      className={cn(
                        "p-3.5 rounded-full backdrop-blur-md transition-all active:scale-75 shadow-lg border border-white/10",
                        isLiked ? "bg-rose-600 text-white" : "bg-black/50 text-white hover:bg-black/70"
                      )}
                    >
                      <Heart className={cn("w-7 h-7", isLiked && "fill-white")} />
                    </button>
                    <span className="text-white text-xs font-mono font-bold drop-shadow-md">
                      {displayedLikes.toLocaleString()}
                    </span>
                  </div>
                  
                  {/* Direct Instant UPI Creator Tip Button */}
                  <div className="flex flex-col items-center gap-1 group">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playPop();
                        if (author) {
                          setTippingCreator({
                            id: author.id,
                            displayName: author.displayName,
                            username: author.username,
                            avatarUrl: author.avatarUrl,
                          });
                        }
                      }}
                      className="p-3.5 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-full text-black font-bold backdrop-blur-md hover:scale-110 transition-all shadow-lg border border-amber-300/40 glow-neon-primary cursor-pointer"
                      title="Tip Creator via UPI"
                    >
                      <Zap className="w-6 h-6 fill-black" />
                    </button>
                    <span className="text-amber-400 text-[0.68rem] font-mono font-black drop-shadow-md">Tip UPI</span>
                  </div>

                  {/* Comments Button */}
                  <div className="flex flex-col items-center gap-1 group">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playPop();
                        setShowComments(true);
                      }}
                      className="p-3.5 bg-black/50 rounded-full text-white backdrop-blur-md hover:bg-black/70 transition-colors shadow-lg border border-white/10"
                    >
                      <MessageCircle className="w-7 h-7" />
                    </button>
                    <span className="text-white text-xs font-mono font-bold drop-shadow-md">{comments.length}</span>
                  </div>

                  {/* Bookmark Save Button */}
                  <div className="flex flex-col items-center gap-1 group">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playPop();
                        const nextSaved = !isSaved;
                        setSavedVideos(prev => ({ ...prev, [video.id]: nextSaved }));
                        void toggleVideoBookmark(video.id).then((success) => {
                          if (success) toast.success(nextSaved ? 'Saved to Bookmarks Collection' : 'Removed from bookmarks');
                          else setSavedVideos(prev => ({ ...prev, [video.id]: isSaved }));
                        });
                      }}
                      className={cn(
                        "p-3.5 rounded-full backdrop-blur-md transition-all shadow-lg border border-white/10",
                        isSaved ? "bg-primary text-primary-foreground" : "bg-black/50 text-white hover:bg-black/70"
                      )}
                    >
                      <Bookmark className={cn("w-6 h-6", isSaved && "fill-current")} />
                    </button>
                  </div>

                  {/* Share Button */}
                  <div className="flex flex-col items-center gap-1 group">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playPop();
                        setShowShareModal(true);
                      }}
                      className="p-3.5 bg-black/50 rounded-full text-white backdrop-blur-md hover:bg-black/70 transition-colors shadow-lg border border-white/10"
                    >
                      <Share2 className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Spinning Audio Vinyl Disc */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      sounds.playPop();
                      setActiveRemixAudio({ title: video.title, artist: author?.displayName || 'Soundtrack' });
                      setStudioOpen(true);
                    }}
                    className="p-1 rounded-full bg-zinc-900 border border-white/20 animate-[spin_4s_linear_infinite] shadow-xl cursor-pointer hover:scale-110 transition-transform"
                    title="Use this sound"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={author?.avatarUrl} />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                {/* Bottom Creator Info & Sound Banner */}
                <div className="absolute bottom-0 left-0 right-16 p-5 pt-12 z-20">
                  <div className="flex items-center gap-3 mb-2.5">
                    <Avatar className="w-10 h-10 border-2 border-white/30 shadow-md">
                      <AvatarImage src={author?.avatarUrl} />
                      <AvatarFallback>{author?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span className="text-white font-bold text-sm drop-shadow-md">{author?.displayName || 'Creator'}</span>
                    {author && author.id !== currentUser?.id && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setFollowedAuthors((prev) => ({ ...prev, [author.id]: !isFollowing }));
                          void (isFollowing ? unfollowUser(author.id) : followUser(author.id));
                        }}
                        className="px-3 py-1 bg-white text-black rounded-full text-xs font-bold hover:bg-zinc-200 transition-colors shadow-sm"
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>

                  <p className="text-white text-sm line-clamp-2 drop-shadow-md font-medium mb-3 leading-relaxed">
                    {video.title}
                  </p>

                  {/* Remix Sound Banner */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      sounds.playPop();
                      setActiveRemixAudio({ title: video.title, artist: author?.displayName || 'Soundtrack' });
                      setStudioOpen(true);
                    }}
                    className="flex items-center gap-2 text-white/90 text-xs font-mono bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full w-fit border border-white/10 cursor-pointer hover:bg-black/70 transition-colors"
                  >
                    <Music className="w-3.5 h-3.5 animate-pulse text-primary" />
                    <span className="truncate max-w-[170px]">Audio: {video.title}</span>
                    <span className="text-[0.62rem] px-1.5 py-0.5 rounded bg-primary/30 text-primary font-bold ml-1">Use Sound</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Slide-Up Comments Drawer */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute inset-x-0 bottom-0 max-w-[480px] mx-auto h-[60vh] bg-zinc-950 border-t border-border/40 rounded-t-3xl p-5 flex flex-col justify-between z-50 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/40">
                <h4 className="font-display font-bold text-sm text-white">Comments ({comments.length})</h4>
                <button onClick={() => setShowComments(false)} className="p-1 text-zinc-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-3 space-y-3 hide-scrollbar">
                <RichCommentList comments={comments} onLikeComment={handleLikeComment} />
              </div>

              <div className="pt-2 border-t border-border/40">
                <RichCommentComposer
                  postId={videos[playingIndex]?.id || 'reel'}
                  creatorUser={users[videos[playingIndex]?.authorId]}
                  placeholder="Add a comment, photo, GIF or tip..."
                  onCommentSubmit={handleAddRichComment}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Modal */}
        <AnimatePresence>
          {showShareModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div className="w-full max-w-sm bg-zinc-950 border border-border/50 rounded-3xl p-6 shadow-2xl font-sans text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-white mb-1">Share Reel</h3>
                <p className="text-xs text-zinc-400 mb-6">Share this video with friends or social feeds</p>

                <div className="space-y-2.5">
                  <Button
                    onClick={handleCopyShareLink}
                    className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary"
                  >
                    <Copy className="w-4 h-4 mr-1.5" /> Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowShareModal(false)}
                    className="w-full rounded-2xl font-bold text-xs h-11 border-border/60 text-white hover:bg-zinc-900"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upi Tip Jar Modal */}
        {tippingCreator && (
          <UpiTipJarModal
            creator={tippingCreator}
            isOpen={Boolean(tippingCreator)}
            onOpenChange={(open) => {
              if (!open) setTippingCreator(null);
            }}
          />
        )}

        {/* Studio Camera Remix Modal */}
        <StudioCameraModal
          isOpen={studioOpen}
          onOpenChange={setStudioOpen}
          defaultMode="reel"
          initialAudioTrack={activeRemixAudio}
        />
      </motion.div>
    </AnimatePresence>
  );
}
