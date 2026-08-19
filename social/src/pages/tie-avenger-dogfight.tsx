import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelBWingFighter {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieAvengerDogfight() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'dogfight' | 'crashed' | 'squadron_cleared'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(10);
  const [fightersDestroyed, setFightersDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(455000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const fightersRef = useRef<RebelBWingFighter[]>([
    { x: 220, y: 200, z: 320, alive: true },
    { x: 520, y: 190, z: 460, alive: true },
    { x: 370, y: 240, z: 580, alive: true },
    { x: 290, y: 160, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireQuadLasers = () => {
    if (gameState !== 'dogfight') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Rebel B-Wing Heavy Starfighters
    fightersRef.current.forEach((f) => {
      if (f.alive && f.z < 520 && f.z > 50) {
        if (Math.hypot(f.x - s.x, f.y - s.y) < 65) {
          f.alive = false;
          uiaudio.success();
          setFightersDestroyed(fd => fd + 1);
          setScore(sc => sc + 72000);
        }
      }
    });

    if (fightersRef.current.every(f => !f.alive)) {
      setGameState('squadron_cleared');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 290000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'dogfight') return;
      const s = shipPos.current;
      const step = 18;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') s.y = Math.max(100, s.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') s.y = Math.min(420, s.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        s.x = Math.max(100, s.x - step);
        s.roll = -0.35;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        s.x = Math.min(640, s.x + step);
        s.roll = 0.35;
      }

      if (e.code === 'Space') fireQuadLasers();
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
    setGameState('dogfight');
    setScore(0);
    setShields(10);
    setFightersDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    fightersRef.current = [
      { x: 220, y: 200, z: 320, alive: true },
      { x: 520, y: 190, z: 460, alive: true },
      { x: 370, y: 240, z: 580, alive: true },
      { x: 290, y: 160, z: 640, alive: true },
    ];
  };

  // TIE Avenger Advanced Interceptor Combat Loop
  useEffect(() => {
    if (gameState !== 'dogfight') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shipPos.current;

      // Move Rebel B-Wing Fighters
      fightersRef.current.forEach((f) => {
        f.z -= 4.6;
        if (f.z < 50 && f.z > 10 && f.alive) {
          f.z = 640; // Loop around
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

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Imperial Super Star Destroyer Vector Silhouette
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 150);
      ctx.lineTo(cx + 280, cy - 40);
      ctx.lineTo(cx - 280, cy - 40);
      ctx.closePath();
      ctx.stroke();

      // Draw Rebel A/SF-01 B-Wing Heavy Assault Starfighters
      fightersRef.current.forEach((f) => {
        if (f.alive && f.z > 0) {
          const scale = 250 / f.z;
          ctx.fillStyle = '#ec4899';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ec4899';
          ctx.shadowBlur = 14;

          // B-Wing Long Main Blade Foil + Gyroscopic Cockpit
          ctx.beginPath();
          ctx.rect(f.x - 4 * scale, f.y - 28 * scale, 8 * scale, 56 * scale);
          ctx.arc(f.x, f.y - 28 * scale, 9 * scale, 0, Math.PI * 2);
          ctx.rect(f.x - 18 * scale, f.y + 12 * scale, 36 * scale, 6 * scale);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/ad Avenger (Advanced Swept-Back Solar Wing Interceptor + Quad Laser Cannons)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Central Command Pod
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Pilot Viewport
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();

      // Swept-Back Solar Wings (Bent Wing Advanced Geometry)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;

      // Left Swept Wing
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-42, -28);
      ctx.lineTo(-65, -15);
      ctx.lineTo(-50, 24);
      ctx.lineTo(-42, 28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Swept Wing
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(42, -28);
      ctx.lineTo(65, -15);
      ctx.lineTo(50, 24);
      ctx.lineTo(42, 28);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Quad Heavy Laser Cannons (Wingtips)
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-65, -15, 3.5, 0, Math.PI * 2);
      ctx.arc(-50, 24, 3.5, 0, Math.PI * 2);
      ctx.arc(65, -15, 3.5, 0, Math.PI * 2);
      ctx.arc(50, 24, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-sky-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(56,189,248,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-pink-300 to-indigo-400">
              TIE AVENGER // ADVANCED DOGFIGHT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/ad Avenger quad-cannon swept-wing high-G interceptor combat for {currentUser?.name}
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

        {gameState === 'dogfight' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-sky-400">{shields} / 10</span>
              </div>
              <div>
                <span className="text-zinc-400">B-WINGS: </span>
                <span className="font-bold text-pink-400">{fightersDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-emerald-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-sky-400 font-bold">
              [WASD] HIGH-G DOGFIGHT, [SPACE] QUAD LASER CANNONS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'dogfight' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-pink-300 to-indigo-400">
                  {gameState === 'squadron_cleared' ? 'REBEL B-WING SQUADRON DESTROYED!' : 'TIE AVENGER READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the Imperial TIE/ad Avenger, deploy quad heavy laser cannons, and outmaneuver Rebel heavy assault starfighters!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-sky-600 via-pink-700 to-indigo-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH AVENGER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
