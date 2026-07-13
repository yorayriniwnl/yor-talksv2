import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore, Story } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronLeft, ChevronRight, Send, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STORY_DURATION = 5000;
const REACTIONS = ['❤️', '🔥', '😂', '👏', '😮'];

export function StoryViewer({ storyIds, initialIndex, onClose }: { storyIds: string[]; initialIndex: number; onClose: () => void }) {
  const { stories, users, viewStory, reactToStory } = useAppStore();
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [reply, setReply] = useState('');

  const story = stories.find(s => s.id === storyIds[index]);

  useEffect(() => {
    if (story) viewStory(story.id);
    setProgress(0);
  }, [story?.id]);

  useEffect(() => {
    if (!story) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 100 / (STORY_DURATION / 100);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [story?.id]);

  const goNext = () => {
    if (index < storyIds.length - 1) setIndex(i => i + 1);
    else onClose();
  };
  const goPrev = () => {
    if (index > 0) setIndex(i => i - 1);
  };

  if (!story) return null;
  const author = users[story.authorId];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white z-20">
          <X className="w-6 h-6" />
        </button>
        <button onClick={goPrev} className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-white/60 hover:text-white z-20 hidden sm:block">
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button onClick={goNext} className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-white/60 hover:text-white z-20 hidden sm:block">
          <ChevronRight className="w-8 h-8" />
        </button>

        <div className="relative w-full max-w-sm h-full sm:h-[85vh] sm:rounded-2xl overflow-hidden bg-neutral-900">
          <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
            {storyIds.map((id, i) => (
              <div key={id} className="flex-1 h-0.5 rounded-full bg-white/25 overflow-hidden">
                <div
                  className="h-full bg-white"
                  style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
                />
              </div>
            ))}
          </div>

          <div className="absolute top-7 left-3 right-3 z-10 flex items-center gap-2">
            <Avatar className="w-8 h-8 border border-white/40">
              <AvatarImage src={author?.avatarUrl} />
              <AvatarFallback>{author?.displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-white text-sm">
              <p className="font-medium leading-tight">{author?.displayName}</p>
              <p className="text-white/60 text-xs leading-tight">{formatDistanceToNow(new Date(story.createdAt), { addSuffix: true })}</p>
            </div>
          </div>

          <div className="absolute inset-0 flex" onClick={(e) => {
            const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
            const w = e.currentTarget.getBoundingClientRect().width;
            if (x < w / 2) goPrev(); else goNext();
          }}>
            {story.type === 'text' ? (
              <div className={`flex-1 flex items-center justify-center p-10 bg-gradient-to-br ${story.backgroundGradient ?? 'from-primary to-accent'}`}>
                <p className="text-white text-2xl font-display font-semibold text-center leading-snug">{story.textContent}</p>
              </div>
            ) : story.type === 'voice' ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-neutral-800 to-neutral-950">
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center animate-pulse">
                  <Heart className="w-10 h-10 text-white/70" />
                </div>
                <p className="text-white/70 text-sm">Voice note</p>
              </div>
            ) : (
              <img src={story.mediaUrl} className="w-full h-full object-cover" alt="" />
            )}
          </div>

          <div className="absolute bottom-4 left-3 right-3 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={`Reply to ${author?.displayName.split(' ')[0]}...`}
              className="flex-1 bg-white/10 backdrop-blur text-white placeholder:text-white/50 rounded-full px-4 py-2.5 text-sm outline-none border border-white/20"
              onKeyDown={(e) => { if (e.key === 'Enter') { setReply(''); goNext(); } }}
            />
            {REACTIONS.slice(0, 1).map(e => (
              <button key={e} onClick={() => reactToStory(story.id, e)} className="text-2xl hover:scale-110 transition-transform">{e}</button>
            ))}
            <button onClick={() => { setReply(''); }} className="text-white/80 hover:text-white">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
