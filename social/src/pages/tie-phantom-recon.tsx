import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, EyeOff
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelGunship {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TiePhantomRecon() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'recon' | 'crashed' | 'gunships_eliminated'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [stygiumCloaked, setStygiumCloaked] = useState(false);
  const [gunshipsDestroyed, setGunshipsDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(335000);

  const phantomPos = useRef({ x: 370, y: 360, roll: 0 });
  const gunshipsRef = useRef<RebelGunship[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const toggleStygiumCloak = () => {
    uiaudio.warp();
    setStygiumCloaked(c => !c);
  };

  const fireTripleLaserCannons = () => {
    if (gameState !== 'recon') return;
    uiaudio.warp();
    const p = phantomPos.current;

    // Check hit on Rebel Gunships
    gunshipsRef.current.forEach((g) => {
      if (g.alive && g.z < 520 && g.z > 50) {
        if (Math.hypot(g.x - p.x, g.y - p.y) < 65) {
          g.alive = false;
          uiaudio.success();
          setGunshipsDestroyed(gd => gd + 1);
          setScore(sc => sc + (stygiumCloaked ? 65000 : 45000));
        }
      }
    });

    if (gunshipsRef.current.every(g => !g.alive)) {
      setGameState('gunships_eliminated');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 195000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'recon') return;
      const p = phantomPos.current;
      const step = 16;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') p.y = Math.max(100, p.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') p.y = Math.min(420, p.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        p.x = Math.max(100, p.x - step);
        p.roll = -0.35;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        p.x = Math.min(640, p.x + step);
        p.roll = 0.35;
      }

      if (e.code === 'Space') fireTripleLaserCannons();
      if (e.code === 'KeyC') toggleStygiumCloak();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        phantomPos.current.roll = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, stygiumCloaked]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('recon');
    setScore(0);
    setShields(8);
    setStygiumCloaked(false);
    setGunshipsDestroyed(0);
    phantomPos.current = { x: 370, y: 360, roll: 0 };
    gunshipsRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // TIE/ph Phantom v38 Cloaked Assault Loop
  useEffect(() => {
    if (gameState !== 'recon') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const p = phantomPos.current;

      // Move Rebel Gunships
      gunshipsRef.current.forEach((g) => {
        g.z -= 4.2;
        if (g.z < 50 && g.z > 10 && g.alive) {
          g.z = 640; // Loop around
          if (!stygiumCloaked) {
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

      // Deep Space Cloaking Nebula Void
      ctx.fillStyle = '#05030a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebula Ion Field Dust Particles
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 5; s++) {
        const offset = (frame * 3 + s * 90) % 480;
        ctx.strokeRect(cx - 280 + s * 120, cy + 60, 70, 70);
      }

      // Draw Rebel Gunships (Broad-Wing DP20 Gunships)
      gunshipsRef.current.forEach((g) => {
        if (g.alive && g.z > 0) {
          const scale = 250 / g.z;
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.moveTo(g.x, g.y - 18 * scale);
          ctx.lineTo(g.x + 28 * scale, g.y + 14 * scale);
          ctx.lineTo(g.x - 28 * scale, g.y + 14 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Imperial TIE/ph Phantom (Tri-Wing Inward Starfighter + Triple Cannons)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.roll);

      if (stygiumCloaked) {
        ctx.globalAlpha = 0.35;
      }

      // Dark Titanium Phantom Hull
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Multi-Crew Cockpit Pod
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Green Stygium Sensor Viewport
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = stygiumCloaked ? 4 : 16;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Tri-Wing Configuration (1 Top Vertical Fin + 2 Inward Canted Lower Wings)
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;

      // Top Vertical Fin
      ctx.beginPath();
      ctx.moveTo(-6, -15);
      ctx.lineTo(0, -65);
      ctx.lineTo(6, -15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Left Inward-Canted Wing
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(-65, 45);
      ctx.lineTo(-45, 55);
      ctx.lineTo(-10, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Inward-Canted Wing
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(65, 45);
      ctx.lineTo(45, 55);
      ctx.lineTo(10, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Triple Heavy Green Laser Cannons (1 on Top Fin, 2 on Wing Tips)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -65); ctx.lineTo(0, -95);
      ctx.moveTo(-65, 45); ctx.lineTo(-65, 15);
      ctx.moveTo(65, 45); ctx.lineTo(65, 15);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, stygiumCloaked]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-900 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <EyeOff className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400">
              TIE PHANTOM // STYGIUM CLOAKED ASSAULT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/ph v38 tri-wing multi-crew stealth starfighter for {currentUser?.name}
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

        {gameState === 'recon' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">STYGIUM CLOAK: </span>
                <span className={cn("font-bold", stygiumCloaked ? "text-emerald-400" : "text-zinc-500")}>
                  {stygiumCloaked ? 'ACTIVE (INVISIBLE)' : 'DEACTIVATED'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-sky-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY, [SPACE] TRIPLE LASERS, [C] TOGGLE STYGIUM CLOAK
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'recon' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400">
                  {gameState === 'gunships_eliminated' ? 'REBEL ESCORT FLEET DESTROYED!' : 'TIE/PH PHANTOM V38 READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the legendary tri-wing TIE Phantom, activate Stygium cloaking to evade enemy tracking, and unleash devastating triple laser barrages!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-700 to-purple-800 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE PHANTOM</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
