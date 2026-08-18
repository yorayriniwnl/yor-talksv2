import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Gate {
  y: number;
  leftX: number;
  rightX: number;
  passed: boolean;
}

export default function SkiRacer() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [bestTime, setBestTime] = useState(19.4);
  const [speedKmh, setSpeedKmh] = useState(95);

  const skierRef = useRef({ x: 370, vx: 0 });
  const gatesRef = useRef<Gate[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const initGates = () => {
    const g: Gate[] = [];
    for (let i = 0; i < 15; i++) {
      const centerX = 200 + Math.random() * 340;
      g.push({
        y: -i * 200 - 300,
        leftX: centerX - 60,
        rightX: centerX + 60,
        passed: false,
      });
    }
    gatesRef.current = g;
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
    skierRef.current = { x: 370, vx: 0 };
    initGates();
  };

  // Alpine Slalom Downhill Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = skierRef.current;
      const keys = keysPressed.current;

      // Carving Steering
      if (keys['KeyA'] || keys['ArrowLeft']) s.vx -= 0.5;
      if (keys['KeyD'] || keys['ArrowRight']) s.vx += 0.5;

      s.vx *= 0.94;
      s.x += s.vx;
      s.x = Math.max(60, Math.min(canvas.width - 60, s.x));

      // Scroll Gates Downwards
      gatesRef.current.forEach((gate) => {
        gate.y += 6; // Downhill speed
        if (!gate.passed && gate.y >= 380 && gate.y <= 420) {
          if (s.x >= gate.leftX && s.x <= gate.rightX) {
            gate.passed = true;
            uiaudio.success();
            setScore(sc => sc + 250);
          }
        }
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Neon Glacier Mountain Ground
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Slalom Ski Slope Perspective Lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 2;
      for (let x = 60; x <= canvas.width - 60; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Draw Slalom Gates (Poles & Flags)
      gatesRef.current.forEach((gate) => {
        if (gate.y > -50 && gate.y < canvas.height + 50) {
          // Left Red Pole
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.fillRect(gate.leftX - 4, gate.y - 20, 8, 40);

          // Right Blue Pole
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.fillRect(gate.rightX - 4, gate.y - 20, 8, 40);
          ctx.shadowBlur = 0;

          // Gate Banner String
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(gate.leftX, gate.y - 15);
          ctx.lineTo(gate.rightX, gate.y - 15);
          ctx.stroke();
        }
      });

      // Draw Neon Skier
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(s.x, 400, 10, 0, Math.PI * 2);
      ctx.fill();

      // Skis
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(s.x - 12, 390, 4, 30);
      ctx.fillRect(s.x + 8, 390, 4, 30);
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Compass className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              CYBER SLALOM // ALPINE NEON SKI RACER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3D-perspective downhill gate carving & powder snow physics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Record */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BEST RECORD:</span>
            <span className="text-amber-300 font-bold">{bestTime}S</span>
          </div>
        </div>
      </div>

      {/* Slalom Canvas Stage */}
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
              <span className="font-bold text-base text-cyan-400">{score.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-emerald-400 font-bold">
              SPEED: {speedKmh} KM/H
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
                  CYBER SLALOM
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Use [A] / [D] or Left / Right Arrows to carve through neon slalom gate pairs!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START ALPINE RUN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
