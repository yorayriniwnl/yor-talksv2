import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { fadeInUp } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Bot, SendHorizontal, Sparkles, ShieldAlert } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

const SUGGESTIONS = [
  "Help me brainstorm a post about my project",
  "Suggest a clearer title for this idea",
  "Explain this topic to a beginner",
];

export default function AIAssistant() {
  const aiMessages = useAppStore((s) => s.aiMessages);
  const sendAIMessage = useAppStore((s) => s.sendAIMessage);
  const aiAvailable = useAppStore((s) => Boolean(s.eligibility?.activated && s.eligibility.capabilities.ai));
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

  if (!aiAvailable) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12 font-sans text-foreground">
        <section className="w-full max-w-xl rounded-3xl border border-border/50 bg-card/70 p-8 text-center shadow-xl sm:p-10" role="status">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">Not available</p>
          <h1 className="mt-2 font-display text-2xl font-black">AI Companion isn’t enabled here.</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            AI responses aren’t available for this account in the current release. This screen won’t send a message to an AI provider.
          </p>
          <Link href="/" className="mt-7 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground">
            Return to your feed
          </Link>
        </section>
      </main>
    );
  }

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
            <p className="text-[0.68rem] text-muted-foreground font-mono">Help for drafts and ideas</p>
          </div>
        </div>
        <span className="level-badge">AI assistant</span>
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-6 space-y-6">
        {showSuggestions && (
          <div className="py-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full aurora-bg flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="font-display font-extrabold text-2xl mb-2 text-shimmer">What would you like to work on?</h2>
            <p className="text-xs text-muted-foreground max-w-sm font-serif mb-8 leading-relaxed">
              Brainstorm, draft, or refine an idea. Responses may be inaccurate or incomplete.
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
            placeholder="Ask for help with an idea..."
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
          Messages go to the configured AI provider. Don’t include passwords or sensitive personal information.
        </p>
      </div>
    </div>
  );
}
