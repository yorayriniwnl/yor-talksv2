import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Bot
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Droid {
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
}

export default function BerzerkArcade() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(84200);

  const playerPos = useRef({ x: 370, y: 380 });
  const ottoPos = useRef({ x: 100, y: 100, active: false });
  const droidsRef = useRef<Droid[]>([]);
  const lasersRef = useRef<Laser[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireLaser = (dx: number, dy: number) => {
    if (gameState !== 'playing') return;
    const p = playerPos.current;
    lasersRef.current.push({
      x: p.x,
      y: p.y,
      vx: dx * 10,
      vy: dy * 10,
      life: 45,
    });
    uiaudio.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const p = playerPos.current;
      const step = 8;

      if (e.code === 'KeyW') p.y = Math.max(50, p.y - step);
      if (e.code === 'KeyS') p.y = Math.min(430, p.y + step);
      if (e.code === 'KeyA') p.x = Math.max(50, p.x - step);
      if (e.code === 'KeyD') p.x = Math.min(690, p.x + step);

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
    playerPos.current = { x: 370, y: 380 };
    ottoPos.current = { x: 80, y: 80, active: true };
    lasersRef.current = [];
    droidsRef.current = [
      { x: 140, y: 120, alive: true },
      { x: 600, y: 120, alive: true },
      { x: 180, y: 240, alive: true },
      { x: 560, y: 240, alive: true },
      { x: 370, y: 140, alive: true },
    ];
  };

  // Berzerk Electrified Maze & Security Droid Physics Loop
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
      const ot = ottoPos.current;

      // Evil Otto Pursuit (Bouncing Smiley)
      if (ot.active) {
        const oAngle = Math.atan2(p.y - ot.y, p.x - ot.x);
        ot.x += Math.cos(oAngle) * 1.2;
        ot.y += Math.sin(oAngle) * 1.2;

        if (Math.hypot(p.x - ot.x, p.y - ot.y) < 24) {
          uiaudio.error();
          setGameState('gameover');
          setHighScore(h => Math.max(h, score));
        }
      }

      // Update Lasers
      lasersRef.current.forEach((l) => {
        l.x += l.vx;
        l.y += l.vy;
        l.life -= 1;

        // Check Hit Droid
        droidsRef.current.forEach((d) => {
          if (d.alive && Math.hypot(l.x - d.x, l.y - d.y) < 20) {
            d.alive = false;
            l.life = 0;
            uiaudio.success();
            setScore(s => s + 200);
          }
        });
      });

      lasersRef.current = lasersRef.current.filter(l => l.life > 0);

      // Check all droids cleared -> Victory
      if (droidsRef.current.every(d => !d.alive)) {
        uiaudio.success();
        setGameState('victory');
        setHighScore(h => Math.max(h, score + 10000));
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Maze Floor
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Electrified Maze Perimeter Walls (Lethal Neon Cyan)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

      // Internal Maze Barrier Walls
      ctx.beginPath();
      ctx.moveTo(200, 40); ctx.lineTo(200, 200);
      ctx.moveTo(540, 40); ctx.lineTo(540, 200);
      ctx.moveTo(200, 280); ctx.lineTo(200, 440);
      ctx.moveTo(540, 280); ctx.lineTo(540, 440);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Security Droids (Yellow Cyber Robots)
      droidsRef.current.forEach((d) => {
        if (d.alive) {
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Eye slit
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(d.x - 6, d.y - 3, 12, 4);
        }
      });

      // Draw Evil Otto (Red/Yellow Bouncing Smiley Face)
      if (ot.active) {
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(ot.x, ot.y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(ot.x - 6, ot.y - 6, 4, 4);
        ctx.fillRect(ot.x + 2, ot.y - 6, 4, 4);
      }

      // Draw Player Stickman Fighter (Neon Green)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Lasers
      lasersRef.current.forEach((l) => {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Bot className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              BERZERK // 3D ELECTRIFIED DROID MAZE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              "INTRUDER ALERT!" Security droid elimination & Evil Otto evasion for {currentUser?.name}
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
              [WASD] MOVE, [ARROW KEYS] 4-WAY LASER
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
                  {gameState === 'victory' ? 'MAZE CLEARED - VICTORY!' : 'BERZERK 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Eliminate all 5 security droids without touching electrified walls or getting caught by the invincible bouncing Evil Otto!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ENTER MAZE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
