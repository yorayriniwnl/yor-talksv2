import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Trophy, Play, RotateCcw, Sparkles, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ChaiItem {
  id: number;
  type: 'chai' | 'samosa' | 'bomb';
  points: number;
  icon: string;
}

export function CyberChaiTap() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(3850);
  const [timeLeft, setTimeLeft] = useState(30);
  const [grid, setGrid] = useState<(ChaiItem | null)[]>(Array(9).fill(null));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setGrid(Array(9).fill(null));
  };

  // Game Countdown Timer
  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setIsPlaying(false);
            sounds.playChime();
            triggerConfetti();
            toast.success(`☕ Chai Stall Rush Completed! Final Score: ${score} Pts`);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, timeLeft, score]);

  // Spawning mechanic
  useEffect(() => {
    if (isPlaying) {
      spawnRef.current = setInterval(() => {
        const randomIndex = Math.floor(Math.random() * 9);
        const rand = Math.random();
        let item: ChaiItem;

        if (rand < 0.6) {
          item = { id: Date.now(), type: 'chai', points: 100, icon: '☕' };
        } else if (rand < 0.85) {
          item = { id: Date.now(), type: 'samosa', points: 250, icon: '🥟' };
        } else {
          item = { id: Date.now(), type: 'bomb', points: -150, icon: '💣' };
        }

        setGrid(prev => {
          const next = [...prev];
          next[randomIndex] = item;
          return next;
        });

        // Auto remove after 900ms
        setTimeout(() => {
          setGrid(prev => {
            const next = [...prev];
            if (next[randomIndex]?.id === item.id) {
              next[randomIndex] = null;
            }
            return next;
          });
        }, 900);
      }, 650);
    }
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, [isPlaying]);

  const handleTap = (index: number) => {
    const item = grid[index];
    if (!item || !isPlaying) return;

    if (item.type === 'bomb') {
      sounds.playGlitch();
      toast.error('💥 Spilled Chai Bomb! -150 Pts');
    } else {
      sounds.playPop();
    }

    setScore(s => {
      const ns = Math.max(0, s + item.points);
      if (ns > highScore) setHighScore(ns);
      return ns;
    });

    setGrid(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Desi Chai Stall Rush
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Tap Hot Chai ☕ & Samosas 🥟, Avoid Bombs 💣</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Best Score</span>
          <strong className="text-amber-400 font-bold">{highScore}</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Time Remaining</span>
          <span className="font-display font-black text-xl text-primary">{timeLeft}s</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-emerald-400">{score}</span>
        </div>
      </div>

      {/* 3x3 Tapping Grid */}
      <div className="p-3 rounded-3xl bg-zinc-950 border-2 border-zinc-800 shadow-inner grid grid-cols-3 gap-3 aspect-square max-w-[320px] mx-auto mb-4 select-none">
        {grid.map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleTap(idx)}
            className={cn(
              "rounded-2xl flex items-center justify-center text-4xl transition-all duration-150 relative overflow-hidden",
              item ? "bg-zinc-900 border border-amber-500/40 shadow-lg scale-105" : "bg-zinc-900/40 border border-zinc-800/40"
            )}
          >
            {item && (
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                className="select-none filter drop-shadow-md"
              >
                {item.icon}
              </motion.span>
            )}
          </button>
        ))}
      </div>

      {/* Start Button */}
      {!isPlaying && (
        <Button
          onClick={startGame}
          className="w-full rounded-2xl font-bold text-xs h-11 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Play className="w-4 h-4 mr-1.5 fill-white" /> {timeLeft === 0 ? 'Play Rush Again' : 'Start 30s Chai Stall Rush'}
        </Button>
      )}
    </div>
  );
}
