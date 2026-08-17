import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Play, Pause, RotateCcw, Sparkles, 
  CheckCircle2, Type, Sliders, Monitor, Download 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

export default function TeleprompterStudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(160);
  const [fontSize, setFontSize] = useState(28);

  const script = `Namaskar dosto! Welcome back to another high-octane live stream on Yor Talks! 

Aaj hum play karne wale hain Grand Finals Scrims match! 

Bhai log, agar aap channel pe pehli baar aaye ho, to jaldi se video ko like karo, subscribe button dabao aur notification bell on kar lo!

Drop your squad predictions in the live chat right now! Let's get straight into the lobby! 🔥`;

  const togglePlay = () => {
    sounds.playPop();
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Hinglish Teleprompter</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">160 WPM Auto-Scroll, Beam Splitter Mirror Mode & Smooth Prompter Canvas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={togglePlay}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1 fill-white" />}
            {isPlaying ? 'Pause Prompter' : 'Start Prompter'}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Prompter Screen */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 shadow-2xl h-80 overflow-y-auto bg-black text-center font-display leading-relaxed relative flex flex-col items-center justify-center">
          <p
            style={{ fontSize: `${fontSize}px` }}
            className="text-amber-300 font-bold whitespace-pre-line tracking-wide drop-shadow-md select-none"
          >
            {script}
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-3xl surface-1 border border-border/40 font-mono text-xs text-center">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Reading Speed</span>
            <strong className="font-display font-bold text-lg text-cyan-400">{wpm} WPM (Hinglish)</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Font Dimension</span>
            <strong className="font-display font-bold text-lg text-primary">{fontSize}px Pro Bold</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
