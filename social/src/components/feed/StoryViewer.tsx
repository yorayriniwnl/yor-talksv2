import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAppStore, type Story } from '@/lib/store';
import { X, Send, Heart, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface StoryViewerProps {
  initialAuthorId: string;
  groupedStories: Record<string, Story[]>;
  authors: string[];
  onClose: () => void;
}

const STORY_DURATION = 5000;

export default function StoryViewer({ initialAuthorId, groupedStories, authors, onClose }: StoryViewerProps) {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const viewStory = useAppStore((s) => s.viewStory);
  const reactToStory = useAppStore((s) => s.reactToStory);

  const [authorIndex, setAuthorIndex] = useState(authors.indexOf(initialAuthorId));
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const [reactionText, setReactionText] = useState('');

  const currentAuthorId = authors[authorIndex];
  const currentStories = groupedStories[currentAuthorId] || [];
  const currentStory = currentStories[storyIndex];

  // Auto-advance logic
  useEffect(() => {
    if (isPaused || !currentStory) return;

    const interval = 50;
    const step = (interval / STORY_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((p) => {
        if (p + step >= 100) {
          handleNext();
          return 0;
        }
        return p + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [authorIndex, storyIndex, isPaused, currentStory]);

  // Mark as viewed
  useEffect(() => {
    if (currentStory && !currentStory.viewed && currentUser) {
      viewStory(currentStory.id).catch(console.error);
    }
  }, [currentStory, currentUser, viewStory]);

  const handleNext = () => {
    setProgress(0);
    if (storyIndex < currentStories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (authorIndex < authors.length - 1) {
      setAuthorIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (authorIndex > 0) {
      const prevAuthorId = authors[authorIndex - 1];
      setAuthorIndex(authorIndex - 1);
      setStoryIndex(groupedStories[prevAuthorId].length - 1);
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    // Don't trigger if clicking the bottom input bar
    if ((e.target as HTMLElement).closest('.story-controls')) return;

    const x = e.clientX;
    const width = window.innerWidth;
    if (x < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleSendReaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactionText.trim() || !currentStory) return;
    try {
      await reactToStory(currentStory.id, reactionText);
      setReactionText('');
    } catch (err) {
      // toast will handle error
    }
  };

  if (!currentStory) return null;

  const author = users[currentAuthorId];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 bg-black flex flex-col sm:p-4 md:p-8 items-center justify-center"
      >
        <div 
          className="relative w-full h-full sm:max-w-[400px] sm:h-[800px] sm:rounded-3xl overflow-hidden bg-zinc-900 flex flex-col shadow-2xl"
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        >
          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-3 pt-4">
            {currentStories.map((s, idx) => (
              <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-md">
                <div 
                  className="h-full bg-white transition-all ease-linear"
                  style={{
                    width: idx < storyIndex ? '100%' : idx === storyIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header Info */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 pt-8">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-white/20">
                <AvatarImage src={author?.avatarUrl} />
                <AvatarFallback>{author?.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-white drop-shadow-md">
                <span className="font-semibold text-sm mr-2">{author?.displayName}</span>
                <span className="text-xs text-white/80">
                  {formatDistanceToNow(new Date(currentStory.createdAt))}
                </span>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }} 
              className="p-2 text-white/80 hover:text-white bg-black/20 rounded-full backdrop-blur-md transition-colors story-controls"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area (Tap zones) */}
          <div 
            className="flex-1 relative cursor-pointer"
            onClick={handleTap}
          >
            {currentStory.type === 'image' && (
              <img src={currentStory.mediaUrl} className="absolute inset-0 w-full h-full object-cover" alt="Story" />
            )}
            
            {currentStory.type === 'text' && (
              <div 
                className="absolute inset-0 w-full h-full flex items-center justify-center p-8 text-center"
                style={{ background: currentStory.backgroundGradient || 'linear-gradient(to bottom right, #4facfe, #00f2fe)' }}
              >
                <p className="text-white text-3xl font-display font-bold leading-tight whitespace-pre-wrap drop-shadow-lg">
                  {currentStory.textContent}
                </p>
              </div>
            )}
          </div>

          {/* Bottom Bar (Reactions / Reply) */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent story-controls">
            <form onSubmit={handleSendReaction} className="flex gap-3 items-center">
              <div className="relative flex-1">
                <Input 
                  placeholder={`Reply to ${author?.displayName}...`}
                  className="rounded-full bg-black/40 border-white/20 text-white placeholder:text-white/60 pl-4 pr-10 backdrop-blur-xl h-12 focus-visible:ring-1 focus-visible:ring-white/50"
                  value={reactionText}
                  onChange={(e) => setReactionText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                />
              </div>
              <button type="button" onClick={() => reactToStory(currentStory.id, '❤️')} className="p-3 bg-black/40 border border-white/20 rounded-full backdrop-blur-xl text-white hover:scale-110 transition-transform">
                <Heart className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
