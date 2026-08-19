import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PirateGunship {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function Z95Headhunter() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'patrol' | 'crashed' | 'pirates_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(6);
  const [missilesCount, setMissilesCount] = useState(4);
  const [highScore, setHighScore] = useState(245000);

  const z95Pos = useRef({ x: 370, y: 360, roll: 0 });
  const gunshipsRef = useRef<PirateGunship[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireTwinBlasters = () => {
    if (gameState !== 'patrol') return;
    uiaudio.warp();
    const z = z95Pos.current;

    // Check hit on Pirate Gunships
    gunshipsRef.current.forEach((g) => {
      if (g.alive && g.z < 520 && g.z > 50) {
        if (Math.hypot(g.x - z.x, g.y - z.y) < 65) {
          g.alive = false;
          uiaudio.success();
          setScore(sc => sc + 25000);
        }
      }
    });

    if (gunshipsRef.current.every(g => !g.alive)) {
      setGameState('pirates_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 130000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'patrol') return;
      const z = z95Pos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') z.y = Math.max(100, z.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') z.y = Math.min(420, z.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        z.x = Math.max(100, z.x - step);
        z.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        z.x = Math.min(640, z.x + step);
        z.roll = 0.3;
      }

      if (e.code === 'Space') fireTwinBlasters();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        z95Pos.current.roll = 0;
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
    setGameState('patrol');
    setScore(0);
    setShields(6);
    setMissilesCount(4);
    z95Pos.current = { x: 370, y: 360, roll: 0 };
    gunshipsRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // Z-95 Headhunter Outer Rim Patrol Loop
  useEffect(() => {
    if (gameState !== 'patrol') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const z = z95Pos.current;

      // Move Gunships
      gunshipsRef.current.forEach((g) => {
        g.z -= 4.0;
        if (g.z < 50 && g.z > 10 && g.alive) {
          g.z = 640; // Loop around
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

      // Dark Outer Rim Star Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Frontier Asteroid Field Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 6; s++) {
        const offset = (frame * 3 + s * 80) % 480;
        ctx.strokeRect(cx - 300 + s * 100, cy + 40 + (s % 2) * 50, 45, 45);
      }

      // Draw Pirate Heavy Gunships (Red/Amber Boxy Gunships)
      gunshipsRef.current.forEach((g) => {
        if (g.alive && g.z > 0) {
          const scale = 250 / g.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.rect(g.x - 22 * scale, g.y - 14 * scale, 44 * scale, 28 * scale);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Z-95 Headhunter Starfighter (Sleek Single Cockpit, Flat Long Nose, Twin Wingtips)
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(z.roll);

      // Turquoise / Cyan & White Hull
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      // Long Flat Fuselage
      ctx.beginPath();
      ctx.moveTo(0, -45);
      ctx.lineTo(12, 10);
      ctx.lineTo(6, 40);
      ctx.lineTo(-6, 40);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Straight Swing Wings (Left & Right)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-55, 10, 43, 14); // Left Wing
      ctx.fillRect(12, 10, 43, 14);  // Right Wing

      // Twin Wingtip Red Laser Cannons
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-55, 10); ctx.lineTo(-55, -25);
      ctx.moveTo(55, 10); ctx.lineTo(55, -25);
      ctx.stroke();

      // Twin Aft Sublight Thruster Glow
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16;
      ctx.fillRect(-8, 40, 5, 12);
      ctx.fillRect(3, 40, 5, 12);
      ctx.shadowBlur = 0;

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-amber-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-200 to-amber-400">
              Z-95 HEADHUNTER // OUTER RIM FRONTIER PATROL
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Classic Incom/Subpro starfighter vs Pirate Gunships for {currentUser?.name}
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

        {gameState === 'patrol' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-300">{shields} / 6</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY Z-95, [SPACE] WINGTIP LASER CANNONS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'patrol' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
                  {gameState === 'pirates_destroyed' ? 'PIRATE RAIDERS ROUTED!' : 'Z-95 HEADHUNTER PATROL READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the nimble Z-95 Headhunter through outer rim frontier sectors and blast pirate gunships!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-amber-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>LAUNCH Z-95 HEADHUNTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
