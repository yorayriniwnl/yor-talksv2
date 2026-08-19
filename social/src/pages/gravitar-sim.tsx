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

export default function GravitarSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [fuel, setFuel] = useState(1000);
  const [highScore, setHighScore] = useState(83200);

  const shipPos = useRef({ x: 370, y: 80, vx: 0, vy: 0, angle: 0 });
  const bunkerHP = useRef(5);
  const bulletsRef = useRef<Bullet[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireLaser = () => {
    if (gameState !== 'playing') return;
    const s = shipPos.current;
    bulletsRef.current.push({
      x: s.x,
      y: s.y,
      vx: Math.cos(s.angle) * 9,
      vy: Math.sin(s.angle) * 9,
      life: 50,
    });
    uiaudio.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const s = shipPos.current;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') s.angle -= 0.12;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') s.angle += 0.12;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        // Main Thruster
        s.vx += Math.cos(s.angle) * 0.4;
        s.vy += Math.sin(s.angle) * 0.4;
        setFuel(f => Math.max(0, f - 2));
      }
      if (e.code === 'Space') fireLaser();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setFuel(1000);
    bunkerHP.current = 5;
    shipPos.current = { x: 370, y: 80, vx: 1.5, vy: 0, angle: 0 };
    bulletsRef.current = [];
  };

  // Gravitar Planetary Gravity Well & Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = shipPos.current;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 50;

      // Central Gravity Well (Pulls ship toward center planet at cx, cy)
      const dx = cx - s.x;
      const dy = cy - s.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 30) {
        const gravForce = 120.0 / (dist * dist);
        s.vx += (dx / dist) * gravForce;
        s.vy += (dy / dist) * gravForce;
      }

      s.x += s.vx;
      s.y += s.vy;

      // Check Crash into Planet Core (Radius < 60)
      if (dist < 60) {
        uiaudio.error();
        setGameState('gameover');
        setHighScore(h => Math.max(h, score));
      }

      // Check Boundaries
      if (s.x < 10 || s.x > canvas.width - 10 || s.y < 10 || s.y > canvas.height - 10) {
        uiaudio.error();
        setGameState('gameover');
        setHighScore(h => Math.max(h, score));
      }

      // Update Bullets
      bulletsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 1;

        // Check Hit Surface Bunker (At cx, cy - 65)
        if (Math.hypot(b.x - cx, b.y - (cy - 65)) < 22) {
          b.life = 0;
          bunkerHP.current--;
          uiaudio.success();
          setScore(sc => sc + 300);

          if (bunkerHP.current <= 0) {
            uiaudio.success();
            setGameState('victory');
            setHighScore(h => Math.max(h, score + 8000));
          }
        }
      });

      bulletsRef.current = bulletsRef.current.filter(b => b.life > 0);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Space
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Planetary Gravity Well (Center Planet in Deep Blue / Violet)
      const pGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 60);
      pGrad.addColorStop(0, '#6366f1');
      pGrad.addColorStop(0.8, '#1e1b4b');
      pGrad.addColorStop(1, '#020617');
      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.fill();

      // Planet Surface Terrain Contour
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Red Hostile Reactor Bunker on Planet Surface
      if (bunkerHP.current > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.fillRect(cx - 16, cy - 78, 32, 18);
        ctx.shadowBlur = 0;
      }

      // Draw Starfighter (Cyan Arrowhead)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);

      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      // Draw Bullets
      bulletsRef.current.forEach((b) => {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
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
              GRAVITAR // 3D PLANETARY GRAVITY WELL SHOOTER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Newtonian orbital gravity thrust & surface reactor bunker assault for {currentUser?.name}
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
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-3">
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-base text-cyan-300">{score.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-zinc-400">FUEL: </span>
                <span className="font-bold text-amber-400">{fuel}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [W] THRUST, [A/D] ROTATE, [SPACE] FIRE
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
                  {gameState === 'victory' ? 'SURFACE REACTOR DESTROYED - VICTORY!' : (gameState === 'gameover' ? 'CRASHED INTO PLANET' : 'GRAVITAR 3D')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Orbit the gravitational body, fire thrusters to avoid crashing, and snipe the red surface bunker!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH ORBITAL RUN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
