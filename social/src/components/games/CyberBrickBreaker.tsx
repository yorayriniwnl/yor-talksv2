import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Trophy, Play, RotateCcw, Sparkles, Flame, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  points: number;
  destroyed: boolean;
}

export function CyberBrickBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(2400);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);

  // Ball & Paddle state
  const paddleRef = useRef({ x: 130, w: 60, h: 10 });
  const ballRef = useRef({ x: 160, y: 240, vx: 3, vy: -3, radius: 5 });
  const bricksRef = useRef<Brick[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const initBricks = () => {
    const list: Brick[] = [];
    const colors = ['#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#a855f7'];
    const rows = 5;
    const cols = 6;
    const bw = 46;
    const bh = 14;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({
          x: 16 + c * (bw + 6),
          y: 30 + r * (bh + 6),
          w: bw,
          h: bh,
          color: colors[r],
          points: (rows - r) * 20,
          destroyed: false,
        });
      }
    }
    bricksRef.current = list;
  };

  const startGame = () => {
    sounds.playPop();
    setScore(0);
    setLives(3);
    setGameOver(false);
    paddleRef.current = { x: 130, w: 60, h: 10 };
    ballRef.current = { x: 160, y: 240, vx: (Math.random() > 0.5 ? 3 : -3), vy: -3.5, radius: 5 };
    initBricks();
    setIsPlaying(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    paddleRef.current.x = Math.max(0, Math.min(rect.width - paddleRef.current.w, mouseX - paddleRef.current.w / 2));
  };

  // Main Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      ctx.fillStyle = '#05020c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (isPlaying && !gameOver) {
        const ball = ballRef.current;
        const paddle = paddleRef.current;

        // Move Ball
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall collisions
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
          ball.vx *= -1;
          sounds.playPop();
        }
        if (ball.y - ball.radius < 0) {
          ball.vy *= -1;
          sounds.playPop();
        }

        // Floor collision (Lose Life)
        if (ball.y + ball.radius > canvas.height) {
          sounds.playGlitch();
          setLives(l => {
            const nl = l - 1;
            if (nl <= 0) {
              setGameOver(true);
              setIsPlaying(false);
              triggerConfetti();
              toast.success('Breakout Concluded! Score saved to National Leaderboard.');
            } else {
              ball.x = 160;
              ball.y = 220;
              ball.vy = -3.5;
            }
            return nl;
          });
        }

        // Paddle Collision
        if (
          ball.y + ball.radius >= canvas.height - 24 &&
          ball.y - ball.radius <= canvas.height - 14 &&
          ball.x >= paddle.x &&
          ball.x <= paddle.x + paddle.w
        ) {
          sounds.playPop();
          ball.vy = -Math.abs(ball.vy);
          // Angle modifier
          const hitPos = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
          ball.vx = hitPos * 4.5;
        }

        // Brick Collisions
        let remainingBricks = 0;
        bricksRef.current.forEach((b) => {
          if (!b.destroyed) {
            remainingBricks++;
            // Check collision with brick box
            if (
              ball.x + ball.radius > b.x &&
              ball.x - ball.radius < b.x + b.w &&
              ball.y + ball.radius > b.y &&
              ball.y - ball.radius < b.y + b.h
            ) {
              b.destroyed = true;
              ball.vy *= -1;
              sounds.playPop();
              setScore(s => {
                const ns = s + b.points;
                if (ns > highScore) setHighScore(ns);
                return ns;
              });
            }

            // Draw Brick
            ctx.fillStyle = b.color;
            ctx.shadowBlur = 4;
            ctx.shadowColor = b.color;
            ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.shadowBlur = 0;
          }
        });

        // Check if all bricks cleared
        if (remainingBricks === 0) {
          triggerConfetti();
          sounds.playChime();
          toast.success('🎉 Grid Fully Cleared! Spawning Quantum Brick Wave!');
          initBricks();
        }

        // Draw Paddle
        ctx.fillStyle = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#06b6d4';
        ctx.fillRect(paddle.x, canvas.height - 20, paddle.w, paddle.h);
        ctx.shadowBlur = 0;

        // Draw Ball
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    loop();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, gameOver, highScore]);

  return (
    <div className="surface-1 rounded-3xl p-6 border border-border/40 font-sans shadow-xl max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              Cyber Brick Breaker Bharat Blitz
            </h3>
            <p className="text-xs text-muted-foreground font-mono">Neon Multi-Color Grid Breakout & Multipliers</p>
          </div>
        </div>

        <div className="text-right font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[0.62rem]">Top Score</div>
          <div className="font-bold text-amber-400">{highScore} Pts</div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-muted/40 border border-border/40 mb-4 text-center font-mono text-xs">
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Current Score</span>
          <span className="font-display font-black text-xl text-primary">{score}</span>
        </div>
        <div>
          <span className="text-muted-foreground uppercase text-[0.6rem] block">Shield Lives</span>
          <span className="font-display font-black text-xl text-rose-500">{'❤️ '.repeat(lives)}</span>
        </div>
      </div>

      {/* 320x320 Canvas Screen */}
      <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-black flex items-center justify-center mb-4">
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          onMouseMove={handleMouseMove}
          className="w-full max-w-[320px] h-[320px] block cursor-none"
        />

        {!isPlaying && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            {gameOver ? (
              <>
                <Trophy className="w-10 h-10 text-amber-400 mb-2 animate-bounce" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Game Over!</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Final Score: {score} Pts (+{Math.round(score / 5)} Karma)</p>
              </>
            ) : (
              <>
                <Zap className="w-10 h-10 text-cyan-400 mb-2" />
                <h4 className="font-display font-bold text-lg text-white mb-1">Cyber Breakout</h4>
                <p className="text-xs text-zinc-400 mb-4 font-mono">Move mouse / finger across screen to steer paddle!</p>
              </>
            )}

            <Button
              onClick={startGame}
              className="rounded-2xl font-bold text-xs h-11 px-6 bg-pink-500 hover:bg-pink-600 text-white glow-neon-primary shadow-lg"
            >
              <Play className="w-4 h-4 mr-1.5 fill-white" /> {gameOver ? 'Play Again' : 'Engage Breakout'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
