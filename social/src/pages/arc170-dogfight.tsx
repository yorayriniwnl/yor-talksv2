import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface VultureDroid {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function Arc170Dogfight() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'dogfight' | 'crashed' | 'separatists_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(10); // Heavy clone armor (10 HP)
  const [highScore, setHighScore] = useState(235000);

  const arc170Pos = useRef({ x: 370, y: 360, roll: 0 });
  const droidsRef = useRef<VultureDroid[]>([
    { x: 240, y: 200, z: 320, alive: true },
    { x: 500, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 290, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireHeavyLasers = () => {
    if (gameState !== 'dogfight') return;
    uiaudio.warp();
    const a = arc170Pos.current;

    // Check hit on Vulture Droids
    droidsRef.current.forEach((d) => {
      if (d.alive && d.z < 540 && d.z > 50) {
        if (Math.hypot(d.x - a.x, d.y - a.y) < 70) {
          d.alive = false;
          uiaudio.success();
          setScore(sc => sc + 30000);
        }
      }
    });

    if (droidsRef.current.every(d => !d.alive)) {
      setGameState('separatists_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 150000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'dogfight') return;
      const a = arc170Pos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') a.y = Math.max(100, a.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') a.y = Math.min(420, a.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        a.x = Math.max(100, a.x - step);
        a.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        a.x = Math.min(640, a.x + step);
        a.roll = 0.3;
      }

      if (e.code === 'Space') fireHeavyLasers();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        arc170Pos.current.roll = 0;
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
    arc170Pos.current = { x: 370, y: 360, roll: 0 };
    droidsRef.current = [
      { x: 240, y: 200, z: 320, alive: true },
      { x: 500, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 290, y: 180, z: 640, alive: true },
    ];
  };

  // ARC-170 Coruscant Upper Atmosphere Dogfight Loop
  useEffect(() => {
    if (gameState !== 'dogfight') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 40);
      const a = arc170Pos.current;

      // Move Vulture Droids
      droidsRef.current.forEach((d) => {
        d.z -= 4.0;
        if (d.z < 50 && d.z > 10 && d.alive) {
          d.z = 640; // Loop around
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

      // Dark Coruscant Upper Sky Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Coruscant Ecumenopolis City Spire Grid below
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 8; s++) {
        const offset = (frame * 3 + s * 70) % 480;
        ctx.strokeRect(cx - 320 + s * 80, cy + 80, 50, 160);
      }

      // Draw Separatist Vulture Droids (Brown/Blue Scissor Fighters)
      droidsRef.current.forEach((d) => {
        if (d.alive && d.z > 0) {
          const scale = 250 / d.z;
          ctx.fillStyle = '#b45309';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;

          // Vulture Head + Twin Scissor Wings
          ctx.beginPath();
          ctx.moveTo(d.x, d.y - 18 * scale);
          ctx.lineTo(d.x + 22 * scale, d.y + 14 * scale);
          ctx.lineTo(d.x - 22 * scale, d.y + 14 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw ARC-170 Heavy Starfighter (Six Split Wings & Long Nose)
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.roll);

      // Heavy Red & White Armored Hull
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      // Long Forward Cockpit Fuselage
      ctx.beginPath();
      ctx.moveTo(0, -50);
      ctx.lineTo(14, 15);
      ctx.lineTo(8, 45);
      ctx.lineTo(-8, 45);
      ctx.lineTo(-14, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Six Split S-Foil Strike Wings (Main, Upper, Lower)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      // Left Wings
      ctx.beginPath();
      ctx.moveTo(-14, 10); ctx.lineTo(-65, -15);
      ctx.moveTo(-14, 20); ctx.lineTo(-75, 20);
      ctx.moveTo(-14, 30); ctx.lineTo(-65, 55);
      // Right Wings
      ctx.moveTo(14, 10); ctx.lineTo(65, -15);
      ctx.moveTo(14, 20); ctx.lineTo(75, 20);
      ctx.moveTo(14, 30); ctx.lineTo(65, 55);
      ctx.stroke();

      // Wingtip Heavy Green Laser Cannons
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-75, 20); ctx.lineTo(-75, -25);
      ctx.moveTo(75, 20); ctx.lineTo(75, -25);
      ctx.stroke();

      // Aft Tail Gunner Turret (Cyan Needle)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 45); ctx.lineTo(0, 65);
      ctx.stroke();

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-yellow-200 to-cyan-400">
              ARC-170 STARFIGHTER // CORUSCANT ORBITAL DOGFIGHT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Clone heavy strike fighter & wingtip laser cannons vs Vulture Droids for {currentUser?.name}
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
                <span className="text-zinc-400">HULL SHIELDS: </span>
                <span className="font-bold text-red-400">{shields} / 10</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-yellow-400 font-bold">
              [WASD] FLY ARC-170, [SPACE] HEAVY WING CANNONS
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-yellow-300 to-cyan-400">
                  {gameState === 'separatists_destroyed' ? 'SEPARATIST SWARM DESTROYED!' : 'ARC-170 CLONE SQUADRON READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the heavy six-wing ARC-170 Starfighter above Coruscant and blast through Separatist Vulture Droids with heavy cannons!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH ARC-170 STARFIGHTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
