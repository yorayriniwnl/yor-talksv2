import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield
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

export default function TieHunterAssault() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'assault' | 'crashed' | 'outpost_cleared'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(10);
  const [sFoilsOpen, setSFoilsOpen] = useState(true);
  const [gunshipsDestroyed, setGunshipsDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(465000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const gunshipsRef = useRef<RebelGunship[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const toggleSFoils = () => {
    uiaudio.warp();
    setSFoilsOpen(s => !s);
  };

  const fireTwinIonCannons = () => {
    if (gameState !== 'assault') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Rebel Gunships
    gunshipsRef.current.forEach((g) => {
      if (g.alive && g.z < 520 && g.z > 50) {
        if (Math.hypot(g.x - s.x, g.y - s.y) < 65) {
          g.alive = false;
          uiaudio.success();
          setGunshipsDestroyed(gd => gd + 1);
          setScore(sc => sc + 75000);
        }
      }
    });

    if (gunshipsRef.current.every(g => !g.alive)) {
      setGameState('outpost_cleared');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 300000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'assault') return;
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

      if (e.code === 'KeyX') toggleSFoils();
      if (e.code === 'Space') fireTwinIonCannons();
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
  }, [gameState, sFoilsOpen]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('assault');
    setScore(0);
    setShields(10);
    setSFoilsOpen(true);
    setGunshipsDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    gunshipsRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Hunter Assault Combat Loop
  useEffect(() => {
    if (gameState !== 'assault') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shipPos.current;

      // Move Rebel Gunships
      gunshipsRef.current.forEach((g) => {
        g.z -= 4.5;
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

      // Deep Space Outpost Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Rebel Space Station Core (Wireframe at Top)
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 80, 70, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Rebel Gunships
      gunshipsRef.current.forEach((g) => {
        if (g.alive && g.z > 0) {
          const scale = 250 / g.z;
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.ellipse(g.x, g.y, 32 * scale, 12 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/hu Hunter (Imperial Storm Commando Folding S-Foil Interceptor)
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
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // S-Foil Wings (Top Left, Top Right, Bottom Left, Bottom Right)
      const sAngle = sFoilsOpen ? 0.45 : 0.08;

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;

      // Top-Left Wing
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(-45 * Math.cos(sAngle), -45 * Math.sin(sAngle) - 15);
      ctx.stroke();

      // Top-Right Wing
      ctx.beginPath();
      ctx.moveTo(12, -8);
      ctx.lineTo(45 * Math.cos(sAngle), -45 * Math.sin(sAngle) - 15);
      ctx.stroke();

      // Bottom-Left Wing
      ctx.beginPath();
      ctx.moveTo(-12, 8);
      ctx.lineTo(-45 * Math.cos(sAngle), 45 * Math.sin(sAngle) + 15);
      ctx.stroke();

      // Bottom-Right Wing
      ctx.beginPath();
      ctx.moveTo(12, 8);
      ctx.lineTo(45 * Math.cos(sAngle), 45 * Math.sin(sAngle) + 15);
      ctx.stroke();

      // Twin Wingtip Ion Cannons (Cyan Glow)
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(-45 * Math.cos(sAngle), -45 * Math.sin(sAngle) - 15, 3.5, 0, Math.PI * 2);
      ctx.arc(45 * Math.cos(sAngle), -45 * Math.sin(sAngle) - 15, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, sFoilsOpen]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-sky-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(56,189,248,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-pink-300 to-cyan-400">
              TIE HUNTER // STORM COMMANDO ASSAULT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/hu folding S-foil Storm Commando ion interceptor combat for {currentUser?.name}
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
                <span className="font-bold text-sky-400">{shields} / 10</span>
              </div>
              <div>
                <span className="text-zinc-400">S-FOILS: </span>
                <span className={cn("font-bold", sFoilsOpen ? "text-emerald-400" : "text-amber-400")}>
                  {sFoilsOpen ? 'ATTACK POSITION' : 'CRUISE POSITION'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">GUNSHIPS: </span>
                <span className="font-bold text-pink-400">{gunshipsDestroyed} DESTROYED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-sky-400 font-bold">
              [X] S-FOILS, [WASD] FLY, [SPACE] TWIN ION CANNONS
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-pink-300 to-cyan-400">
                  {gameState === 'outpost_cleared' ? 'REBEL SPACE OUTPOST LIBERATED!' : 'TIE HUNTER READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the elite Storm Commando TIE/hu Hunter, open folding S-foils into attack configuration, and disable Rebel fleet gunships with heavy ion cannons!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-sky-600 via-pink-700 to-cyan-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH HUNTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
