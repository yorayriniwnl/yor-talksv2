import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bounces: number;
}

interface EnemyTank {
  x: number;
  y: number;
  angle: number;
  alive: boolean;
}

export default function NeonTanks() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(48200);

  const playerRef = useRef({ x: 370, y: 380, angle: -Math.PI / 2 });
  const shellsRef = useRef<Shell[]>([]);
  const enemiesRef = useRef<EnemyTank[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const initEnemies = () => {
    enemiesRef.current = [
      { x: 180, y: 120, angle: 0, alive: true },
      { x: 560, y: 120, angle: Math.PI, alive: true },
      { x: 370, y: 100, angle: Math.PI / 2, alive: true },
    ];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.code === 'Space' && gameState === 'playing') {
        // Fire Plasma Shell
        const p = playerRef.current;
        shellsRef.current.push({
          x: p.x + Math.cos(p.angle) * 22,
          y: p.y + Math.sin(p.angle) * 22,
          vx: Math.cos(p.angle) * 8,
          vy: Math.sin(p.angle) * 8,
          bounces: 3,
        });
        uiaudio.laser();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    playerRef.current = { x: 370, y: 380, angle: -Math.PI / 2 };
    shellsRef.current = [];
    initEnemies();
  };

  // Tank Arena Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const p = playerRef.current;
      const keys = keysPressed.current;

      // Tank Steering
      if (keys['KeyA'] || keys['ArrowLeft']) p.angle -= 0.06;
      if (keys['KeyD'] || keys['ArrowRight']) p.angle += 0.06;

      // Tank Drive Forward / Back
      if (keys['KeyW'] || keys['ArrowUp']) {
        p.x += Math.cos(p.angle) * 3.5;
        p.y += Math.sin(p.angle) * 3.5;
      }
      if (keys['KeyS'] || keys['ArrowDown']) {
        p.x -= Math.cos(p.angle) * 2.5;
        p.y -= Math.sin(p.angle) * 2.5;
      }

      p.x = Math.max(50, Math.min(canvas.width - 50, p.x));
      p.y = Math.max(50, Math.min(canvas.height - 50, p.y));

      // Update Bouncing Plasma Shells
      shellsRef.current.forEach((sh) => {
        sh.x += sh.vx;
        sh.y += sh.vy;

        // Ricochet Bounces off walls
        if (sh.x < 40 || sh.x > canvas.width - 40) {
          sh.vx = -sh.vx;
          sh.bounces -= 1;
        }
        if (sh.y < 40 || sh.y > canvas.height - 40) {
          sh.vy = -sh.vy;
          sh.bounces -= 1;
        }

        // Shell vs Enemy Tanks
        enemiesRef.current.forEach((en) => {
          if (en.alive) {
            const dx = sh.x - en.x;
            const dy = sh.y - en.y;
            if (Math.sqrt(dx * dx + dy * dy) < 22) {
              en.alive = false;
              sh.bounces = 0;
              uiaudio.success();
              setScore(sc => sc + 500);
            }
          }
        });
      });

      shellsRef.current = shellsRef.current.filter(sh => sh.bounces > 0);

      // Respawn enemy wave
      if (enemiesRef.current.every(en => !en.alive)) {
        initEnemies();
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Arena Floor Grid
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Arena Outer Border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);

      // Draw Enemy Tanks (Red)
      enemiesRef.current.forEach((en) => {
        if (en.alive) {
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(en.x, en.y, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Shells
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      shellsRef.current.forEach((sh) => {
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Draw Player Tank (Cyan)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      // Tank Hull
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.fillRect(-15, -12, 30, 24);

      // Cannon Barrel
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();

      ctx.restore();
      ctx.shadowBlur = 0;

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
            <Crosshair className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              NEON TANKS // 3D ARENA CROSSFIRE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Dual track steering & 3-bounce ricochet plasma cannon for {currentUser?.name}
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

      {/* Tank Stage */}
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
              [WASD] DRIVE | [SPACE] FIRE RICOCHET SHELL
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
                  NEON TANKS
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Drive your tank with [WASD] / Arrows and fire 3-bounce ricochet shells with [SPACE]!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>DEPLOY TANK</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
