import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Gauge
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface ConduitObstacle {
  x: number;
  y: number;
  z: number;
  type: 'blast_door' | 'pipe_junction';
}

export default function TieInterceptorSlalom() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'slalom' | 'crashed' | 'reactor_escaped'>('idle');
  const [score, setScore] = useState(0);
  const [speedKmH, setSpeedKmH] = useState(1400); // 1,400 km/h supersonic tunnel run
  const [shields, setShields] = useState(5);
  const [highScore, setHighScore] = useState(172000);

  const shipPos = useRef({ x: 370, y: 240, roll: 0 });
  const conduitsRef = useRef<ConduitObstacle[]>([
    { x: 300, y: 240, z: 400, type: 'blast_door' },
    { x: 440, y: 200, z: 700, type: 'pipe_junction' },
    { x: 370, y: 280, z: 1000, type: 'blast_door' },
  ]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'slalom') return;
      const s = shipPos.current;
      const step = 14;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') s.y = Math.max(100, s.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') s.y = Math.min(380, s.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        s.x = Math.max(120, s.x - step);
        s.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        s.x = Math.min(620, s.x + step);
        s.roll = 0.3;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        shipPos.current.roll = 0;
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
    setGameState('slalom');
    setScore(0);
    setShields(5);
    setSpeedKmH(1400);
    shipPos.current = { x: 370, y: 240, roll: 0 };
    conduitsRef.current = [
      { x: 300, y: 240, z: 400, type: 'blast_door' },
      { x: 440, y: 200, z: 700, type: 'pipe_junction' },
      { x: 370, y: 280, z: 1000, type: 'blast_door' },
    ];
  };

  // TIE Interceptor Death Star II Tunnel Slalom Loop
  useEffect(() => {
    if (gameState !== 'slalom') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 40);
      const s = shipPos.current;

      // Move conduits closer
      conduitsRef.current.forEach((c) => {
        c.z -= 6;
        if (c.z < 40 && c.z > 0) {
          if (Math.hypot(c.x - s.x, c.y - s.y) < 50) {
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
        if (c.z <= 0) {
          c.z = 1000;
          c.x = 200 + Math.random() * 340;
          c.y = 150 + Math.random() * 180;
        }
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Reactor Shaft Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Octagonal Tunnel Perspective Rings
      for (let r = 1; r <= 6; r++) {
        const radius = (r * 70 + (frame * 3) % 70);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let a = 0; a < 8; a++) {
          const angle = (a * Math.PI) / 4;
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius * 0.7;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw Approaching Conduit Obstacles
      conduitsRef.current.forEach((c) => {
        if (c.z > 0) {
          const scale = 300 / c.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;
          ctx.fillRect(c.x - 20 * scale, c.y - 20 * scale, 40 * scale, 40 * scale);
          ctx.strokeRect(c.x - 20 * scale, c.y - 20 * scale, 40 * scale, 40 * scale);
          ctx.shadowBlur = 0;
        }
      });

      // Draw Player Dagger-Winged TIE Interceptor
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Central Eyeball Cockpit
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 4 Pointed Dagger Solar Wings
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;

      // Top-Left & Bottom-Left Daggers
      ctx.beginPath();
      ctx.moveTo(-14, -6); ctx.lineTo(-45, -25); ctx.lineTo(-30, -5); ctx.closePath();
      ctx.moveTo(-14, 6); ctx.lineTo(-45, 25); ctx.lineTo(-30, 5); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Top-Right & Bottom-Right Daggers
      ctx.beginPath();
      ctx.moveTo(14, -6); ctx.lineTo(45, -25); ctx.lineTo(30, -5); ctx.closePath();
      ctx.moveTo(14, 6); ctx.lineTo(45, 25); ctx.lineTo(30, 5); ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, speedKmH]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Gauge className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              TIE INTERCEPTOR SLALOM // DEATH STAR II REACTOR SHAFT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              1,400 km/h supersonic conduit slalom run for {currentUser?.name}
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

        {gameState === 'slalom' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SPEED: </span>
                <span className="font-bold text-cyan-300">{speedKmH} km/h</span>
              </div>
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-amber-300">{shields} / 5</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD / ARROWS] STEER TIE INTERCEPTOR
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'slalom' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  {gameState === 'crashed' ? 'TIE INTERCEPTOR SMASHED INTO SUPERSTRUCTURE!' : 'DEATH STAR II REACTOR SLALOM'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Navigate the dagger-winged TIE Interceptor through narrow pipes, conduits, and closing blast doors inside the reactor core!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START REACTOR SLALOM</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
