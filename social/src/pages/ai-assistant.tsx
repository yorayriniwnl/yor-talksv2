import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fadeInUp } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Bot, SendHorizontal, Sparkles, Cpu } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  "Summarize my week on Yor Talks",
  "Draft an engaging post about my project",
  "What topics are trending today?",
];

export default function AIAssistant() {
  const aiMessages = useAppStore((s) => s.aiMessages);
  const sendAIMessage = useAppStore((s) => s.sendAIMessage);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const submit = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    sendAIMessage(content);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const showSuggestions = aiMessages.length === 0;

  return (
    <div className="max-w-3xl mx-auto h-[100dvh] flex flex-col font-sans bg-background">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center glow-neon-primary border border-primary/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Yor AI Companion</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Powered by Multiverse AI</p>
          </div>
        </div>
        <div className="level-badge">
          <Cpu className="w-3.5 h-3.5" /> Neural v2.5
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-6 space-y-6">
        {showSuggestions && (
          <div className="py-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full aurora-bg flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="font-display font-extrabold text-2xl mb-2 text-shimmer">How can I assist your multiverse today?</h2>
            <p className="text-xs text-muted-foreground max-w-sm font-serif mb-8 leading-relaxed">
              Ask questions, generate posts, analyze your engagement, or explore ideas together.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => submit(s)}
                  className="surface-1 rounded-2xl px-4 py-2.5 text-xs font-semibold cursor-pointer hover:border-primary/40 transition-all border border-border/50 hover:shadow-sm"
                >
                  ✨ {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {aiMessages.map((m) => (
            <motion.div
              key={m.id}
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mr-3 mt-1 border border-primary/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div 
                className={cn(
                  "max-w-[85%] sm:max-w-[75%] px-5 py-3.5 text-sm leading-relaxed font-serif",
                  m.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-xs shadow-md glow-neon-primary' 
                    : 'surface-1 text-foreground rounded-2xl rounded-tl-xs border border-border/40'
                )}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Composer */}
      <div className="p-4 sm:p-6 shrink-0 glass-heavy border-t border-border/40 pb-20 sm:pb-6">
        <div className="relative surface-1 rounded-2xl p-2 flex items-end shadow-lg border border-border/50 focus-within:border-primary/50 transition-colors">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Yor anything..."
            className="min-h-[44px] max-h-[160px] resize-none border-none bg-transparent focus-visible:ring-0 shadow-none text-sm py-2.5 px-3 hide-scrollbar font-serif"
            rows={1}
          />
          <Button 
            size="icon" 
            className={cn(
              "rounded-xl h-10 w-10 shrink-0 ml-2 transition-all",
              input.trim() ? "bg-primary text-primary-foreground glow-neon-primary" : "bg-muted text-muted-foreground"
            )} 
            onClick={() => submit()}
            disabled={!input.trim()}
          >
            <SendHorizontal className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[0.62rem] font-mono text-center text-muted-foreground/70 mt-2.5">
          Yor AI can synthesize thoughts. Verify important information.
        </p>
      </div>
    </div>
  );
}
