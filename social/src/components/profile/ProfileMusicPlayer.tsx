import { useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';

export function ProfileMusicPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrack, setActiveTrack] = useState('Cyberpunk Synthwave Lofi');

  const toggleMusic = () => {
    sounds.playPop();
    setIsPlaying(!isPlaying);
  };

  const TRACK_EQUALIZER_BARS = [40, 80, 60, 100, 75, 45, 90, 65, 30, 85, 95, 50];

  return (
    <div className="surface-1 rounded-2xl p-3 border border-primary/30 flex items-center justify-between gap-3 shadow-md my-4 font-sans backdrop-blur-md">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={toggleMusic}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 transition-transform active:scale-95 shadow-md",
            isPlaying ? "bg-gradient-to-tr from-pink-500 to-purple-600 glow-neon-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {isPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <div className="min-w-0">
          <h5 className="font-bold text-xs truncate flex items-center gap-1">
            <Music className="w-3 h-3 text-primary shrink-0" /> Profile Soundtrack
          </h5>
          <p className="text-[0.62rem] text-muted-foreground font-mono truncate">{activeTrack}</p>
        </div>
      </div>

      {/* Frequency Equalizer Visualizer */}
      <div className="flex items-end gap-0.5 h-5 shrink-0 px-2">
        {TRACK_EQUALIZER_BARS.map((height, i) => (
          <motion.div
            key={i}
            animate={isPlaying ? { height: [`${Math.max(15, height * 0.2)}%`, `${height}%`, `${Math.max(10, height * 0.3)}%`] } : { height: '20%' }}
            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05, ease: 'easeInOut' }}
            className={cn("w-1 rounded-full transition-colors", isPlaying ? "bg-primary glow-neon-primary" : "bg-muted-foreground/30")}
          />
        ))}
      </div>
    </div>
  );
}
