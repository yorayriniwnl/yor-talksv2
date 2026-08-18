import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, Pause, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface Bumper {
  x: number;
  y: number;
  radius: number;
  color: string;
  points: number;
}

export default function CyberPinball() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(94200);
  const [ballsLeft, setBallsLeft] = useState(3);
  const [multiplier, setMultiplier] = useState(1);

  const ballRef = useRef<Ball>({ x: 420, y: 500, vx: 0, vy: -14, radius: 8 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const bumpers: Bumper[] = [
    { x: 200, y: 150, radius: 26, color: '#ec4899', points: 500 },
    { x: 300, y: 120, radius: 30, color: '#06b6d4', points: 1000 },
    { x: 250, y: 220, radius: 24, color: '#f59e0b', points: 300 },
    { x: 140, y: 260, radius: 20, color: '#10b981', points: 250 },
    { x: 360, y: 260, radius: 20, color: '#a855f7', points: 250 },
  ];

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
    setBallsLeft(3);
    setMultiplier(1);
    ballRef.current = { x: 420, y: 500, vx: -2, vy: -15, radius: 8 };
  };

  // Pinball Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const b = ballRef.current;
      const keys = keysPressed.current;

      // Gravity
      b.vy += 0.25;

      // Velocity Clamp
      b.vx = Math.max(-16, Math.min(16, b.vx));
      b.vy = Math.max(-18, Math.min(18, b.vy));

      b.x += b.vx;
      b.y += b.vy;

      // Side Walls Collision
      if (b.x < 60) { b.x = 60; b.vx = -b.vx * 0.85; uiaudio.hover(); }
      if (b.x > 440) { b.x = 440; b.vx = -b.vx * 0.85; uiaudio.hover(); }
      if (b.y < 40) { b.y = 40; b.vy = -b.vy * 0.85; uiaudio.hover(); }

      // Bumper Collision
      bumpers.forEach(bm => {
        const dist = Math.hypot(b.x - bm.x, b.y - bm.y);
        if (dist < b.radius + bm.radius) {
          uiaudio.click();
          const angle = Math.atan2(b.y - bm.y, b.x - bm.x);
          b.vx = Math.cos(angle) * 12;
          b.vy = Math.sin(angle) * 12;
          setScore(s => s + bm.points * multiplier);
        }
      });

      // Left / Right Flippers
      const leftFlipperActive = keys['KeyA'] || keys['ArrowLeft'];
      const rightFlipperActive = keys['KeyD'] || keys['ArrowRight'];

      // Left Flipper Area Check
      if (b.y > 480 && b.y < 520 && b.x > 100 && b.x < 220) {
        if (leftFlipperActive) {
          uiaudio.warp();
          b.vy = -14;
          b.vx = (b.x - 160) * 0.15;
          setScore(s => s + 100);
        }
      }

      // Right Flipper Area Check
      if (b.y > 480 && b.y < 520 && b.x > 260 && b.x < 380) {
        if (rightFlipperActive) {
          uiaudio.warp();
          b.vy = -14;
          b.vx = (b.x - 320) * 0.15;
          setScore(s => s + 100);
        }
      }

      // Ball Drain at Bottom
      if (b.y > canvas.height + 20) {
        uiaudio.error();
        setBallsLeft(bl => {
          const next = bl - 1;
          if (next <= 0) {
            setGameState('gameover');
            setHighScore(h => Math.max(h, score));
          } else {
            // Respawn
            ballRef.current = { x: 420, y: 500, vx: -2, vy: -15, radius: 8 };
          }
          return Math.max(0, next);
        });
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Pinball Table Playfield Background
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Table Boundary Rails
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(50, canvas.height);
      ctx.lineTo(50, 50);
      ctx.lineTo(450, 50);
      ctx.lineTo(450, canvas.height);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Bumpers
      bumpers.forEach(bm => {
        ctx.fillStyle = bm.color;
        ctx.shadowColor = bm.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(bm.x, bm.y, bm.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw Flippers
      // Left Flipper
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 10;
      ctx.save();
      ctx.translate(140, 500);
      ctx.rotate(leftFlipperActive ? -0.45 : 0.35);
      ctx.fillRect(-10, -6, 80, 12);
      ctx.restore();

      // Right Flipper
      ctx.save();
      ctx.translate(340, 500);
      ctx.rotate(rightFlipperActive ? 0.45 : -0.35);
      ctx.fillRect(-70, -6, 80, 12);
      ctx.restore();
      ctx.shadowBlur = 0;

      // Draw Chrome Pinball
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
  }, [gameState, score, multiplier]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-2xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Zap className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
              CYBER PINBALL 2077 // NEON ARCADE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Classic arcade pinball physics & combo bumpers for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* High Score HUD */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3 py-2 rounded-xl border border-white/10 flex items-center space-x-1.5">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BEST:</span>
            <span className="text-amber-300 font-bold">{highScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Pinball Table Stage */}
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={500}
          height={600}
          className="w-full h-auto block"
        />

        {/* In-Game HUD */}
        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 space-y-1">
              <div className="text-[10px] text-zinc-400">SCORE</div>
              <div className="text-xl font-bold text-white">{score.toLocaleString()}</div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-right">
              <div className="text-[10px] text-zinc-400">BALLS REMAINING</div>
              <div className="text-sm font-bold text-cyan-400">{'⚪ '.repeat(ballsLeft)}</div>
            </div>
          </div>
        )}

        {/* Start / Gameover Overlays */}
        <AnimatePresence>
          {gameState !== 'playing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400">
                  CYBER PINBALL
                </h2>
                <p className="text-sm text-zinc-400 max-w-xs font-mono">
                  Use [A] / [Left Arrow] for Left Flipper, and [D] / [Right Arrow] for Right Flipper!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
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
