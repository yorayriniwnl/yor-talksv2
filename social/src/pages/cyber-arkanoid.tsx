import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass
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
  alive: boolean;
  pts: number;
}

export default function CyberArkanoid() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(98400);

  const paddleRef = useRef({ x: 370, w: 100 });
  const ballRef = useRef({ x: 370, y: 380, vx: 4, vy: -5, r: 6 });
  const bricksRef = useRef<Brick[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const initBricks = () => {
    const b: Brick[] = [];
    const colors = ['#f43f5e', '#f59e0b', '#06b6d4', '#10b981', '#a855f7'];
    const rows = 5;
    const cols = 9;
    const bw = 65;
    const bh = 22;
    const offsetX = 75;
    const offsetY = 70;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        b.push({
          x: offsetX + c * (bw + 8),
          y: offsetY + r * (bh + 8),
          w: bw,
          h: bh,
          color: colors[r % colors.length],
          alive: true,
          pts: (5 - r) * 100,
        });
      }
    }
    bricksRef.current = b;
  };

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
    paddleRef.current = { x: 370, w: 100 };
    ballRef.current = { x: 370, y: 380, vx: (Math.random() > 0.5 ? 4 : -4), vy: -5, r: 6 };
    initBricks();
  };

  // Arkanoid Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const p = paddleRef.current;
      const b = ballRef.current;
      const keys = keysPressed.current;

      // Paddle Movement
      if (keys['KeyA'] || keys['ArrowLeft']) p.x -= 7;
      if (keys['KeyD'] || keys['ArrowRight']) p.x += 7;
      p.x = Math.max(p.w / 2 + 20, Math.min(canvas.width - p.w / 2 - 20, p.x));

      // Ball Velocity
      b.x += b.vx;
      b.y += b.vy;

      // Wall Collisions
      if (b.x - b.r < 40 || b.x + b.r > canvas.width - 40) {
        b.vx = -b.vx;
        uiaudio.hover();
      }
      if (b.y - b.r < 40) {
        b.vy = -b.vy;
        uiaudio.hover();
      }

      // Paddle Collision
      if (b.y + b.r >= 430 && b.y - b.r <= 440) {
        if (b.x >= p.x - p.w / 2 && b.x <= p.x + p.w / 2) {
          const hitOffset = (b.x - p.x) / (p.w / 2);
          b.vx = hitOffset * 6;
          b.vy = -Math.abs(b.vy);
          uiaudio.click();
        }
      }

      // Brick Collisions
      bricksRef.current.forEach((brk) => {
        if (brk.alive) {
          if (b.x >= brk.x && b.x <= brk.x + brk.w && b.y >= brk.y && b.y <= brk.y + brk.h) {
            brk.alive = false;
            b.vy = -b.vy;
            uiaudio.success();
            setScore(sc => sc + brk.pts);
          }
        }
      });

      // Bottom Drain
      if (b.y > canvas.height + 20) {
        uiaudio.error();
        setGameState('gameover');
        setHighScore(h => Math.max(h, score));
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Neon Matrix Table
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Border Walls
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height);

      // Draw Bricks
      bricksRef.current.forEach((brk) => {
        if (brk.alive) {
          ctx.fillStyle = brk.color;
          ctx.shadowColor = brk.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.roundRect(brk.x, brk.y, brk.w, brk.h, 4);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Laser Paddle
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(p.x - p.w / 2, 430, p.w, 14, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Plasma Ball
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Zap className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              PLASMA ARKANOID // 3D BRICK BREAKER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Dual laser paddle & chain reaction plasma demolition for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* High Score */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BEST:</span>
            <span className="text-amber-300 font-bold">{highScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Arkanoid Canvas Stage */}
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

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [A/D] OR ARROWS TO MOVE PADDLE
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  PLASMA ARKANOID
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Move your laser paddle left and right to bounce the plasma ball and demolish all quantum security bricks!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
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
