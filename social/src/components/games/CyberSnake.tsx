import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Trophy, Play, RotateCcw, Sparkles, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Point = { x: number; y: number };

const GRID_SIZE = 16;
const CELL_SIZE = 20; // 320px x 320px

export function CyberSnake() {
  const [snake, setSnake] = useState<Point[]>([
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ]);
  const [food, setFood] = useState<Point>({ x: 12, y: 8 });
  const [dir, setDir] = useState<Point>({ x: 1, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(640);
  const [gameOver, setGameOver] = useState(false);
  const dirRef = useRef<Point>({ x: 1, y: 0 });

  const startGame = () => {
    sounds.playPop();
    const initialSnake = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    setSnake(initialSnake);
    setFood({ x: 12, y: 8 });
    setDir({ x: 1, y: 0 });
    dirRef.current = { x: 1, y: 0 };
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver) return;
      const cur = dirRef.current;

      if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && cur.y === 0) {
        dirRef.current = { x: 0, y: -1 };
        setDir({ x: 0, y: -1 });
      }
      if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && cur.y === 0) {
        dirRef.current = { x: 0, y: 1 };
        setDir({ x: 0, y: 1 });
      }
      if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') && cur.x === 0) {
        dirRef.current = { x: -1, y: 0 };
        setDir({ x: -1, y: 0 });
      }
      if ((e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') && cur.x === 0) {
        dirRef.current = { x: 1, y: 0 };
        setDir({ x: 1, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver]);

  // Main Game Loop
  useEffect(() => {
    if (!isPlaying || gameOver) return;

    const interval = setInterval(() => {
      setSnake(prevSnake => {
        const head = {
          x: (prevSnake[0].x + dirRef.current.x + GRID_SIZE) % GRID_SIZE,
          y: (prevSnake[0].y + dirRef.current.y + GRID_SIZE) % GRID_SIZE,
        };

        // Check self collision
        if (prevSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
          sounds.playGlitch();
          setGameOver(true);
          setIsPlaying(false);
          triggerConfetti();
          toast.success(`Game Over! Score: ${score} Pts (+${Math.round(score / 5)} Karma)`);
          return prevSnake;
        }

        const newSnake = [head, ...prevSnake];

        // Check food collision
        if (head.x === food.x && head.y === food.y) {
          sounds.playPop();
          setScore(s => {
            const ns = s + 100;
            if (ns > highScore) setHighScore(ns);
            return ns;
          });
          // Spawn new food
          setFood({
            x: Math.floor(Math.random() * GRID_SIZE),
            y: Math.floor(Math.random() * GRID_SIZE),
          });
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, 110);

    return () => clearInterval(interval);
  }, [isPlaying, gameOver, food, score, highScore]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Snake Bharat Blitz
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Eat Glowing Golden Diyas & Grow Length</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[0.62rem]">All-Time High Score</div>
          <div className="font-bold text-emerald-400">{highScore} Pts</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Snake Length</span>
          <span className="font-display font-black text-xl text-amber-400">{snake.length} Segments</span>
        </div>
      </div>

      {/* 320x320 Canvas Board */}
      <div className="relative w-[320px] h-[320px] mx-auto rounded-2xl overflow-hidden border-2 border-border/60 bg-zinc-950 p-1 select-none shadow-2xl">
        {/* Render Snake Segments */}
        {snake.map((seg, idx) => (
          <div
            key={idx}
            style={{
              left: `${seg.x * CELL_SIZE}px`,
              top: `${seg.y * CELL_SIZE}px`,
              width: `${CELL_SIZE - 2}px`,
              height: `${CELL_SIZE - 2}px`,
            }}
            className={cn(
              "absolute rounded-md transition-all duration-75",
              idx === 0 ? "bg-emerald-400 shadow-[0_0_10px_#34d399] z-10" : "bg-emerald-600/80"
            )}
          />
        ))}

        {/* Render Diya Food Item */}
        <div
          style={{
            left: `${food.x * CELL_SIZE}px`,
            top: `${food.y * CELL_SIZE}px`,
            width: `${CELL_SIZE - 2}px`,
            height: `${CELL_SIZE - 2}px`,
          }}
          className="absolute flex items-center justify-center text-sm animate-bounce z-10"
        >
          ✨
        </div>

        {/* Start / Game Over Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-30">
            {gameOver ? (
              <>
                <Trophy className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Game Over!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Final Score: {score} Pts</p>
              </>
            ) : (
              <>
                <Zap className="w-10 h-10 text-emerald-400 mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Snake Blitz</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Use WASD or Arrow Keys to navigate and eat glowing diyas!</p>
              </>
            )}

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-black" /> {gameOver ? 'Play Again' : 'Start Blitz'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
