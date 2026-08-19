import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Robot {
  x: number;
  y: number;
  alive: boolean;
}

interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  isPlayer: boolean;
}

export default function RobotMaze() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(42900);

  const playerPos = useRef({ x: 100, y: 240, r: 10 });
  const evilOttoPos = useRef({ x: 30, y: 30, vx: 1.2, vy: 1.2 });
  const robotsRef = useRef<Robot[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireLaser = (dx: number, dy: number) => {
    if (gameState !== 'playing') return;
    const p = playerPos.current;
    lasersRef.current.push({
      x: p.x,
      y: p.y,
      vx: dx * 9,
      vy: dy * 9,
      life: 50,
      isPlayer: true,
    });
    uiaudio.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const p = playerPos.current;
      const step = 8;

      if (e.code === 'KeyW') p.y = Math.max(40, p.y - step);
      if (e.code === 'KeyS') p.y = Math.min(440, p.y + step);
      if (e.code === 'KeyA') p.x = Math.max(40, p.x - step);
      if (e.code === 'KeyD') p.x = Math.min(700, p.x + step);

      // Arrow keys fire lasers
      if (e.code === 'ArrowUp') fireLaser(0, -1);
      if (e.code === 'ArrowDown') fireLaser(0, 1);
      if (e.code === 'ArrowLeft') fireLaser(-1, 0);
      if (e.code === 'ArrowRight') fireLaser(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    playerPos.current = { x: 100, y: 240, r: 10 };
    evilOttoPos.current = { x: 30, y: 30, vx: 1.2, vy: 1.2 };
    lasersRef.current = [];
    robotsRef.current = [
      { x: 300, y: 120, alive: true },
      { x: 500, y: 120, alive: true },
      { x: 300, y: 360, alive: true },
      { x: 500, y: 360, alive: true },
      { x: 400, y: 240, alive: true },
    ];
  };

  // Robot Maze Arcade Physics Loop
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
      const otto = evilOttoPos.current;

      // Evil Otto Bouncing Path toward player
      const angleToPlayer = Math.atan2(p.y - otto.y, p.x - otto.x);
      otto.x += Math.cos(angleToPlayer) * 1.3;
      otto.y += Math.sin(angleToPlayer) * 1.3;

      // Check Evil Otto Touch Player
      if (Math.hypot(p.x - otto.x, p.y - otto.y) < 22) {
        uiaudio.error();
        setGameState('gameover');
        setHighScore(h => Math.max(h, score));
      }

      // Robots Shoot at Player periodically
      if (frame % 40 === 0) {
        robotsRef.current.forEach((bot) => {
          if (bot.alive) {
            const bAngle = Math.atan2(p.y - bot.y, p.x - bot.x);
            lasersRef.current.push({
              x: bot.x,
              y: bot.y,
              vx: Math.cos(bAngle) * 4.5,
              vy: Math.sin(bAngle) * 4.5,
              life: 60,
              isPlayer: false,
            });
          }
        });
      }

      // Update Lasers
      lasersRef.current.forEach((l) => {
        l.x += l.vx;
        l.y += l.vy;
        l.life -= 1;

        // Player laser hits robot
        if (l.isPlayer) {
          robotsRef.current.forEach((bot) => {
            if (bot.alive && Math.hypot(l.x - bot.x, l.y - bot.y) < 18) {
              bot.alive = false;
              l.life = 0;
              uiaudio.success();
              setScore(s => s + 200);
            }
          });
        } else {
          // Robot laser hits player
          if (Math.hypot(l.x - p.x, l.y - p.y) < 12) {
            uiaudio.error();
            setGameState('gameover');
            setHighScore(h => Math.max(h, score));
          }
        }
      });

      lasersRef.current = lasersRef.current.filter(l => l.life > 0);

      // Check all robots destroyed -> Victory
      if (robotsRef.current.every(b => !b.alive)) {
        uiaudio.success();
        setGameState('victory');
        setHighScore(h => Math.max(h, score + 5000));
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Matrix Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Electrified Maze Outer Walls (Glowing Red)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Internal Maze Walls (Cyan Obstacles)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Wall 1
      ctx.moveTo(240, 20); ctx.lineTo(240, 160);
      ctx.moveTo(240, 320); ctx.lineTo(240, canvas.height - 20);
      // Wall 2
      ctx.moveTo(560, 20); ctx.lineTo(560, 160);
      ctx.moveTo(560, 320); ctx.lineTo(560, canvas.height - 20);
      ctx.stroke();

      // Draw Robots (Yellow Boxy Droids)
      robotsRef.current.forEach((bot) => {
        if (bot.alive) {
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12;
          ctx.fillRect(bot.x - 12, bot.y - 12, 24, 24);
          ctx.shadowBlur = 0;
        }
      });

      // Draw Evil Otto (Bouncing Red Smile Face)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(otto.x, otto.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Humanoid Player (Neon Green)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Lasers
      lasersRef.current.forEach((l) => {
        ctx.fillStyle = l.isPlayer ? '#38bdf8' : '#ef4444';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Target className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
              ROBOT MAZE // 3D ELECTRIFIED BERZERK GUNNER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Hostile robot evasion, laser gun duels & Evil Otto boss escape for {currentUser?.name}
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
              <span className="font-bold text-base text-red-400">{score.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] MOVE, [ARROW KEYS] FIRE LASERS
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-400 to-cyan-400">
                  {gameState === 'victory' ? 'MAZE CLEARED - VICTORY!' : (gameState === 'gameover' ? 'DERESOLVED BY ROBOTS' : 'ROBOT MAZE 3D')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Destroy all 5 security droids using directional arrow key fire before the bouncing red Evil Otto catches you!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-500 via-amber-600 to-cyan-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>ENTER THE MAZE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
