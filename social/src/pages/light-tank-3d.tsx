import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Box
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface DroneTank {
  x: number;
  y: number;
  angle: number;
  alive: boolean;
}

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
}

export default function LightTank3D() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [ammo, setAmmo] = useState(20);
  const [highScore, setHighScore] = useState(88500);

  const tankPos = useRef({ x: 120, y: 380, turretAngle: 0 });
  const dronesRef = useRef<DroneTank[]>([]);
  const shellsRef = useRef<Shell[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireLightShell = () => {
    if (gameState !== 'playing' || ammo <= 0) return;
    const t = tankPos.current;
    const speed = 7.5;

    shellsRef.current.push({
      x: t.x + Math.cos(t.turretAngle) * 20,
      y: t.y + Math.sin(t.turretAngle) * 20,
      vx: Math.cos(t.turretAngle) * speed,
      vy: Math.sin(t.turretAngle) * speed,
      bounces: 3,
    });

    setAmmo(a => a - 1);
    uiaudio.warp();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const t = tankPos.current;
      const step = 8;
      const rot = 0.15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        t.x += Math.cos(t.turretAngle) * step;
        t.y += Math.sin(t.turretAngle) * step;
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') {
        t.x -= Math.cos(t.turretAngle) * step;
        t.y -= Math.sin(t.turretAngle) * step;
      }
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') t.turretAngle -= rot;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') t.turretAngle += rot;

      t.x = Math.max(60, Math.min(680, t.x));
      t.y = Math.max(60, Math.min(420, t.y));

      if (e.code === 'Space') fireLightShell();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, ammo]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setAmmo(20);
    tankPos.current = { x: 120, y: 380, turretAngle: -Math.PI / 4 };
    shellsRef.current = [];
    dronesRef.current = [
      { x: 300, y: 140, angle: 0, alive: true },
      { x: 540, y: 200, angle: Math.PI, alive: true },
      { x: 420, y: 340, angle: Math.PI / 2, alive: true },
    ];
  };

  // Tron Light Tank Arena Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const t = tankPos.current;

      // Update Bouncing Shells
      shellsRef.current.forEach((sh) => {
        sh.x += sh.vx;
        sh.y += sh.vy;

        // Bounce off Arena Walls
        if (sh.x < 60 || sh.x > canvas.width - 60) {
          sh.vx *= -1;
          sh.bounces -= 1;
          uiaudio.click();
        }
        if (sh.y < 60 || sh.y > canvas.height - 60) {
          sh.vy *= -1;
          sh.bounces -= 1;
          uiaudio.click();
        }

        // Check Hit on Enemy Drones
        dronesRef.current.forEach((dr) => {
          if (dr.alive && Math.hypot(sh.x - dr.x, sh.y - dr.y) < 22) {
            dr.alive = false;
            sh.bounces = 0;
            setScore(s => s + 1500);
            uiaudio.success();

            // Check if all eliminated
            if (dronesRef.current.every(d => !d.alive)) {
              setGameState('victory');
              setHighScore(h => Math.max(h, score + 25000));
            }
          }
        });
      });

      shellsRef.current = shellsRef.current.filter(sh => sh.bounces > 0);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark MCP Game Grid
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Arena Grid Lines (Neon Blue Background Floor)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 60; x <= canvas.width - 60; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, canvas.height - 60); ctx.stroke();
      }
      for (let y = 60; y <= canvas.height - 60; y += 40) {
        ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(canvas.width - 60, y); ctx.stroke();
      }

      // Outer Perimeter Walls
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

      // Draw Enemy Drone Tanks (Red / Magenta Vector Tanks)
      dronesRef.current.forEach((dr) => {
        if (dr.alive) {
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.fillRect(dr.x - 14, dr.y - 14, 28, 28);
          ctx.shadowBlur = 0;

          // Turret
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(dr.x, dr.y);
          ctx.lineTo(dr.x + Math.cos(dr.angle) * 20, dr.y + Math.sin(dr.angle) * 20);
          ctx.stroke();
        }
      });

      // Draw Player Light Tank (Neon Cyan / Blue Body + Rotating Turret)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.fillRect(t.x - 16, t.y - 16, 32, 32);
      ctx.shadowBlur = 0;

      // Turret Barrel
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(t.turretAngle) * 26, t.y + Math.sin(t.turretAngle) * 26);
      ctx.stroke();

      // Draw Glowing Bouncing Shells
      shellsRef.current.forEach((sh) => {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2);
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
            <Target className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              TRON LIGHT TANK // 3D MCP ARENA COMBAT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3-bounce ricochet physics & recognizer drone elimination for {currentUser?.name}
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
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">AMMO: </span>
                <span className="font-bold text-base text-cyan-300">{ammo}</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-amber-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] MOVE & STEER TURRET, [SPACE] FIRE 3-BOUNCE SHELL
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
                  {gameState === 'victory' ? 'ALL MCP DRONES PURGED - VICTORY!' : 'TRON LIGHT TANK 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Navigate the Master Control Program arena grid, bounce light shells off walls, and eliminate enemy tanks!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ENTER THE GRID</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
