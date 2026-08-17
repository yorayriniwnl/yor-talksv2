import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bookmark, Clock, Copy, Sparkles, CheckCircle2, 
  Video, Youtube, Download, Tag, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

interface Chapter {
  timestamp: string;
  title: string;
  type: string;
}

const CHAPTERS: Chapter[] = [
  { timestamp: '00:00', title: 'Stream Intro & Warmup Chatting', type: 'Just Chatting' },
  { timestamp: '04:15', title: 'Map 1: Ascent Pistol Round ACE! 🔥', type: 'Clutch Play' },
  { timestamp: '12:40', title: 'Team Comms Discord Chaos & Funny Moment 🤣', type: 'Highlight' },
  { timestamp: '24:50', title: 'Grand Finals Decider 1v3 Clutch Defuse 🏆', type: 'Epic Moment' },
  { timestamp: '38:10', title: 'Superchat Readings, Dhol Celebrations & Outro', type: 'Outro' },
];

export default function VODChapters() {
  const handleCopyTimestamps = () => {
    sounds.playChime();
    const text = CHAPTERS.map(c => `${c.timestamp} - ${c.title}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('📋 YouTube Video Description Chapters copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">VOD Chapters & Timestamps AI</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Clutch Round Detection, YouTube Video Description Sync & JSON Export</p>
          </div>
        </div>

        <Button
          onClick={handleCopyTimestamps}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy YouTube Timestamps
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="space-y-3 font-sans">
          {CHAPTERS.map((c) => (
            <div
              key={c.timestamp}
              className="surface-1 p-5 rounded-3xl border border-border/40 flex items-center justify-between shadow-xl"
            >
              <div className="flex items-center gap-4">
                <span className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xs">
                  {c.timestamp}
                </span>
                <div>
                  <h3 className="font-display font-bold text-base text-foreground">{c.title}</h3>
                  <span className="text-xs font-mono text-muted-foreground">{c.type}</span>
                </div>
              </div>

              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Synced
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
