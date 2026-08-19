import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Alien {
  x: number;
  y: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export default function GorfFleet() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(74800);

  const playerPos = useRef({ x: 370, y: 420 });
  const motherShipHP = useRef(8);
  const aliensRef = useRef<Alien[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireLaser = () => {
    if (gameState !== 'playing') return;
    const p = playerPos.current;
    bulletsRef.current.push({
      x: p.x,
      y: p.y - 12,
      vx: 0,
      vy: -10,
      life: 50,
    });
    uiaudio.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const p = playerPos.current;
      const step = 9;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') p.x = Math.max(40, p.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') p.x = Math.min(700, p.x + step);
      if (e.code === 'Space') fireLaser();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    motherShipHP.current = 8;
    playerPos.current = { x: 370, y: 420 };
    bulletsRef.current = [];
    aliensRef.current = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        aliensRef.current.push({
          x: 140 + c * 65,
          y: 80 + r * 40,
          alive: true,
        });
      }
    }
  };

  // Gorf Space Fleet Battle Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const p = playerPos.current;

      // Alien Movement Pattern
      aliensRef.current.forEach((a) => {
        if (a.alive) {
          a.x += Math.sin(frame * 0.05) * 1.5;
        }
      });

      // Update Bullets
      bulletsRef.current.forEach((b) => {
        b.y += b.vy;
        b.life -= 1;

        // Check Hit Aliens
        aliensRef.current.forEach((a) => {
          if (a.alive && Math.hypot(b.x - a.x, b.y - a.y) < 18) {
            a.alive = false;
            b.life = 0;
            uiaudio.success();
            setScore(s => s + 150);
          }
        });
      });

      bulletsRef.current = bulletsRef.current.filter(b => b.life > 0);

      // Check all aliens cleared -> Victory
      if (aliensRef.current.every(a => !a.alive)) {
        uiaudio.success();
        setGameState('victory');
        setHighScore(h => Math.max(h, score + 10000));
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Gorf Invaders (Yellow/Magenta Cyber Swarm)
      aliensRef.current.forEach((a) => {
        if (a.alive) {
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(a.x, a.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Player Interceptor (Cyan Space Fighter)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 14);
      ctx.lineTo(p.x - 14, p.y + 10);
      ctx.lineTo(p.x + 14, p.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Bullets (Cyan Laser Bolts)
      bulletsRef.current.forEach((b) => {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
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
            <Target className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              GORF // 3D SPACE FLEET FLAGSHIP BUSTER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              5-mission galactic defense & Mother Ship flagship annihilation for {currentUser?.name}
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
              <span className="font-bold text-base text-cyan-300">{score.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [A/D] MOVE INTERCEPTOR, [SPACE] RAPID FIRE
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
                  {gameState === 'victory' ? 'GORF FLEET DESTROYED - VICTORY!' : 'GORF 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Eliminate all 24 alien invaders in the Astro Battle sector before they descend past your defense line!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH INTERCEPTOR</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
