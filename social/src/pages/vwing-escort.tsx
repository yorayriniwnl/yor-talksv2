import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PirateInterceptor {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function VwingEscort() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'escort' | 'crashed' | 'shuttle_saved'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [shuttleIntegrity, setShuttleIntegrity] = useState(100);
  const [highScore, setHighScore] = useState(255000);

  const vwingPos = useRef({ x: 370, y: 360, roll: 0 });
  const interceptorsRef = useRef<PirateInterceptor[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireQuadBlasters = () => {
    if (gameState !== 'escort') return;
    uiaudio.warp();
    const v = vwingPos.current;

    // Check hit on Pirate Interceptors
    interceptorsRef.current.forEach((p) => {
      if (p.alive && p.z < 520 && p.z > 50) {
        if (Math.hypot(p.x - v.x, p.y - v.y) < 65) {
          p.alive = false;
          uiaudio.success();
          setScore(sc => sc + 28000);
        }
      }
    });

    if (interceptorsRef.current.every(p => !p.alive)) {
      setGameState('shuttle_saved');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 140000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'escort') return;
      const v = vwingPos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') v.y = Math.max(100, v.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') v.y = Math.min(420, v.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        v.x = Math.max(100, v.x - step);
        v.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        v.x = Math.min(640, v.x + step);
        v.roll = 0.3;
      }

      if (e.code === 'Space') fireQuadBlasters();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        vwingPos.current.roll = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('escort');
    setScore(0);
    setShields(8);
    setShuttleIntegrity(100);
    vwingPos.current = { x: 370, y: 360, roll: 0 };
    interceptorsRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // Alpha-3 Nimbus V-Wing Escort Loop
  useEffect(() => {
    if (gameState !== 'escort') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const v = vwingPos.current;

      // Move Interceptors
      interceptorsRef.current.forEach((p) => {
        p.z -= 4.0;
        if (p.z < 50 && p.z > 10 && p.alive) {
          p.z = 640; // Loop around
          setShuttleIntegrity(si => Math.max(0, si - 15));
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
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Deep Space Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Planetary Debris Field Grid
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 6; s++) {
        const offset = (frame * 3 + s * 80) % 480;
        ctx.strokeRect(cx - 300 + s * 100, cy + 40 + (s % 2) * 50, 40, 40);
      }

      // Escorted Imperial Theta-Class Shuttle (Center background: 370, cy - 60)
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Triangular Tri-Wing Shuttle
      ctx.moveTo(370, cy - 90);
      ctx.lineTo(395, cy - 35);
      ctx.lineTo(345, cy - 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`THETA SHUTTLE [${shuttleIntegrity}%]`, 325, cy - 100);

      // Draw Pirate Interceptors (Yellow/Red Scythe Fighters)
      interceptorsRef.current.forEach((p) => {
        if (p.alive && p.z > 0) {
          const scale = 250 / p.z;
          ctx.fillStyle = '#eab308';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 15 * scale);
          ctx.lineTo(p.x + 20 * scale, p.y + 12 * scale);
          ctx.lineTo(p.x - 20 * scale, p.y + 12 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Alpha-3 Nimbus V-Wing Starfighter (Folding Vertical Radiator Fins & Quad Blasters)
      ctx.save();
      ctx.translate(v.x, v.y);
      ctx.rotate(v.roll);

      // Sleek Dark Gray / Crimson Hull
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;

      // Needle Cockpit Fuselage
      ctx.beginPath();
      ctx.moveTo(0, -40);
      ctx.lineTo(10, 10);
      ctx.lineTo(5, 35);
      ctx.lineTo(-5, 35);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Vertical Folding V-Wing Radiator Fins (Left & Right)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      // Left Fin
      ctx.beginPath();
      ctx.moveTo(-10, 5); ctx.lineTo(-45, -20);
      ctx.moveTo(-10, 15); ctx.lineTo(-45, 30);
      // Right Fin
      ctx.moveTo(10, 5); ctx.lineTo(45, -20);
      ctx.moveTo(10, 15); ctx.lineTo(45, 30);
      ctx.stroke();

      // Quad Green Laser Cannons
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, -15); ctx.lineTo(-12, -35);
      ctx.moveTo(12, -15); ctx.lineTo(12, -35);
      ctx.moveTo(-8, -10); ctx.lineTo(-8, -30);
      ctx.moveTo(8, -10); ctx.lineTo(8, -30);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, shuttleIntegrity]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-200 to-cyan-400">
              V-WING STARFIGHTER // IMPERIAL SHUTTLE ESCORT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Alpha-3 Nimbus interceptor & quad rapid cannons vs Pirate Raiders for {currentUser?.name}
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

        {gameState === 'escort' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">HULL: </span>
                <span className="font-bold text-red-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">SHUTTLE: </span>
                <span className="font-bold text-cyan-300">{shuttleIntegrity}%</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-yellow-400 font-bold">
              [WASD] FLY V-WING, [SPACE] QUAD RAPID CANNONS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'escort' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
                  {gameState === 'shuttle_saved' ? 'IMPERIAL SHUTTLE SAFELY ESCORTED!' : 'ALPHA-3 NIMBUS V-WING READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the fast Alpha-3 Nimbus V-Wing Starfighter, escort the Imperial Shuttle through hostile asteroid sectors, and destroy pirate interceptors!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH V-WING STARFIGHTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
