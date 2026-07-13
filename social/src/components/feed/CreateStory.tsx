import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Type, Mic, Video as VideoIcon } from 'lucide-react';

const GRADIENTS = [
  'from-violet-500 to-fuchsia-500',
  'from-blue-500 to-cyan-400',
  'from-orange-500 to-rose-500',
  'from-emerald-500 to-teal-400',
];

export function CreateStory({ children }: { children: React.ReactNode }) {
  const { addStory } = useAppStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'image' | 'text' | 'voice'>('image');
  const [text, setText] = useState('');
  const [gradient, setGradient] = useState(GRADIENTS[0]);

  const publish = () => {
    if (tab === 'text') {
      if (!text.trim()) return;
      addStory({ type: 'text', mediaUrl: '', textContent: text.trim(), backgroundGradient: gradient });
    } else if (tab === 'voice') {
      addStory({ type: 'voice', mediaUrl: '' });
    } else {
      addStory({ type: 'image', mediaUrl: `https://picsum.photos/seed/story_${Date.now()}/400/700` });
    }
    setText('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm p-0 overflow-hidden gap-0">
        <DialogTitle className="sr-only">Create Story</DialogTitle>
        <div className="flex border-b border-border/50">
          {[
            { id: 'image' as const, icon: ImageIcon, label: 'Photo' },
            { id: 'text' as const, icon: Type, label: 'Text' },
            { id: 'voice' as const, icon: Mic, label: 'Voice' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${tab === t.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <div className="aspect-[9/16] max-h-[420px] relative overflow-hidden">
          {tab === 'image' && (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <ImageIcon className="w-10 h-10" />
              <p className="text-sm">A camera preview would appear here</p>
            </div>
          )}
          {tab === 'text' && (
            <div className={`w-full h-full flex items-center justify-center p-8 bg-gradient-to-br ${gradient}`}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type something..."
                className="w-full bg-transparent text-white text-center text-xl font-display font-semibold placeholder:text-white/60 outline-none resize-none"
                rows={4}
              />
            </div>
          )}
          {tab === 'voice' && (
            <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex flex-col items-center justify-center gap-3 text-white/70">
              <Mic className="w-10 h-10" />
              <p className="text-sm">Tap record to capture a voice story</p>
            </div>
          )}
        </div>

        {tab === 'text' && (
          <div className="flex items-center gap-2 p-3 border-t border-border/50">
            {GRADIENTS.map((g) => (
              <button
                key={g}
                onClick={() => setGradient(g)}
                className={`w-7 h-7 rounded-full bg-gradient-to-br ${g} ${gradient === g ? 'ring-2 ring-offset-2 ring-primary ring-offset-background' : ''}`}
              />
            ))}
          </div>
        )}

        <div className="p-3 border-t border-border/50">
          <Button className="w-full rounded-full h-11" onClick={publish}>
            Share to Story
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
