import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelInterceptor {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieReaperDrop() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'orbital_drop' | 'crashed' | 'drop_completed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [troopersDeployed, setTroopersDeployed] = useState(0);
  const [highScore, setHighScore] = useState(285000);

  const reaperPos = useRef({ x: 370, y: 360, roll: 0 });
  const rebelsRef = useRef<RebelInterceptor[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireVentralHeavyCannons = () => {
    if (gameState !== 'orbital_drop') return;
    uiaudio.warp();
    const r = reaperPos.current;

    // Check hit on Rebel interceptors
    rebelsRef.current.forEach((reb) => {
      if (reb.alive && reb.z < 520 && reb.z > 50) {
        if (Math.hypot(reb.x - r.x, reb.y - r.y) < 65) {
          reb.alive = false;
          uiaudio.success();
          setTroopersDeployed(td => td + 4);
          setScore(sc => sc + 35000);
        }
      }
    });

    if (rebelsRef.current.every(reb => !reb.alive)) {
      setGameState('drop_completed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 160000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'orbital_drop') return;
      const r = reaperPos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') r.y = Math.max(100, r.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') r.y = Math.min(420, r.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        r.x = Math.max(100, r.x - step);
        r.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        r.x = Math.min(640, r.x + step);
        r.roll = 0.3;
      }

      if (e.code === 'Space') fireVentralHeavyCannons();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        reaperPos.current.roll = 0;
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
    setGameState('orbital_drop');
    setScore(0);
    setShields(8);
    setTroopersDeployed(0);
    reaperPos.current = { x: 370, y: 360, roll: 0 };
    rebelsRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // TIE/rp Reaper Orbital Drop Loop
  useEffect(() => {
    if (gameState !== 'orbital_drop') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 40);
      const r = reaperPos.current;

      // Move Rebel Interceptors
      rebelsRef.current.forEach((reb) => {
        reb.z -= 4.0;
        if (reb.z < 50 && reb.z > 10 && reb.alive) {
          reb.z = 640; // Loop around
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

      // Planetary Atmospheric Re-entry Sky Void
      ctx.fillStyle = '#180404';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Re-entry Ionized Plasma Flames
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      for (let f = 0; f < 8; f++) {
        const offset = (frame * 5 + f * 60) % 480;
        ctx.beginPath();
        ctx.moveTo(cx - 320 + f * 80, 0);
        ctx.lineTo(cx - 320 + f * 80, canvas.height);
        ctx.stroke();
      }

      // Draw Rebel X-Wings
      rebelsRef.current.forEach((reb) => {
        if (reb.alive && reb.z > 0) {
          const scale = 250 / reb.z;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          // X-Wing Cross Form
          ctx.moveTo(reb.x, reb.y - 15 * scale);
          ctx.lineTo(reb.x + 20 * scale, reb.y + 12 * scale);
          ctx.lineTo(reb.x - 20 * scale, reb.y + 12 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/rp Reaper (Massive Flat Forward Wings + Large Armored Hull)
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.roll);

      // Heavy Armored Dark Imperial Gray Hull
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Large Elongated Armored Troop Fuselage
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Glowing Cockpit Viewport
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, -15, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Massive Pointed Forward-Facing Flat Solar Wings (Left & Right)
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Left Giant Wing
      ctx.beginPath();
      ctx.moveTo(-18, -25);
      ctx.lineTo(-85, 30);
      ctx.lineTo(-18, 38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Giant Wing
      ctx.beginPath();
      ctx.moveTo(18, -25);
      ctx.lineTo(85, 30);
      ctx.lineTo(18, 38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ventral Green Heavy Blaster Cannons
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-12, 10); ctx.lineTo(-12, -25);
      ctx.moveTo(12, 10); ctx.lineTo(12, -25);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-zinc-700 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-200 to-cyan-400">
              TIE REAPER // ORBITAL FLEET DROP COMBAT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/rp heavy troop transport & Death Trooper insertion vs Rebel X-Wings for {currentUser?.name}
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

        {gameState === 'orbital_drop' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">HULL: </span>
                <span className="font-bold text-red-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">DEATH TROOPERS: </span>
                <span className="font-bold text-amber-300">{troopersDeployed} INSERTED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-red-400 font-bold">
              [WASD] PILOT TIE REAPER, [SPACE] VENTRAL CANNONS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'orbital_drop' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
                  {gameState === 'drop_completed' ? 'DEATH TROOPER DROP COMPLETED!' : 'TIE REAPER ATTACK LANDER READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the heavy armored TIE/rp Reaper through planetary re-entry flak, destroy Rebel interceptors, and secure ground drop zones!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-zinc-700 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>COMMENCE ORBITAL DROP</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
