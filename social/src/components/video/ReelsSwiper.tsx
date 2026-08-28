import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Video } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Heart, MessageCircle, Share2, X, Music, Volume2, VolumeX, 
  Bookmark, Copy, Zap, Gauge, Subtitles
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

  const goToIndex = useCallback((nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(videos.length - 1, nextIndex));
    const target = containerRef.current?.children[boundedIndex] as HTMLElement | undefined;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPlayingIndex(boundedIndex);
  }, [videos.length]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  // Keyboard navigation for reels
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToIndex(playingIndex + 1);
        sounds.playSwoosh();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToIndex(playingIndex - 1);
        sounds.playSwoosh();
      } else if (e.key === 'Escape') {
        if (showComments) setShowComments(false);
        else if (showShareModal) setShowShareModal(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videos, onClose, showComments, showShareModal, goToIndex, playingIndex]);

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
      player.playbackRate = playbackSpeed;
      if (index === playingIndex) {
        void player.play().catch(() => {
          // Autoplay can be blocked until the viewer interacts with the page.
        });
      } else {
        player.pause();
        player.currentTime = 0;
      }
    });
  }, [playingIndex, isMuted, playbackSpeed, videos]);

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
        className="operator-reels-viewer"
        role="dialog"
        aria-modal="true"
        aria-label="Video viewer"
      >
        <div className="operator-reels-topbar">
          <div className="operator-reels-topbar__group">
            <button 
              onClick={onClose} 
              className="operator-reels-control"
              aria-label="Close video viewer"
            >
              <X aria-hidden="true" />
            </button>

            <button
              onClick={() => {
                const speeds = [1, 1.5, 2, 0.5];
                const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                setPlaybackSpeed(nextSpeed);
                sounds.playPop();
                toast.success(`Speed: ${nextSpeed}x`);
              }}
              className="operator-reels-control operator-reels-control--text"
              title="Change Speed"
              aria-label={`Playback speed ${playbackSpeed} times`}
            >
              <Gauge aria-hidden="true" /> {playbackSpeed}x
            </button>
          </div>

          <div className="operator-reels-progress" aria-live="polite">
            <strong>{String(playingIndex + 1).padStart(2, '0')}</strong>
            <span>/ {String(videos.length).padStart(2, '0')}</span>
            <small>Use ↑ ↓</small>
          </div>

          <div className="operator-reels-topbar__group">
            <button
              onClick={() => {
                setShowSubtitles(!showSubtitles);
                sounds.playPop();
              }}
              className="operator-reels-control"
              data-active={showSubtitles || undefined}
              title="Toggle caption"
              aria-label={`${showSubtitles ? 'Hide' : 'Show'} caption`}
              aria-pressed={showSubtitles}
            >
              <Subtitles aria-hidden="true" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="operator-reels-control"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="operator-reels-track"
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
                className="operator-reel-slide"
                data-format={video.type}
                aria-hidden={!isPlaying}
                inert={!isPlaying}
              >
                <div className="operator-reel-slide__media">
                  <video
                    src={video.videoUrl}
                    poster={video.thumbnailUrl}
                    className="operator-reel-video"
                    muted={isMuted}
                    loop
                    playsInline
                    preload={isPlaying ? 'auto' : 'metadata'}
                    aria-label={video.title}
                  />
                  <div className="operator-reel-scrim" />
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

                <div className="operator-reel-actions" aria-label="Video actions">
                  <div>
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
                      className="operator-reel-action"
                      data-active={isLiked || undefined}
                      aria-label={isLiked ? 'Unlike video' : 'Like video'}
                      aria-pressed={isLiked}
                    >
                      <Heart className={cn(isLiked && 'fill-current')} aria-hidden="true" />
                    </button>
                    <span>{displayedLikes.toLocaleString()}</span>
                  </div>

                  <div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playPop();
                        setShowComments(true);
                      }}
                      className="operator-reel-action"
                      aria-label="Open comments"
                    >
                      <MessageCircle aria-hidden="true" />
                    </button>
                    <span>{comments.length}</span>
                  </div>

                  <div>
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
                      className="operator-reel-action"
                      data-active={isSaved || undefined}
                      aria-label={isSaved ? 'Remove saved video' : 'Save video'}
                      aria-pressed={isSaved}
                    >
                      <Bookmark className={cn(isSaved && 'fill-current')} aria-hidden="true" />
                    </button>
                    <span>Save</span>
                  </div>

                  <div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        sounds.playPop();
                        setShowShareModal(true);
                      }}
                      className="operator-reel-action"
                      aria-label="Share video"
                    >
                      <Share2 aria-hidden="true" />
                    </button>
                    <span>Share</span>
                  </div>
                </div>

                <div className="operator-reel-info">
                  <div className="operator-reel-creator">
                    <Avatar>
                      <AvatarImage src={author?.avatarUrl} />
                      <AvatarFallback>{author?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <span><strong>{author?.displayName || 'Creator'}</strong><small>@{author?.username || 'creator'}</small></span>
                    {author && author.id !== currentUser?.id && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setFollowedAuthors((prev) => ({ ...prev, [author.id]: !isFollowing }));
                          void (isFollowing ? unfollowUser(author.id) : followUser(author.id));
                        }}
                        data-following={isFollowing || undefined}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>

                  {showSubtitles && <p className="operator-reel-caption">{video.title}</p>}

                  <div className="operator-reel-info__tools">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        sounds.playPop();
                        setActiveRemixAudio({ title: video.title, artist: author?.displayName || 'Soundtrack' });
                        setStudioOpen(true);
                      }}
                    >
                      <Music aria-hidden="true" />
                      <span>Use this sound</span>
                    </button>
                    {author && (
                      <button
                        type="button"
                        data-tone="tip"
                        onClick={(event) => {
                          event.stopPropagation();
                          sounds.playPop();
                          setTippingCreator({
                            id: author.id,
                            displayName: author.displayName,
                            username: author.username,
                            avatarUrl: author.avatarUrl,
                          });
                        }}
                      >
                        <Zap aria-hidden="true" />
                        <span>Tip creator</span>
                      </button>
                    )}
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
              className="operator-reels-comments"
            >
              <div className="operator-reels-comments__head">
                <span><small>Conversation</small><h4>Comments ({comments.length})</h4></span>
                <button onClick={() => setShowComments(false)} aria-label="Close comments">
                  <X aria-hidden="true" />
                </button>
              </div>

              <div className="operator-reels-comments__list">
                <RichCommentList comments={comments} onLikeComment={handleLikeComment} />
              </div>

              <div className="operator-reels-comments__composer">
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
              className="operator-reels-share-backdrop"
            >
              <div className="operator-reels-share">
                <div className="operator-reels-share__icon">
                  <Share2 aria-hidden="true" />
                </div>
                <h3>Share video</h3>
                <p>Copy a direct link to this item in the watch queue.</p>

                <div className="operator-reels-share__actions">
                  <Button
                    onClick={handleCopyShareLink}
                  >
                    <Copy aria-hidden="true" /> Copy link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowShareModal(false)}
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
