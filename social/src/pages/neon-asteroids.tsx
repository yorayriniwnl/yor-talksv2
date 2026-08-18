import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export default function NeonAsteroids() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(64200);

  const shipRef = useRef({ x: 370, y: 240, angle: -Math.PI / 2, vx: 0, vy: 0 });
  const bulletsRef = useRef<Bullet[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const initAsteroids = () => {
    const arr: Asteroid[] = [];
    for (let i = 0; i < 6; i++) {
      arr.push({
        x: Math.random() * 740,
        y: Math.random() > 0.5 ? 50 : 430,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        r: 28,
      });
    }
    asteroidsRef.current = arr;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.code === 'Space' && gameState === 'playing') {
        // Fire laser
        const s = shipRef.current;
        bulletsRef.current.push({
          x: s.x + Math.cos(s.angle) * 18,
          y: s.y + Math.sin(s.angle) * 18,
          vx: Math.cos(s.angle) * 10 + s.vx,
          vy: Math.sin(s.angle) * 10 + s.vy,
          life: 50,
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
    shipRef.current = { x: 370, y: 240, angle: -Math.PI / 2, vx: 0, vy: 0 };
    bulletsRef.current = [];
    initAsteroids();
  };

  // Asteroids Vector Arcade Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = shipRef.current;
      const keys = keysPressed.current;

      // Rotation
      if (keys['KeyA'] || keys['ArrowLeft']) s.angle -= 0.08;
      if (keys['KeyD'] || keys['ArrowRight']) s.angle += 0.08;

      // Thrust
      if (keys['KeyW'] || keys['ArrowUp']) {
        s.vx += Math.cos(s.angle) * 0.2;
        s.vy += Math.sin(s.angle) * 0.2;
      }

      s.vx *= 0.985;
      s.vy *= 0.985;
      s.x = (s.x + s.vx + canvas.width) % canvas.width;
      s.y = (s.y + s.vy + canvas.height) % canvas.height;

      // Update Bullets
      bulletsRef.current.forEach((b) => {
        b.x = (b.x + b.vx + canvas.width) % canvas.width;
        b.y = (b.y + b.vy + canvas.height) % canvas.height;
        b.life -= 1;
      });
      bulletsRef.current = bulletsRef.current.filter(b => b.life > 0);

      // Update Asteroids & Collisions
      asteroidsRef.current.forEach((ast) => {
        ast.x = (ast.x + ast.vx + canvas.width) % canvas.width;
        ast.y = (ast.y + ast.vy + canvas.height) % canvas.height;

        // Bullet vs Asteroid collision
        bulletsRef.current.forEach((b) => {
          const dx = b.x - ast.x;
          const dy = b.y - ast.y;
          if (Math.sqrt(dx * dx + dy * dy) < ast.r) {
            b.life = 0;
            ast.r -= 10;
            uiaudio.success();
            setScore(sc => sc + 200);
          }
        });
      });

      // Respawn small destroyed asteroids
      asteroidsRef.current = asteroidsRef.current.filter(ast => ast.r > 10);
      if (asteroidsRef.current.length < 4) {
        asteroidsRef.current.push({
          x: Math.random() * canvas.width,
          y: 30,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          r: 28,
        });
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Bullets
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      bulletsRef.current.forEach((b) => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Draw Vector Asteroids
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      asteroidsRef.current.forEach((ast) => {
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Draw Player Ship (Vector Triangle)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

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
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              NEON ASTEROIDS // VECTOR SPACE SHOOTER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Newtonian inertia drift & dual laser cannon combat for {currentUser?.name}
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

      {/* Canvas Stage */}
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
              [W] THRUST | [A/D] ROTATE | [SPACE] FIRE LASER
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
                  NEON ASTEROIDS
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Press [W] to thrust, [A/D] to rotate, and [SPACE] to fire laser pulses!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH FIGHTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
