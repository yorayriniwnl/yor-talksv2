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

export default function VanguardSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(68900);

  const playerPos = useRef({ x: 100, y: 240 });
  const aliensRef = useRef<Alien[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireLaser = (dx: number, dy: number) => {
    if (gameState !== 'playing') return;
    const p = playerPos.current;
    bulletsRef.current.push({
      x: p.x + 10,
      y: p.y,
      vx: dx * 10,
      vy: dy * 10,
      life: 50,
    });
    uiaudio.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const p = playerPos.current;
      const step = 8;

      if (e.code === 'KeyW') p.y = Math.max(30, p.y - step);
      if (e.code === 'KeyS') p.y = Math.min(450, p.y + step);
      if (e.code === 'KeyA') p.x = Math.max(30, p.x - step);
      if (e.code === 'KeyD') p.x = Math.min(710, p.x + step);

      // 4-Way Laser Firing via Arrow Keys
      if (e.code === 'ArrowRight') fireLaser(1, 0);
      if (e.code === 'ArrowLeft') fireLaser(-1, 0);
      if (e.code === 'ArrowUp') fireLaser(0, -1);
      if (e.code === 'ArrowDown') fireLaser(0, 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    playerPos.current = { x: 100, y: 240 };
    bulletsRef.current = [];
    aliensRef.current = [
      { x: 400, y: 100, alive: true },
      { x: 550, y: 160, alive: true },
      { x: 450, y: 240, alive: true },
      { x: 600, y: 320, alive: true },
      { x: 500, y: 400, alive: true },
    ];
  };

  // Vanguard 8-Way Scrolling Tunnel Physics Loop
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
          a.x -= 1.8;
          a.y += Math.sin(frame * 0.08 + a.x * 0.01) * 2;
          if (a.x < 20) a.x = canvas.width - 40;
        }
      });

      // Update Bullets
      bulletsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 1;

        // Check Hit Alien
        aliensRef.current.forEach((a) => {
          if (a.alive && Math.hypot(b.x - a.x, b.y - a.y) < 18) {
            a.alive = false;
            b.life = 0;
            uiaudio.success();
            setScore(s => s + 250);
          }
        });
      });

      bulletsRef.current = bulletsRef.current.filter(b => b.life > 0);

      // Check all aliens cleared -> Victory
      if (aliensRef.current.every(a => !a.alive)) {
        uiaudio.success();
        setGameState('victory');
        setHighScore(h => Math.max(h, score + 8000));
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Tunnel Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Scrolling Neon Mountain Zone Terrain (Top & Bottom)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Top jagged mountain
      ctx.moveTo(0, 40);
      for (let x = 0; x <= canvas.width; x += 50) {
        ctx.lineTo(x, 40 + Math.sin((x + frame * 4) * 0.03) * 20);
      }
      ctx.stroke();

      ctx.beginPath();
      // Bottom jagged mountain
      ctx.moveTo(0, canvas.height - 40);
      for (let x = 0; x <= canvas.width; x += 50) {
        ctx.lineTo(x, canvas.height - 40 - Math.sin((x + frame * 4) * 0.03) * 20);
      }
      ctx.stroke();

      // Draw Alien Droids (Golden Saucers)
      aliensRef.current.forEach((a) => {
        if (a.alive) {
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(a.x, a.y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Starfighter Ship (Cyan Delta Jet)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(p.x + 14, p.y);
      ctx.lineTo(p.x - 12, p.y - 10);
      ctx.lineTo(p.x - 6, p.y);
      ctx.lineTo(p.x - 12, p.y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Laser Bullets
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
              VANGUARD // 3D MULTIDIRECTIONAL STAR SECTOR DEFENDER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              8-way directional firing & Gond dreadnought sector conquest for {currentUser?.name}
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
              [WASD] MOVE, [ARROW KEYS] 4-WAY FIRE
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
                  {gameState === 'victory' ? 'STAR SECTOR CLEARED - VICTORY!' : 'VANGUARD 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Navigate the hazardous mountain tunnel and blast approaching alien saucers using 4-directional arrow key laser fire!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>COMMENCE RUN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
