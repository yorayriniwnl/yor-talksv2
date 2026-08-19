import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface ShieldDome {
  x: number;
  z: number;
  alive: boolean;
}

export default function ExecutorAssault() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'assault' | 'crashed' | 'bridge_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(5);
  const [highScore, setHighScore] = useState(165000);

  const awingPos = useRef({ x: 370, y: 380 });
  const domesRef = useRef<ShieldDome[]>([
    { x: 300, z: 500, alive: true },
    { x: 440, z: 500, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireLaserCannons = () => {
    if (gameState !== 'assault') return;
    uiaudio.warp();
    const a = awingPos.current;

    // Check hit on shield domes
    domesRef.current.forEach((d) => {
      if (d.alive && d.z < 450 && d.z > 50) {
        if (Math.abs(d.x - a.x) < 40) {
          d.alive = false;
          uiaudio.success();
          setScore(sc => sc + 15000);
        }
      }
    });

    // If both domes destroyed and close to bridge -> Victory!
    if (domesRef.current.every(d => !d.alive)) {
      setGameState('bridge_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 100000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'assault') return;
      const a = awingPos.current;
      const step = 14;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') a.x = Math.max(120, a.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') a.x = Math.min(620, a.x + step);

      if (e.code === 'Space') fireLaserCannons();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('assault');
    setScore(0);
    setShields(5);
    awingPos.current = { x: 370, y: 380 };
    domesRef.current = [
      { x: 300, z: 500, alive: true },
      { x: 440, z: 500, alive: true },
    ];
  };

  // Super Star Destroyer Executor Bridge Assault 3D Loop
  useEffect(() => {
    if (gameState !== 'assault') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const a = awingPos.current;
      setScore(sc => sc + 35);

      // Move Domes closer
      domesRef.current.forEach((d) => {
        d.z -= 4;
        if (d.z < 60 && d.z > 20 && d.alive) {
          if (Math.abs(d.x - a.x) < 35) {
            setShields(sh => {
              if (sh <= 1) {
                setGameState('crashed');
                uiaudio.error();
                return 0;
              }
              uiaudio.error();
              return sh - 1;
            });
          }
        }
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Space Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant 19-km Super Star Destroyer Hull Surface (Wedge in Perspective)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 160);
      ctx.lineTo(80, canvas.height);
      ctx.lineTo(canvas.width - 80, canvas.height);
      ctx.closePath();
      ctx.stroke();

      // Executor Bridge Command Tower (Trapezoid at cx, 200)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.fillRect(cx - 90, 180, 180, 60);
      ctx.strokeRect(cx - 90, 180, 180, 60);

      // Dual Shield Domes on Top of Tower
      domesRef.current.forEach((d) => {
        if (d.alive) {
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(d.x, 170, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      // Draw Player RZ-1 A-Wing Interceptor (Fast Wedge)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - 25);
      ctx.lineTo(a.x - 18, a.y + 15);
      ctx.lineTo(a.x + 18, a.y + 15);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields]);

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
              EXECUTOR ASSAULT // 3D SUPER STAR DESTROYER BRIDGE RUN
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Target dual deflector shield globes & bridge crash run for {currentUser?.name}
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

        {gameState === 'assault' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-amber-400">{shields} / 5</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-red-400 font-bold">
              [A / D / ARROWS] STEER A-WING, [SPACE] FIRE LASERS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'assault' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-400 to-cyan-400">
                  {gameState === 'bridge_destroyed' ? 'EXECUTOR DESTROYED - CRASHED INTO DEATH STAR II!' : (gameState === 'crashed' ? 'A-WING OBLITERATED BY FLAK!' : 'EXECUTOR BRIDGE ASSAULT')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Destroy the dual deflector shield domes atop the Super Star Destroyer command tower!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-500 via-amber-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START BRIDGE ASSAULT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
