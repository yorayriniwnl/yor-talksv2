import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Plane
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface LaserGate {
  x: number;
  topHeight: number;
  gapSize: number;
  passed: boolean;
}

export default function FlappyDrone() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(34);

  const dronePos = useRef({ y: 240, vy: 0 });
  const gatesRef = useRef<LaserGate[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const jump = () => {
    if (gameState !== 'playing') return;
    dronePos.current.vy = -6.5; // Jump thrust
    uiaudio.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    dronePos.current = { y: 240, vy: 0 };
    gatesRef.current = [
      { x: 500, topHeight: 140, gapSize: 130, passed: false },
      { x: 750, topHeight: 180, gapSize: 130, passed: false },
      { x: 1000, topHeight: 100, gapSize: 130, passed: false },
    ];
  };

  // Flappy Drone Physics & Laser Gate Collision Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const d = dronePos.current;

      // Gravity & Velocity
      d.vy += 0.28;
      d.y += d.vy;

      // Floor & Ceiling Collision
      if (d.y < 20 || d.y > canvas.height - 20) {
        uiaudio.error();
        setGameState('gameover');
        setHighScore(h => Math.max(h, score));
      }

      // Update Laser Gates
      gatesRef.current.forEach((gate) => {
        gate.x -= 3.2;

        // Check Score
        if (!gate.passed && gate.x < 140) {
          gate.passed = true;
          uiaudio.success();
          setScore(s => s + 1);
        }

        // Check Collision with Laser Top or Bottom Barrier
        if (gate.x < 170 && gate.x > 110) {
          if (d.y - 12 < gate.topHeight || d.y + 12 > gate.topHeight + gate.gapSize) {
            uiaudio.error();
            setGameState('gameover');
            setHighScore(h => Math.max(h, score));
          }
        }
      });

      // Respawn Gates
      if (gatesRef.current[0] && gatesRef.current[0].x < -60) {
        gatesRef.current.shift();
        const lastX = gatesRef.current[gatesRef.current.length - 1].x;
        gatesRef.current.push({
          x: lastX + 250,
          topHeight: Math.random() * 180 + 60,
          gapSize: 130,
          passed: false,
        });
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Cyber Sky
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Laser Gates (Cyan/Pink Neon Columns)
      gatesRef.current.forEach((gate) => {
        // Top Laser Barrier
        ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 15;
        ctx.fillRect(gate.x, 0, 40, gate.topHeight);
        ctx.strokeRect(gate.x, 0, 40, gate.topHeight);

        // Bottom Laser Barrier
        const botY = gate.topHeight + gate.gapSize;
        ctx.fillRect(gate.x, botY, 40, canvas.height - botY);
        ctx.strokeRect(gate.x, botY, 40, canvas.height - botY);
        ctx.shadowBlur = 0;
      });

      // Draw Cyber Drone (Emerald Quadcopter)
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(140, d.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Rotor Blades
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(120, d.y - 8); ctx.lineTo(160, d.y - 8);
      ctx.stroke();

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Plane className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              FLAPPY DRONE // 3D LASER GATE GLIDE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Gravity lift navigation & neon barrier clearance for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* High Score */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BEST GATES:</span>
            <span className="text-amber-300 font-bold">{highScore}</span>
          </div>
        </div>
      </div>

      {/* Arena Stage */}
      <div 
        onClick={jump}
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black cursor-pointer select-none"
      >
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
              <span className="text-zinc-400">GATES CLEARED: </span>
              <span className="font-bold text-base text-emerald-300">{score}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [SPACE] / CLICK TO THRUST
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
                  {gameState === 'gameover' ? 'LASER COLLISION - GAME OVER' : 'FLAPPY DRONE 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Navigate through continuous neon laser barrier gates with precision vertical thrust!
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startGame();
                }}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>LAUNCH DRONE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
