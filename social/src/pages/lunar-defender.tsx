import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Explosion {
  x: number;
  y: number;
  r: number;
  maxR: number;
}

export default function LunarDefender() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(62400);
  const [shieldHealth, setShieldHealth] = useState(100);

  const meteorsRef = useRef<Meteor[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Fire Anti-Orbital Flak Shell
    uiaudio.click();
    explosionsRef.current.push({
      x: clickX,
      y: clickY,
      r: 2,
      maxR: 35,
    });
  };

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setShieldHealth(100);
    meteorsRef.current = [];
    explosionsRef.current = [];
  };

  // Lunar Defender Arcade Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;

      // Spawn Meteors
      if (frame % 35 === 0) {
        meteorsRef.current.push({
          x: Math.random() * (canvas.width - 100) + 50,
          y: 0,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 2.2 + 1.8,
          r: 6,
        });
      }

      // Update Meteors
      meteorsRef.current.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;

        // Check Hit Ground / Base (y > 420)
        if (m.y >= 420) {
          uiaudio.error();
          setShieldHealth(h => {
            const next = Math.max(0, h - 20);
            if (next <= 0) {
              setGameState('gameover');
              setHighScore(prev => Math.max(prev, score));
            }
            return next;
          });
        }
      });

      // Update Explosions
      explosionsRef.current.forEach((exp) => {
        exp.r += 1.8;

        // Check Meteor Interception
        meteorsRef.current.forEach((m) => {
          const dist = Math.hypot(m.x - exp.x, m.y - exp.y);
          if (dist < exp.r + m.r) {
            // Destroyed
            m.y = 999;
            uiaudio.success();
            setScore(s => s + 100);
          }
        });
      });

      // Filter Inactive
      meteorsRef.current = meteorsRef.current.filter(m => m.y < 420);
      explosionsRef.current = explosionsRef.current.filter(exp => exp.r < exp.maxR);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Lunar Space
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Lunar Surface Regolith (Grey Rocky Ground at bottom)
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 420, canvas.width, 60);

      // Neon Lunar Colony Domes (Cyan Hemispheres)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(150, 420, 30, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(370, 420, 40, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(590, 420, 30, Math.PI, 0); ctx.fill(); ctx.stroke();

      // Draw Meteors (Flaming Red/Orange Streaks)
      meteorsRef.current.forEach((m) => {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Trail
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 10, m.y - m.vy * 10);
        ctx.stroke();
      });

      // Draw Flak Explosions (Expanding Cyan/Pink Rings)
      explosionsRef.current.forEach((exp) => {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(exp.x, exp.y, exp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

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
            <Crosshair className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              LUNAR DEFENDER // 3D SURFACE MISSILE FLAK BATTERY
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Orbital meteorite flak interception & colony base protection for {currentUser?.name}
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

      {/* Arena Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black cursor-crosshair">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-3">
              <span className="text-zinc-400">SCORE: <strong className="text-cyan-300 text-sm">{score.toLocaleString()}</strong></span>
              <span className="text-zinc-400">SHIELD: <strong className="text-emerald-400 text-sm">{shieldHealth}%</strong></span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              CLICK TO DETONATE FLAK SHELLS
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
                  {gameState === 'gameover' ? 'COLONY DESTROYED - GAME OVER' : 'LUNAR DEFENDER'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Intercept incoming atmospheric meteorites by timing expanding anti-orbital flak shockwaves!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ARM FLAK BATTERY</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
