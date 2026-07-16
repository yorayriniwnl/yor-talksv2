import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Send, Wand2, FileText, Languages, Captions, History } from 'lucide-react';

const SUGGESTIONS = [
  { icon: Wand2, label: 'Write a post about my new project' },
  { icon: FileText, label: 'Summarize this community\'s top discussions' },
  { icon: Languages, label: 'Translate my last post to Spanish' },
  { icon: Captions, label: 'Generate captions for my latest video' },
];

export default function AIAssistant() {
  const aiMessages = useAppStore((s) => s.aiMessages);
  const sendAIMessage = useAppStore((s) => s.sendAIMessage);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [aiMessages.length]);

  const submit = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    sendAIMessage(content);
    setInput('');
  };

  return (
    <div className="max-w-3xl mx-auto min-h-screen flex flex-col px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl">AI Assistant</h1>
          <p className="text-sm text-muted-foreground">Your writing partner and workspace copilot.</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar space-y-4 mb-4">
        {aiMessages.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted/60 text-foreground rounded-bl-sm'}`}>
              {m.content}
            </div>
          </motion.div>
        ))}

        {aiMessages.length <= 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => submit(s.label)}
                className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-card hover:bg-muted/40 transition-colors text-left"
              >
                <s.icon className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        <Button variant="ghost" size="icon" className="rounded-full shrink-0 text-muted-foreground">
          <History className="w-4 h-4" />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Ask the assistant anything..."
          className="rounded-full bg-muted/50 border-none h-11"
        />
        <Button size="icon" className="rounded-full shrink-0 h-11 w-11" onClick={() => submit()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
