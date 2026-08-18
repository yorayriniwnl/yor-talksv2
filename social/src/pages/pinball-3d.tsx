import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Pinball3D() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(128400);
  const [multiplier, setMultiplier] = useState(1);

  const ballRef = useRef({ x: 370, y: 200, vx: 3, vy: 4, radius: 7 });
  const flippersRef = useRef({ leftActive: false, rightActive: false });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.code === 'KeyZ' || e.code === 'ArrowLeft') flippersRef.current.leftActive = true;
      if (e.code === 'KeyM' || e.code === 'ArrowRight') flippersRef.current.rightActive = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
      if (e.code === 'KeyZ' || e.code === 'ArrowLeft') flippersRef.current.leftActive = false;
      if (e.code === 'KeyM' || e.code === 'ArrowRight') flippersRef.current.rightActive = false;
    };
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
    setMultiplier(1);
    ballRef.current = { x: 370, y: 150, vx: (Math.random() - 0.5) * 6, vy: 5, radius: 7 };
  };

  // Pinball 3D Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const b = ballRef.current;
      const f = flippersRef.current;

      // Gravity & Velocity
      b.vy += 0.18; // Downwards gravity on tilted table
      b.x += b.vx;
      b.y += b.vy;

      // Wall Collisions
      if (b.x < 120 || b.x > canvas.width - 120) {
        b.vx = -b.vx * 0.85;
        b.x = b.x < 120 ? 121 : canvas.width - 121;
        uiaudio.hover();
      }
      if (b.y < 60) {
        b.vy = -b.vy * 0.85;
        b.y = 61;
        uiaudio.hover();
      }

      // Neon Bumpers (3 Circular Bumpers near top)
      const bumpers = [
        { x: 300, y: 150, r: 24, color: '#f43f5e', pts: 500 },
        { x: 440, y: 150, r: 24, color: '#06b6d4', pts: 500 },
        { x: 370, y: 220, r: 28, color: '#eab308', pts: 1000 },
      ];

      bumpers.forEach((bmp) => {
        const dx = b.x - bmp.x;
        const dy = b.y - bmp.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < bmp.r + b.radius) {
          // Bumper Kickback Impulse
          const nx = dx / dist;
          const ny = dy / dist;
          b.vx = nx * 8;
          b.vy = ny * 8;
          uiaudio.success();
          setScore(s => s + bmp.pts * multiplier);
        }
      });

      // Flipper Collision (Bottom Left & Right)
      if (b.y >= 400 && b.y <= 430) {
        if (b.x >= 240 && b.x <= 340 && f.leftActive) {
          b.vy = -10;
          b.vx = 4;
          uiaudio.click();
          setScore(s => s + 100);
        }
        if (b.x >= 400 && b.x <= 500 && f.rightActive) {
          b.vy = -10;
          b.vx = -4;
          uiaudio.click();
          setScore(s => s + 100);
        }
      }

      // Drain Loss
      if (b.y > canvas.height + 20) {
        uiaudio.error();
        setGameState('gameover');
        setHighScore(h => Math.max(h, score));
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Neon Table
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tilted Table Boundary Outer Lines
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.strokeRect(120, 40, canvas.width - 240, canvas.height - 60);
      ctx.shadowBlur = 0;

      // Draw 3 Bumpers
      bumpers.forEach((bmp) => {
        ctx.fillStyle = bmp.color;
        ctx.shadowColor = bmp.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(bmp.x, bmp.y, bmp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Flippers
      // Left Flipper
      ctx.strokeStyle = f.leftActive ? '#06b6d4' : '#64748b';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(240, 420);
      ctx.lineTo(340, f.leftActive ? 395 : 430);
      ctx.stroke();

      // Right Flipper
      ctx.strokeStyle = f.rightActive ? '#06b6d4' : '#64748b';
      ctx.beginPath();
      ctx.moveTo(500, 420);
      ctx.lineTo(400, f.rightActive ? 395 : 430);
      ctx.stroke();

      // Draw Metallic Pinball
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
  }, [gameState, multiplier, score]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Zap className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400">
              CYBER PINBALL 3D // HOLOGRAPHIC TABLE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Dual flipper arcade physics & vortex bumper chain reaction for {currentUser?.name}
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

      {/* Pinball Stage */}
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
              [Z] LEFT FLIPPER | [M] RIGHT FLIPPER
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-400 to-pink-400">
                  CYBER PINBALL 3D
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Press [Z] / Left Arrow for Left Flipper, and [M] / Right Arrow for Right Flipper!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH BALL</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
