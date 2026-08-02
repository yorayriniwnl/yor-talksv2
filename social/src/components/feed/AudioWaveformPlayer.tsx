import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, Mic } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';

interface AudioWaveformPlayerProps {
  duration?: string;
}

export function AudioWaveformPlayer({ duration = '0:42' }: AudioWaveformPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    sounds.playPop();
    setIsPlaying(!isPlaying);
  };

  const BARS = [30, 60, 45, 80, 100, 70, 40, 90, 65, 85, 50, 75, 95, 60, 40, 70, 90, 55, 35, 65];

  return (
    <div className="surface-1 rounded-2xl p-3.5 border border-border/40 flex items-center gap-3.5 max-w-sm my-2 font-sans shadow-sm">
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center glow-neon-primary shrink-0 transition-transform active:scale-95"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center justify-between text-[0.68rem] font-mono text-muted-foreground mb-1">
          <span className="flex items-center gap-1 font-bold text-foreground">
            <Mic className="w-3 h-3 text-primary" /> Voice Note
          </span>
          <span>{duration}</span>
        </div>

        {/* Animated Waveform Bars */}
        <div className="flex items-end gap-1 h-7">
          {BARS.map((height, i) => (
            <motion.div
              key={i}
              animate={isPlaying ? { height: [`${Math.max(20, height * 0.3)}%`, `${height}%`, `${Math.max(15, height * 0.4)}%`] } : { height: `${height * 0.5}%` }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.04, ease: 'easeInOut' }}
              className={cn("flex-1 rounded-full transition-colors", isPlaying ? "bg-primary glow-neon-primary" : "bg-muted-foreground/30")}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
