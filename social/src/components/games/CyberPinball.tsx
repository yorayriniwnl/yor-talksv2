import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, Play, RotateCcw, Flame, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Bumper {
  x: number;
  y: number;
  r: number;
  pts: number;
  hit: number;
}

export function CyberPinball() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(8450);
  const [gameOver, setGameOver] = useState(false);

  // Ball physics
  const ballRef = useRef({
    x: 180,
    y: 120,
    vx: 3,
    vy: -4,
    r: 7,
  });

  const flippersRef = useRef({
    leftUp: false,
    rightUp: false,
  });

  const bumpersRef = useRef<Bumper[]>([
    { x: 120, y: 80, r: 18, pts: 250, hit: 0 },
    { x: 240, y: 80, r: 18, pts: 250, hit: 0 },
    { x: 180, y: 130, r: 22, pts: 500, hit: 0 },
  ]);

  const animFrameRef = useRef<number | null>(null);

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setGameOver(false);
    ballRef.current = {
      x: 180,
      y: 60,
      vx: (Math.random() - 0.5) * 5,
      vy: 4,
      r: 7,
    };
    setIsPlaying(true);
  };

  const triggerFlipper = (side: 'left' | 'right') => {
    if (!isPlaying || gameOver) return;
    sounds.playPop();
    if (side === 'left') {
      flippersRef.current.leftUp = true;
      setTimeout(() => (flippersRef.current.leftUp = false), 150);
    } else {
      flippersRef.current.rightUp = true;
      setTimeout(() => (flippersRef.current.rightUp = false), 150);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        triggerFlipper('left');
      } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        triggerFlipper('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver]);

  // Main 60fps Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      // Clear screen
      ctx.fillStyle = '#06020e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Walls
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      // Draw Bumpers
      bumpersRef.current.forEach(b => {
        if (b.hit > 0) b.hit--;
        ctx.fillStyle = b.hit > 0 ? '#f43f5e' : '#fbbf24';
        ctx.shadowBlur = b.hit > 0 ? 20 : 10;
        ctx.shadowColor = b.hit > 0 ? '#f43f5e' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Flippers
      const f = flippersRef.current;
      // Left Flipper
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(80, 240);
      ctx.lineTo(140, f.leftUp ? 220 : 255);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#06b6d4';
      ctx.stroke();

      // Right Flipper
      ctx.beginPath();
      ctx.moveTo(280, 240);
      ctx.lineTo(220, f.rightUp ? 220 : 255);
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#06b6d4';
      ctx.stroke();

      if (isPlaying && !gameOver) {
        const b = ballRef.current;

        // Apply Gravity
        b.vy += 0.14;
        b.x += b.vx;
        b.y += b.vy;

        // Wall Bounce
        if (b.x <= 20 || b.x >= canvas.width - 20) {
          b.vx = -b.vx * 0.9;
          sounds.playPop();
        }
        if (b.y <= 20) {
          b.vy = -b.vy * 0.9;
          sounds.playPop();
        }

        // Bumper Collision
        bumpersRef.current.forEach(bmp => {
          const dx = b.x - bmp.x;
          const dy = b.y - bmp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < b.r + bmp.r) {
            sounds.playChime();
            bmp.hit = 12;
            const angle = Math.atan2(dy, dx);
            b.vx = Math.cos(angle) * 6;
            b.vy = Math.sin(angle) * 6;
            setScore(s => {
              const ns = s + bmp.pts;
              if (ns > highScore) setHighScore(ns);
              return ns;
            });
          }
        });

        // Flipper Collision & Kick
        if (b.y >= 230 && b.y <= 260) {
          if (b.x >= 70 && b.x <= 150 && f.leftUp) {
            sounds.playPop();
            b.vy = -8.5;
            b.vx = 4;
            setScore(s => s + 100);
          } else if (b.x >= 210 && b.x <= 290 && f.rightUp) {
            sounds.playPop();
            b.vy = -8.5;
            b.vx = -4;
            setScore(s => s + 100);
          }
        }

        // Drain / Game Over
        if (b.y >= canvas.height) {
          sounds.playGlitch();
          setGameOver(true);
          setIsPlaying(false);
          triggerConfetti();
          toast.success(`⚡ Pinball Run Finished! Final Score: ${score} Pts (+${Math.round(score / 5)} Karma)`);
        }

        // Draw Ball
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#38bdf8';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, highScore, score]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Pinball Bharat Blitz
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Trigger Flippers (A / D) & Hit Bumper Multipliers</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Record Score</span>
          <strong className="text-amber-400 font-bold">{highScore} Pts</strong>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Flipper Controls</span>
          <span className="font-mono text-xs text-muted-foreground font-bold">[A / Left] &middot; [D / Right]</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4 select-none">
        <canvas
          ref={canvasRef}
          width={360}
          height={280}
          className="w-full max-w-[360px] h-[280px] block"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            {gameOver ? (
              <>
                <Trophy className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Run Complete!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Score: {score} Pts</p>
              </>
            ) : (
              <>
                <Zap className="w-10 h-10 text-pink-400 mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Pinball</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Hit bumpers & keep the cyber orb alive!</p>
              </>
            )}

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> {gameOver ? 'Play Again' : 'Launch Cyber Pinball'}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Touch Flipper Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => triggerFlipper('left')}
          variant="outline"
          className="rounded-2xl h-12 text-xs font-bold font-mono"
        >
          ⬅️ Left Flipper (A)
        </Button>
        <Button
          onClick={() => triggerFlipper('right')}
          variant="outline"
          className="rounded-2xl h-12 text-xs font-bold font-mono"
        >
          Right Flipper (D) ➡️
        </Button>
      </div>
    </div>
  );
}
