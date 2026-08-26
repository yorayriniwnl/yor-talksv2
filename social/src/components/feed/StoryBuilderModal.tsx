import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart2, Sparkles, Image as ImageIcon, Type, Palette, Send, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { type ContentCategory } from '@/lib/content-category';

interface StoryBuilderModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isHighlight?: boolean;
}

const STORY_GRADIENTS = [
  { id: 'sunset', name: 'Sunset Rose', css: 'from-rose-500 via-purple-600 to-amber-500' },
  { id: 'cyan', name: 'Cyber Neon', css: 'from-cyan-400 via-blue-600 to-indigo-700' },
  { id: 'gold', name: 'Solar Gold', css: 'from-amber-300 via-orange-500 to-red-600' },
  { id: 'emerald', name: 'Aurora Green', css: 'from-emerald-400 via-teal-600 to-blue-700' },
  { id: 'cosmic', name: 'Deep Cosmic', css: 'from-fuchsia-600 via-purple-900 to-black' },
];

export function StoryBuilderModal({ isOpen, onOpenChange, isHighlight = false }: StoryBuilderModalProps) {
  const addStory = useAppStore((s) => s.addStory);
  const currentUser = useAppStore((s) => s.currentUser);

  const [textContent, setTextContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(STORY_GRADIENTS[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [storyType, setStoryType] = useState<'text' | 'image'>('text');
  const [highlightTitle, setHighlightTitle] = useState('');
  const [contentCategory, setContentCategory] = useState<ContentCategory | ''>('');
  const [contentRating, setContentRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const handlePublishStory = async () => {
    if (storyType === 'text' && !textContent.trim()) return;
    if (storyType === 'image' && !imageUrl.trim()) return;
    if (!contentCategory) return;
    const normalizedPollOptions = pollOptions.map((option) => option.trim()).filter(Boolean);
    if (pollOpen && (!pollQuestion.trim() || normalizedPollOptions.length < 2)) return;

    try {
      await addStory({
        type: storyType,
        textContent: storyType === 'text' ? textContent.trim() : undefined,
        mediaUrl: storyType === 'image' ? imageUrl.trim() : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
        backgroundGradient: selectedGradient.css,
        contentCategory,
        contentRating,
        isHighlight,
        ...(isHighlight ? { highlightTitle: highlightTitle.trim() || 'Highlights' } : {}),
        ...(pollOpen ? { poll: { question: pollQuestion.trim(), options: normalizedPollOptions.map((text) => ({ text })) } } : {}),
      });
      sounds.playChime();
      triggerConfetti();
      toast.success(isHighlight ? 'Story added to your highlights! ✨' : 'Story published for 24 hours! ✨');
      setTextContent('');
      setImageUrl('');
      setHighlightTitle('');
      setContentCategory('');
      setContentRating(DEFAULT_CONTENT_RATING);
      setPollOpen(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      onOpenChange(false);
    } catch {
      // The store has already removed the optimistic story and reported the API error.
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl font-sans overflow-hidden p-0 border-border/50">
        {/* Story Canvas Live Preview */}
        <div className={cn("relative w-full h-80 bg-gradient-to-br flex flex-col justify-between p-6 transition-all duration-500", selectedGradient.css)}>
          {/* Header Bar */}
          <div className="flex items-center justify-between text-white relative z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs font-display backdrop-blur-md px-3 py-1 rounded-full bg-white/20">
                {(currentUser?.displayName || currentUser?.username || 'User')}'s Story
              </span>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white backdrop-blur-md">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas Center Preview */}
          <div className="flex-1 flex items-center justify-center text-center px-4 relative z-10">
            {storyType === 'text' ? (
              <p className="text-white text-2xl md:text-3xl font-display font-extrabold drop-shadow-md leading-tight">
                {textContent || "Type your story caption..."}
              </p>
            ) : imageUrl.trim() ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover rounded-2xl shadow-xl border border-white/20" />
            ) : (
              <p className="text-white/70 text-sm font-mono">Enter image URL below...</p>
            )}
          </div>

          <div className="text-[0.68rem] text-white/80 font-mono text-center relative z-10">
            Visible to followers for 24 hours
          </div>
        </div>

        {/* Controls Drawer */}
        <div className="p-5 space-y-4 surface-1">
          {/* Type Toggle */}
          <div className="flex rounded-2xl surface-2 p-1 border border-border/40">
            <button
              onClick={() => setStoryType('text')}
              className={cn("flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5", storyType === 'text' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
            >
              <Type className="w-3.5 h-3.5" /> Text Story
            </button>
            <button
              onClick={() => setStoryType('image')}
              className={cn("flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5", storyType === 'image' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground")}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Photo Story
            </button>
          </div>

          {storyType === 'text' ? (
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="What's happening right now?"
              className="w-full h-24 rounded-2xl surface-2 border border-border/40 p-3 text-sm outline-none resize-none placeholder:text-muted-foreground font-serif"
            />
          ) : (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full h-10 rounded-xl surface-2 border border-border/40 px-3 text-xs outline-none focus:border-primary/50 font-mono"
            />
          )}

          {/* Gradient Palette Picker */}
          <ContentCategorySelect id="story-content-category" value={contentCategory} onChange={setContentCategory} />
          <ContentRatingSelect id="story-content-rating" value={contentRating} onChange={setContentRating} />

          {isHighlight && (
            <input
              value={highlightTitle}
              onChange={(event) => setHighlightTitle(event.target.value)}
              placeholder="Highlight name (for example, Travel)"
              maxLength={40}
              className="h-10 w-full rounded-xl border border-border/40 bg-background/60 px-3 text-xs outline-none focus:border-primary/50"
              aria-label="Highlight name"
            />
          )}

          <div className="rounded-2xl border border-border/40 bg-background/30 p-3">
            <button type="button" onClick={() => setPollOpen((open) => !open)} className="flex w-full items-center gap-2 text-left text-xs font-bold">
              <BarChart2 className="h-3.5 w-3.5 text-primary" /> Add a poll
              <span className="ml-auto text-[0.65rem] font-mono text-muted-foreground">{pollOpen ? 'On' : 'Off'}</span>
            </button>
            {pollOpen && (
              <div className="mt-3 space-y-2">
                <input value={pollQuestion} onChange={(event) => setPollQuestion(event.target.value)} placeholder="Ask your audience a question" maxLength={240} className="h-9 w-full rounded-xl border border-border/40 bg-background/60 px-3 text-xs outline-none focus:border-primary/50" />
                {pollOptions.map((option, index) => (
                  <input key={index} value={option} onChange={(event) => setPollOptions((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`Option ${index + 1}`} maxLength={80} className="h-9 w-full rounded-xl border border-border/40 bg-background/60 px-3 text-xs outline-none focus:border-primary/50" />
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[0.68rem] font-mono font-bold uppercase text-muted-foreground mb-2 block">
              Canvas Background Style
            </label>
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
              {STORY_GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    sounds.playPop();
                    setSelectedGradient(g);
                  }}
                  className={cn(
                    "w-9 h-9 rounded-full bg-gradient-to-br shrink-0 transition-transform border-2",
                    g.css,
                    selectedGradient.id === g.id ? "scale-110 border-white ring-2 ring-primary shadow-md" : "border-transparent opacity-80"
                  )}
                  title={g.name}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handlePublishStory}
              disabled={(storyType === 'text' && !textContent.trim()) || (storyType === 'image' && !imageUrl.trim()) || !contentCategory || (pollOpen && (!pollQuestion.trim() || pollOptions.filter((option) => option.trim()).length < 2))}
              className="w-full rounded-xl font-bold text-xs h-11 glow-neon-primary bg-primary text-primary-foreground"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" /> Share Story Live
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
