import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, Volume2, Flame, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RhythmNote {
  id: string;
  lane: number; // 0, 1, 2, 3
  y: number;
  hit: boolean;
}

const LANES = [
  { key: 'D', label: 'Left 🥢', color: '#f59e0b' },
  { key: 'F', label: 'Right 🥢', color: '#ec4899' },
  { key: 'J', label: 'Spin 💃', color: '#06b6d4' },
  { key: 'K', label: 'Clap 👏', color: '#10b981' },
];

export function CyberDandiya() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(3800);
  const [notes, setNotes] = useState<RhythmNote[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setStreak(0);
    setNotes([
      { id: 'n-1', lane: 0, y: -40, hit: false },
      { id: 'n-2', lane: 1, y: -120, hit: false },
      { id: 'n-3', lane: 2, y: -200, hit: false },
      { id: 'n-4', lane: 3, y: -280, hit: false },
    ]);
    setIsPlaying(true);
    toast.success('🎶 GARBA BEAT STARTED! Strike notes when they reach the target line!');
  };

  const handleHitLane = (laneIndex: number) => {
    if (!isPlaying) return;

    // Find note closest to target line (y between 180 and 240)
    const targetNote = notes.find(
      (n) => n.lane === laneIndex && !n.hit && n.y >= 160 && n.y <= 240
    );

    if (targetNote) {
      sounds.playChime();
      setNotes((prev) => prev.map((n) => (n.id === targetNote.id ? { ...n, hit: true } : n)));
      setStreak((s) => {
        const nextStreak = s + 1;
        const multiplier = nextStreak > 10 ? 4 : nextStreak > 5 ? 2 : 1;
        setScore((sc) => {
          const nextScore = sc + 100 * multiplier;
          if (nextScore > highScore) setHighScore(nextScore);
          return nextScore;
        });

        if (nextStreak === 10) {
          triggerConfetti();
          toast.success('🔥 GARBA FEVER 4X MULTIPLIER ENGAGED!');
        }
        return nextStreak;
      });
    } else {
      sounds.playGlitch();
      setStreak(0);
      toast.error('❌ Missed Beat!');
    }
  };

  // 60fps Note falling loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setNotes((prev) => {
        const updated = prev
          .map((n) => ({ ...n, y: n.y + 4 }))
          .filter((n) => n.y < 280);

        // Spawn new random note if needed
        if (Math.random() < 0.25) {
          updated.push({
            id: `note-${Date.now()}-${Math.random()}`,
            lane: Math.floor(Math.random() * 4),
            y: -20,
            hit: false,
          });
        }
        return updated;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Dandiya Raas Rhythm Tap
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Dhol Rhythm Beats, Dandiya Strikes & Garba Fever Multipliers</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">High Score</span>
          <strong className="text-amber-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Rhythm Streak</span>
          <span className="font-display font-black text-xl text-amber-400">{streak}x Combo</span>
        </div>
      </div>

      {/* 4-Lane Visual Track */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-zinc-950 h-64 mb-4 select-none">
        {/* Lanes Grid */}
        <div className="grid grid-cols-4 h-full divide-x divide-border/20 relative">
          {LANES.map((lane, idx) => (
            <div key={lane.key} className="h-full flex flex-col justify-end items-center pb-3 relative">
              <span className="font-mono text-xs text-muted-foreground font-bold">{lane.label}</span>
            </div>
          ))}

          {/* Hit Target Line */}
          <div className="absolute top-[200px] inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-pink-500 to-emerald-500 shadow-md glow-neon-primary z-10" />

          {/* Falling Notes */}
          {notes.map((n) => {
            if (n.hit) return null;
            const laneInfo = LANES[n.lane];
            return (
              <div
                key={n.id}
                style={{
                  top: `${n.y}px`,
                  left: `${n.lane * 25 + 3.5}%`,
                  backgroundColor: laneInfo.color,
                }}
                className="absolute w-12 h-6 rounded-full shadow-lg flex items-center justify-center font-bold text-[0.65rem] text-black transition-transform"
              >
                🥢
              </div>
            );
          })}
        </div>

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <Music className="w-10 h-10 text-pink-400 mb-2 animate-bounce" />
            <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Dandiya Raas</h4>
            <p className="text-xs text-zinc-400 mb-4 font-mono">Tap the buttons below to strike Dandiya sticks in rhythm with the beats!</p>

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> Start Dandiya Beats
            </Button>
          </div>
        )}
      </div>

      {/* 4 Interactive Lane Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {LANES.map((lane, idx) => (
          <Button
            key={lane.key}
            onClick={() => handleHitLane(idx)}
            disabled={!isPlaying}
            className="rounded-2xl h-12 text-xs font-bold font-mono text-white shadow-md active:scale-95 transition-all"
            style={{ backgroundColor: lane.color }}
          >
            {lane.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
