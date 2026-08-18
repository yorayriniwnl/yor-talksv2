import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  points: number;
  alive: boolean;
}

export default function NeonBreakout() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'won'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(38400);
  const [lives, setLives] = useState(3);

  const ballRef = useRef({ x: 370, y: 380, vx: 4, vy: -5, radius: 6 });
  const paddleRef = useRef({ x: 320, w: 100, h: 12 });
  const bricksRef = useRef<Brick[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const initBricks = () => {
    const b: Brick[] = [];
    const rows = 5;
    const cols = 10;
    const brickW = 64;
    const brickH = 18;
    const colors = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        b.push({
          x: 45 + c * (brickW + 6),
          y: 40 + r * (brickH + 6),
          w: brickW,
          h: brickH,
          color: colors[r],
          points: (5 - r) * 100,
          alive: true,
        });
      }
    }
    bricksRef.current = b;
  };

  useEffect(() => {
    initBricks();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setLives(3);
    initBricks();
    ballRef.current = { x: 370, y: 380, vx: 4, vy: -5, radius: 6 };
    paddleRef.current = { x: 320, w: 100, h: 12 };
  };

  // Breakout Game Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const b = ballRef.current;
      const p = paddleRef.current;
      const keys = keysPressed.current;

      // Paddle movement
      if (keys['KeyA'] || keys['ArrowLeft']) p.x = Math.max(20, p.x - 7);
      if (keys['KeyD'] || keys['ArrowRight']) p.x = Math.min(canvas.width - p.w - 20, p.x + 7);

      // Ball Movement
      b.x += b.vx;
      b.y += b.vy;

      // Wall Bounce
      if (b.x < b.radius || b.x > canvas.width - b.radius) {
        b.vx = -b.vx;
        uiaudio.hover();
      }
      if (b.y < b.radius) {
        b.vy = -b.vy;
        uiaudio.hover();
      }

      // Paddle Collision
      if (b.y + b.radius >= canvas.height - 40 && b.y - b.radius <= canvas.height - 28) {
        if (b.x >= p.x && b.x <= p.x + p.w) {
          uiaudio.click();
          b.vy = -Math.abs(b.vy);
          // Angle deflection based on hit position
          const hitOffset = (b.x - (p.x + p.w / 2)) / (p.w / 2);
          b.vx = hitOffset * 6;
        }
      }

      // Brick Collision
      bricksRef.current.forEach((brick) => {
        if (!brick.alive) return;
        if (b.x > brick.x && b.x < brick.x + brick.w && b.y > brick.y && b.y < brick.y + brick.h) {
          brick.alive = false;
          b.vy = -b.vy;
          uiaudio.success();
          setScore(s => s + brick.points);
        }
      });

      // Ball Bottom Out
      if (b.y > canvas.height + 20) {
        uiaudio.error();
        setLives(l => {
          const next = l - 1;
          if (next <= 0) {
            setGameState('gameover');
            setHighScore(h => Math.max(h, score));
          } else {
            // Respawn ball
            ballRef.current = { x: 370, y: 380, vx: 4, vy: -5, radius: 6 };
          }
          return Math.max(0, next);
        });
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Arcade Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Bricks
      bricksRef.current.forEach((brick) => {
        if (!brick.alive) return;
        ctx.fillStyle = brick.color;
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 4);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Plasma Paddle
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(p.x, canvas.height - 40, p.w, p.h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Glowing Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Zap className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-400">
              NEON BREAKOUT // 2077 BRICK BREAKER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              60 FPS physics-based plasma paddle brick breaker for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* High Score */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3 py-2 rounded-xl border border-white/10 flex items-center space-x-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BEST:</span>
            <span className="text-amber-300 font-bold">{highScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Breakout Canvas Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
              <span className="text-zinc-400">SCORE: </span>
              <span className="font-bold text-base text-white">{score.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
              <span className="text-zinc-400">SHIELDS: </span>
              <span className="font-bold text-base text-cyan-400">{'❤️ '.repeat(lives)}</span>
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'playing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-400 to-cyan-400">
                  NEON BREAKOUT
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Use [A] / [D] or Left / Right Arrows to control your plasma paddle and deflect the ball!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH PLASMA BALL</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
