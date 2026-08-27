import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAppStore, type Story } from '@/lib/store';
import { X, Send, Heart, Smile, Zap, Sparkles, HelpCircle, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { sounds } from '@/lib/sound';
import { UpiTipJarModal } from '@/components/monetization/UpiTipJarModal';
import { toast } from 'sonner';

interface StoryViewerProps {
  initialAuthorId: string;
  groupedStories: Record<string, Story[]>;
  authors: string[];
  onClose: () => void;
}

const STORY_DURATION = 5000;
const FAST_REACTIONS = ['🔥', '❤️', '🚀', '💎', '😂', '🙏'];

export default function StoryViewer({ initialAuthorId, groupedStories, authors, onClose }: StoryViewerProps) {
  const users = useAppStore((s) => s.users);
  const currentUser = useAppStore((s) => s.currentUser);
  const viewStory = useAppStore((s) => s.viewStory);
  const reactToStory = useAppStore((s) => s.reactToStory);
  const voteStoryPoll = useAppStore((s) => s.voteStoryPoll);
  const sendDirectMessage = useAppStore((s) => s.sendDirectMessage);

  const [authorIndex, setAuthorIndex] = useState(authors.indexOf(initialAuthorId) >= 0 ? authors.indexOf(initialAuthorId) : 0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reactionText, setReactionText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  
  // Floating reaction particle stream
  const [floatingParticles, setFloatingParticles] = useState<{ id: string; emoji: string; x: number }[]>([]);
  
  // Creator tip modal
  const [tippingOpen, setTippingOpen] = useState(false);

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
    // Don't trigger if clicking controls or interactive elements
    if ((e.target as HTMLElement).closest('.story-controls')) return;

    const x = e.clientX;
    const width = window.innerWidth;
    if (x < width * 0.35) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleQuickReaction = (emoji: string) => {
    sounds.playPop();
    const id = `pt_${Date.now()}_${Math.random()}`;
    const x = 30 + Math.random() * 40;
    setFloatingParticles((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== id));
    }, 1800);

    if (currentStory) {
      reactToStory(currentStory.id, emoji).catch(console.error);
    }
  };

  const handleSendReaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reactionText.trim() || !currentStory || !currentUser || currentAuthorId === currentUser.id || isSendingReply) return;
    setIsSendingReply(true);
    try {
      sounds.playChime();
      await sendDirectMessage(currentAuthorId, `[Story Reply] ${reactionText.trim()}`);
      toast.success('Reply sent to story author! 💬');
      setReactionText('');
    } catch {
      // toast will handle error
    } finally {
      setIsSendingReply(false);
    }
  };

  if (!currentStory) return null;

  const author = users[currentAuthorId];
  const displayName = author?.displayName || author?.username || 'Creator';
  const initialLetter = (displayName || 'U').charAt(0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col sm:p-4 md:p-8 items-center justify-center font-sans"
      >
        <div 
          className="relative w-full h-full sm:max-w-[420px] sm:h-[820px] sm:rounded-3xl overflow-hidden bg-zinc-950 flex flex-col shadow-2xl border border-white/10"
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        >
          {/* Progress Bars */}
          <div className="absolute top-0 left-0 right-0 z-30 flex gap-1.5 p-3 pt-4">
            {currentStories.map((s, idx) => (
              <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
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
          <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 pt-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 border-2 border-primary shadow-lg">
                <AvatarImage src={author?.avatarUrl} />
                <AvatarFallback className="font-bold text-xs">{initialLetter}</AvatarFallback>
              </Avatar>
              <div className="text-white drop-shadow-md">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm leading-none">{displayName}</span>
                  <span className="text-[0.6rem] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary border border-primary/30 font-bold">
                    PRO
                  </span>
                </div>
                <span className="text-[0.68rem] text-white/70 font-mono">
                  {formatDistanceToNow(new Date(currentStory.createdAt))} ago
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 story-controls">
              {/* Tip Creator in Story */}
              {author && (
                <button
                  onClick={() => {
                    setIsPaused(true);
                    setTippingOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-full bg-amber-500 text-black font-bold text-xs flex items-center gap-1 shadow-md hover:scale-105 transition-transform"
                  title="Tip Creator via UPI"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" /> Tip
                </button>
              )}

              <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="p-2 text-white/80 hover:text-white bg-black/40 rounded-full backdrop-blur-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Floating Reaction Particles Stream */}
          <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
            {floatingParticles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ y: '100%', opacity: 1, scale: 0.6 }}
                animate={{ y: '-10%', opacity: 0, scale: 2.2 }}
                transition={{ duration: 1.6, ease: 'easeOut' }}
                style={{ left: `${p.x}%` }}
                className="absolute text-4xl"
              >
                {p.emoji}
              </motion.div>
            ))}
          </div>

          {/* Content Area (Tap zones) */}
          <div 
            className="flex-1 relative cursor-pointer flex items-center justify-center select-none"
            onClick={handleTap}
          >
            {currentStory.type === 'image' || currentStory.type === 'video' ? (
              <img src={currentStory.mediaUrl} className="absolute inset-0 w-full h-full object-cover" alt="Story" />
            ) : null}
            
            {currentStory.type === 'text' && (
              <div 
                className="absolute inset-0 w-full h-full flex items-center justify-center p-8 text-center"
                style={{ background: currentStory.backgroundGradient || 'linear-gradient(to bottom right, #4facfe, #00f2fe)' }}
              >
                <p className="text-white text-2xl font-display font-black leading-snug whitespace-pre-wrap drop-shadow-xl">
                  {currentStory.textContent}
                </p>
              </div>
            )}

            {currentStory.poll && (
              <div className="absolute z-20 w-4/5 max-w-[280px] story-controls pointer-events-auto">
                <div className="surface-1/90 backdrop-blur-xl p-4 rounded-3xl border-2 border-primary/50 shadow-2xl text-center">
                  <span className="text-[0.62rem] font-mono font-bold uppercase text-primary tracking-wider flex items-center justify-center gap-1 mb-1">
                    <BarChart2 className="w-3 h-3" /> Audience poll
                  </span>
                  <h4 className="font-display font-black text-xs text-foreground mb-3 leading-snug">{currentStory.poll.question}</h4>
                  <div className="space-y-2">
                    {currentStory.poll.options.map((option) => {
                      const percentage = currentStory.poll!.totalVotes > 0 ? Math.round((option.votes / currentStory.poll!.totalVotes) * 100) : 0;
                      const hasVoted = Boolean(currentStory.poll!.votedOptionId);
                      const isVoted = currentStory.poll!.votedOptionId === option.id;
                      return (
                        <button key={option.id} type="button" disabled={hasVoted} onClick={() => { sounds.playPop(); void voteStoryPoll(currentStory.id, option.id); }} className="relative w-full overflow-hidden p-2.5 rounded-2xl border border-primary/40 text-xs font-bold transition-all text-left flex items-center justify-between disabled:cursor-default">
                          {hasVoted && <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} className={cn('absolute inset-y-0 left-0 z-0', isVoted ? 'bg-primary/30' : 'bg-accent/20')} />}
                          <span className="relative z-10 text-foreground">{option.text}</span>
                          {hasVoted && <span className="relative z-10 font-mono text-primary font-extrabold">{percentage}%</span>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[0.62rem] text-muted-foreground">{currentStory.poll.totalVotes.toLocaleString()} votes</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Fast Reaction Bar & Reply Box */}
          <div className="relative z-30 p-4 pt-2 bg-gradient-to-t from-black/95 via-black/80 to-transparent story-controls space-y-2.5">
            {/* Quick 6-Emoji Fast Reactions */}
            <div className="flex items-center justify-between px-1">
              {FAST_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleQuickReaction(emoji)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* DM Reply Input */}
            <form onSubmit={handleSendReaction} className="flex items-center gap-2">
              <Input
                value={reactionText}
                onChange={(e) => setReactionText(e.target.value)}
                placeholder={currentAuthorId === currentUser?.id ? 'Your own story' : `Reply to ${displayName}…`}
                disabled={currentAuthorId === currentUser?.id || isSendingReply}
                className="rounded-full bg-white/10 border-white/20 text-xs h-10 text-white placeholder:text-white/60 focus:border-primary/60"
              />
              <button
                type="submit"
                disabled={!reactionText.trim() || currentAuthorId === currentUser?.id || isSendingReply}
                className="w-10 h-10 rounded-full bg-primary text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-40 shrink-0 glow-neon-primary cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Story Tip Modal */}
        {author && (
          <UpiTipJarModal
            creator={{
              id: author.id,
              displayName: author.displayName,
              username: author.username,
              avatarUrl: author.avatarUrl,
            }}
            isOpen={tippingOpen}
            onOpenChange={(open) => {
              setTippingOpen(open);
              if (!open) setIsPaused(false);
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
