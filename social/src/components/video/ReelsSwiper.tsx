import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Video } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, X, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

interface ReelsSwiperProps {
  videos: Video[];
  initialIndex: number;
  onClose: () => void;
}

export default function ReelsSwiper({ videos, initialIndex, onClose }: ReelsSwiperProps) {
  const users = useAppStore((s) => s.users);
  const likeVideo = useAppStore((s) => s.likeVideo);

  const containerRef = useRef<HTMLDivElement>(null);
  const [playingIndex, setPlayingIndex] = useState(initialIndex);

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
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videos, onClose]);

  useEffect(() => {
    if (containerRef.current) {
      // Scroll to the initial index immediately
      const el = containerRef.current.children[initialIndex] as HTMLElement;
      if (el) {
        el.scrollIntoView();
      }
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
      { threshold: 0.6 } // Video plays when at least 60% is visible
    );

    const children = containerRef.current?.children;
    if (children) {
      Array.from(children).forEach((child) => observer.observe(child));
    }

    return () => observer.disconnect();
  }, [videos]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-50 bg-black flex justify-center"
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 left-4 z-50 p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div 
          ref={containerRef}
          className="w-full h-[100dvh] max-w-[480px] overflow-y-scroll snap-y snap-mandatory hide-scrollbar relative bg-zinc-900"
        >
          {videos.map((video, idx) => {
            const author = users[video.authorId];
            const isPlaying = playingIndex === idx;

            return (
              <div 
                key={video.id} 
                data-index={idx}
                className="w-full h-[100dvh] snap-center snap-always relative flex items-center justify-center bg-black"
              >
                {/* 
                  Since we don't have real hosted videos in the mock data, 
                  we'll use a video element if it's a real mp4 url, 
                  or fallback to the thumbnail acting as a "video" frame 
                */}
                {video.videoUrl.endsWith('.mp4') ? (
                  <video
                    src={video.videoUrl}
                    className="w-full h-full object-cover"
                    loop
                    playsInline
                    muted={false}
                    ref={(el) => {
                      if (el) {
                        if (isPlaying) {
                          el.play().catch(() => {});
                        } else {
                          el.pause();
                          el.currentTime = 0;
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <img src={video.thumbnailUrl} className="w-full h-full object-cover opacity-80" alt={video.title} />
                    {!isPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        {/* Fake pause state */}
                      </div>
                    )}
                  </div>
                )}

                {/* Right Side Actions */}
                <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
                  <div className="flex flex-col items-center gap-1 group">
                    <button 
                      onClick={() => likeVideo(video.id)}
                      className="p-3 bg-black/40 rounded-full text-white backdrop-blur-md group-hover:bg-primary/20 transition-colors"
                    >
                      <Heart className="w-7 h-7" />
                    </button>
                    <span className="text-white text-xs font-medium drop-shadow-md">{video.likes.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1 group">
                    <button className="p-3 bg-black/40 rounded-full text-white backdrop-blur-md group-hover:bg-white/20 transition-colors">
                      <MessageCircle className="w-7 h-7" />
                    </button>
                    <span className="text-white text-xs font-medium drop-shadow-md">0</span>
                  </div>

                  <div className="flex flex-col items-center gap-1 group">
                    <button className="p-3 bg-black/40 rounded-full text-white backdrop-blur-md group-hover:bg-white/20 transition-colors">
                      <Share2 className="w-7 h-7" />
                    </button>
                    <span className="text-white text-xs font-medium drop-shadow-md">Share</span>
                  </div>
                </div>

                {/* Bottom Info Overlay */}
                <div className="absolute bottom-0 left-0 right-16 p-4 pt-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-10 h-10 border border-white/20">
                      <AvatarImage src={author?.avatarUrl} />
                      <AvatarFallback>{author?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="text-white font-semibold text-sm drop-shadow-md">{author?.displayName}</span>
                    <button className="px-3 py-1 bg-transparent border border-white text-white rounded-full text-xs font-semibold hover:bg-white hover:text-black transition-colors backdrop-blur-sm">
                      Follow
                    </button>
                  </div>
                  <p className="text-white text-sm line-clamp-2 drop-shadow-md font-medium mb-3">
                    {video.title}
                  </p>
                  <div className="flex items-center gap-2 text-white/80 text-xs">
                    <Music className="w-4 h-4 animate-[spin_4s_linear_infinite]" />
                    <span className="truncate">Original Audio - {author?.displayName}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
