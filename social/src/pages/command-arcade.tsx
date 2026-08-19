import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Icbm {
  startX: number;
  x: number;
  y: number;
  targetX: number;
  speed: number;
  alive: boolean;
}

interface Shockwave {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alive: boolean;
}

export default function CommandArcade() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [citiesLeft, setCitiesLeft] = useState(6);
  const [missilesLeft, setMissilesLeft] = useState(30);
  const [highScore, setHighScore] = useState(84500);

  const crosshairPos = useRef({ x: 370, y: 200 });
  const icbmsRef = useRef<Icbm[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireInterceptorFlak = (targetX: number, targetY: number) => {
    if (gameState !== 'playing' || missilesLeft <= 0) return;
    shockwavesRef.current.push({
      x: targetX,
      y: targetY,
      r: 4,
      maxR: 35,
      alive: true,
    });
    setMissilesLeft(m => m - 1);
    uiaudio.warp();
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    fireInterceptorFlak(clickX, clickY);
  };

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setCitiesLeft(6);
    setMissilesLeft(30);
    shockwavesRef.current = [];
    icbmsRef.current = [
      { startX: 120, x: 120, y: 0, targetX: 140, speed: 1.2, alive: true },
      { startX: 280, x: 280, y: 0, targetX: 240, speed: 1.5, alive: true },
      { startX: 460, x: 460, y: 0, targetX: 520, speed: 1.1, alive: true },
      { startX: 620, x: 620, y: 0, targetX: 600, speed: 1.4, alive: true },
    ];
  };

  // Missile Command Planetary Defense Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;

      // Update Flak Shockwaves
      shockwavesRef.current.forEach((sw) => {
        if (sw.alive) {
          sw.r += 1.5;
          if (sw.r >= sw.maxR) sw.alive = false;
        }
      });
      shockwavesRef.current = shockwavesRef.current.filter(sw => sw.alive);

      // Spawn Random MIRV Warheads
      if (frame % 80 === 0 && icbmsRef.current.length < 8) {
        icbmsRef.current.push({
          startX: Math.random() * (canvas.width - 100) + 50,
          x: Math.random() * (canvas.width - 100) + 50,
          y: 0,
          targetX: Math.random() * (canvas.width - 160) + 80,
          speed: Math.random() * 0.8 + 1.2,
          alive: true,
        });
      }

      // Update & Intercept ICBMs
      icbmsRef.current.forEach((icbm) => {
        if (icbm.alive) {
          icbm.y += icbm.speed;
          const progress = icbm.y / (canvas.height - 40);
          icbm.x = icbm.startX + (icbm.targetX - icbm.startX) * progress;

          // Check Hit by Shockwave
          shockwavesRef.current.forEach((sw) => {
            if (sw.alive && Math.hypot(icbm.x - sw.x, icbm.y - sw.y) <= sw.r) {
              icbm.alive = false;
              setScore(s => s + 250);
              uiaudio.success();
            }
          });

          // Check Ground Impact (City Destroyed)
          if (icbm.y >= canvas.height - 40) {
            icbm.alive = false;
            setCitiesLeft(c => {
              const nc = c - 1;
              if (nc <= 0) {
                uiaudio.error();
                setGameState('gameover');
                setHighScore(h => Math.max(h, score));
              }
              return Math.max(0, nc);
            });
            uiaudio.error();
          }
        }
      });

      icbmsRef.current = icbmsRef.current.filter(icbm => icbm.alive);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Night Defense Sky
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground Surface & 6 Planetary Mega-Cities (Cyan / Blue Skylines)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

      // 6 Cities
      for (let i = 0; i < citiesLeft; i++) {
        const cx = 80 + i * 110;
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 8;
        ctx.fillRect(cx - 16, canvas.height - 55, 32, 15);
        ctx.shadowBlur = 0;
      }

      // 3 Laser Flak Launch Batteries (Left, Center, Right)
      [40, canvas.width / 2, canvas.width - 40].forEach((bx) => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(bx - 18, canvas.height - 40);
        ctx.lineTo(bx, canvas.height - 65);
        ctx.lineTo(bx + 18, canvas.height - 40);
        ctx.closePath();
        ctx.fill();
      });

      // Draw Incoming ICBM Red Streak Trajectories
      icbmsRef.current.forEach((icbm) => {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(icbm.startX, 0);
        ctx.lineTo(icbm.x, icbm.y);
        ctx.stroke();

        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(icbm.x, icbm.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Expanding Flak Interceptor Shockwaves (Golden & Cyan Rings)
      shockwavesRef.current.forEach((sw) => {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, citiesLeft]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              MISSILE COMMAND // 3D ORBITAL SHIELD DEFENDER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Planetary mega-city protection, flak shockwave timing & ICBM interception for {currentUser?.name}
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
          width={740}
          height={480}
          onClick={handleCanvasClick}
          className="w-full h-auto block"
        />

        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">CITIES: </span>
                <span className="font-bold text-base text-cyan-300">{citiesLeft} / 6</span>
              </div>
              <div>
                <span className="text-zinc-400">AMMO: </span>
                <span className="font-bold text-amber-400">{missilesLeft}</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [CLICK] DETONATE FLAK INTERCEPTOR AT CURSOR
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
                  {gameState === 'gameover' ? 'ALL CITIES LOST - DEFENSE BREACHED!' : 'MISSILE COMMAND 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Click anywhere in the sky to detonate expanding flak shockwaves and intercept incoming nuclear MIRV ballistic missiles before they destroy your 6 cities!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>COMMENCE DEFENSE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
