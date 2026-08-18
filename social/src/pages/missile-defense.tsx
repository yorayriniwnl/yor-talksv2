import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Missile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetCity: number;
  alive: boolean;
}

interface Blast {
  x: number;
  y: number;
  r: number;
  maxR: number;
  alive: boolean;
}

export default function MissileDefense() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(64500);

  const missilesRef = useRef<Missile[]>([]);
  const blastsRef = useRef<Blast[]>([]);
  const citiesRef = useRef<boolean[]>([true, true, true, true, true]);
  const animFrameRef = useRef<number | null>(null);

  const spawnMissile = () => {
    const startX = Math.random() * 660 + 40;
    const targetIdx = Math.floor(Math.random() * 5);
    const targetX = 100 + targetIdx * 135;

    missilesRef.current.push({
      x: startX,
      y: 20,
      vx: (targetX - startX) / 250,
      vy: 1.2,
      targetCity: targetIdx,
      alive: true,
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Trigger Flak Interceptor Blast
    blastsRef.current.push({
      x: clickX,
      y: clickY,
      r: 2,
      maxR: 35,
      alive: true,
    });
    uiaudio.laser();
  };

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    missilesRef.current = [];
    blastsRef.current = [];
    citiesRef.current = [true, true, true, true, true];
  };

  // Missile Command Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const loop = () => {
      tick++;
      if (tick % 60 === 0) spawnMissile();

      // Update Missiles
      missilesRef.current.forEach((m) => {
        m.x += m.vx;
        m.y += m.vy;

        // Check impact with ground cities
        if (m.y >= 430) {
          m.alive = false;
          citiesRef.current[m.targetCity] = false;
          uiaudio.error();
        }

        // Check collision with expanding blasts
        blastsRef.current.forEach((b) => {
          if (b.alive) {
            const dx = m.x - b.x;
            const dy = m.y - b.y;
            if (Math.sqrt(dx * dx + dy * dy) < b.r) {
              m.alive = false;
              uiaudio.success();
              setScore(sc => sc + 250);
            }
          }
        });
      });

      missilesRef.current = missilesRef.current.filter(m => m.alive);

      // Update Blasts
      blastsRef.current.forEach((b) => {
        b.r += 1.2;
        if (b.r >= b.maxR) b.alive = false;
      });

      blastsRef.current = blastsRef.current.filter(b => b.alive);

      // Check Game Over
      if (citiesRef.current.every(c => !c)) {
        setGameState('gameover');
        setHighScore(h => Math.max(h, score));
        return;
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Night Sky
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Cities
      citiesRef.current.forEach((alive, idx) => {
        const cx = 100 + idx * 135;
        if (alive) {
          ctx.fillStyle = '#06b6d4';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 10;
          ctx.fillRect(cx - 20, 420, 40, 20);
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = '#475569';
          ctx.fillRect(cx - 20, 435, 40, 5);
        }
      });

      // Draw Interceptor Expanding Blasts
      blastsRef.current.forEach((b) => {
        ctx.fillStyle = 'rgba(236, 72, 153, 0.4)';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw Incoming Ballistic Missiles & Trails
      missilesRef.current.forEach((m) => {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(m.x - m.vx * 20, m.y - m.vy * 20);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-rose-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(244,63,94,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/30 border border-rose-400/40">
            <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-pink-300 to-amber-400">
              MISSILE COMMAND // IRON DOME LASER DEFENSE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Click anywhere to detonate flak interceptor plasma bursts for {currentUser?.name}
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

      {/* Game Stage */}
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
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
              <span className="text-zinc-400">SCORE: </span>
              <span className="font-bold text-base text-white">{score.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-rose-400 font-bold">
              CLICK TO FIRE INTERCEPTOR BLAST
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-pink-400 to-amber-400">
                  MISSILE DEFENSE
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Defend the 5 neon cities from ballistic ICBM warheads! Click in the sky to detonate interceptor flak blasts.
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ARM INTERCEPTOR BATTERIES</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
