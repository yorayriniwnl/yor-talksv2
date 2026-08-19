import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export default function StarCastle() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(78500);

  const playerAngle = useRef(0);
  const playerDist = useRef(210);
  const shieldAngle = useRef(0);
  const shieldHP = useRef([3, 3, 3, 3, 3, 3, 3, 3]); // 8 shield segments around center
  const bulletsRef = useRef<Bullet[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireLaser = () => {
    if (gameState !== 'playing') return;
    const cx = 370;
    const cy = 240;
    const px = cx + Math.cos(playerAngle.current) * playerDist.current;
    const py = cy + Math.sin(playerAngle.current) * playerDist.current;

    // Fire bullet toward center
    const angleToCenter = Math.atan2(cy - py, cx - px);
    bulletsRef.current.push({
      x: px,
      y: py,
      vx: Math.cos(angleToCenter) * 8.5,
      vy: Math.sin(angleToCenter) * 8.5,
      life: 60,
    });
    uiaudio.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') playerAngle.current -= 0.08;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') playerAngle.current += 0.08;
      if (e.code === 'Space') fireLaser();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    playerAngle.current = 0;
    shieldHP.current = [3, 3, 3, 3, 3, 3, 3, 3];
    bulletsRef.current = [];
  };

  // Star Castle Arcade Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      shieldAngle.current += 0.015;

      // Update Bullets
      bulletsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 1;

        const distToCenter = Math.hypot(b.x - cx, b.y - cy);

        // Check Shield Collision (Radius ~ 90)
        if (distToCenter < 100 && distToCenter > 80) {
          const hitAngle = (Math.atan2(b.y - cy, b.x - cx) - shieldAngle.current + Math.PI * 4) % (Math.PI * 2);
          const segIdx = Math.floor((hitAngle / (Math.PI * 2)) * 8) % 8;

          if (shieldHP.current[segIdx] > 0) {
            shieldHP.current[segIdx]--;
            b.life = 0;
            uiaudio.success();
            setScore(s => s + 50);
          }
        }

        // Check Core Cannon Hit (Radius < 35)
        if (distToCenter <= 35) {
          b.life = 0;
          uiaudio.success();
          setGameState('victory');
          setHighScore(h => Math.max(h, score + 10000));
        }
      });

      bulletsRef.current = bulletsRef.current.filter(b => b.life > 0);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center Hostile Super-Cannon Core (Magenta Skull / Core)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Concentric Rotating Shield Segments (8 segments at Radius 90)
      for (let i = 0; i < 8; i++) {
        if (shieldHP.current[i] > 0) {
          const startA = shieldAngle.current + (i * Math.PI * 2) / 8 + 0.08;
          const endA = shieldAngle.current + ((i + 1) * Math.PI * 2) / 8 - 0.08;

          ctx.strokeStyle = shieldHP.current[i] === 3 ? '#38bdf8' : (shieldHP.current[i] === 2 ? '#f59e0b' : '#ef4444');
          ctx.lineWidth = 6;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(cx, cy, 90, startA, endA);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      // Draw Starfighter Player (Circling at playerDist)
      const px = cx + Math.cos(playerAngle.current) * playerDist.current;
      const py = cy + Math.sin(playerAngle.current) * playerDist.current;

      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Bullets
      bulletsRef.current.forEach((b) => {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
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
              STAR CASTLE // 3D ROTATING SHIELD SUPER-CANNON
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Shield segment penetration & core reactor detonation for {currentUser?.name}
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
              [A/D] TO ORBIT, [SPACE] TO FIRE AT CORE
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
                  {gameState === 'victory' ? 'CORE DETONATED - VICTORY!' : 'STAR CASTLE'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Blast a pathway through the 8 rotating shield segments and hit the red center reactor core!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>COMMENCE ASSAULT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
