import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface ImperialTurret {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function GauntletFighterCombat() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'combat' | 'crashed' | 'mandalore_liberated'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(6);
  const [wingRotationAngle, setWingRotationAngle] = useState(0);
  const [highScore, setHighScore] = useState(195000);

  const gauntletPos = useRef({ x: 370, y: 350, roll: 0 });
  const turretsRef = useRef<ImperialTurret[]>([
    { x: 280, y: 200, z: 320, alive: true },
    { x: 460, y: 190, z: 480, alive: true },
    { x: 370, y: 240, z: 620, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireHeavyLasers = () => {
    if (gameState !== 'combat') return;
    uiaudio.warp();
    const g = gauntletPos.current;

    // Check hit on Imperial orbital turrets
    turretsRef.current.forEach((t) => {
      if (t.alive && t.z < 500 && t.z > 50) {
        if (Math.hypot(t.x - g.x, t.y - g.y) < 65) {
          t.alive = false;
          uiaudio.success();
          setScore(sc => sc + 30000);
        }
      }
    });

    if (turretsRef.current.every(t => !t.alive)) {
      setGameState('mandalore_liberated');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 130000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'combat') return;
      const g = gauntletPos.current;
      const step = 14;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') g.y = Math.max(100, g.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') g.y = Math.min(420, g.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        g.x = Math.max(100, g.x - step);
        g.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        g.x = Math.min(640, g.x + step);
        g.roll = 0.3;
      }

      if (e.code === 'Space') fireHeavyLasers();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        gauntletPos.current.roll = 0;
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
    setGameState('combat');
    setScore(0);
    setShields(6);
    gauntletPos.current = { x: 370, y: 350, roll: 0 };
    turretsRef.current = [
      { x: 280, y: 200, z: 320, alive: true },
      { x: 460, y: 190, z: 480, alive: true },
      { x: 370, y: 240, z: 620, alive: true },
    ];
  };

  // Kom'rk-Class Gauntlet Fighter Dogfight Loop
  useEffect(() => {
    if (gameState !== 'combat') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const g = gauntletPos.current;
      setWingRotationAngle((frame * 0.05) % (Math.PI * 2));

      // Move Turrets
      turretsRef.current.forEach((t) => {
        t.z -= 3.5;
        if (t.z < 50 && t.z > 10 && t.alive) {
          t.z = 620; // Loop around
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

      // Dark Mandalore Orbit Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mandalore Planet Horizon (Teal / Amber Atmosphere Arc)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, canvas.height + 400, 520, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Imperial Orbital Turrets
      turretsRef.current.forEach((t) => {
        if (t.alive && t.z > 0) {
          const scale = 250 / t.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.strokeRect(t.x - 20 * scale, t.y - 20 * scale, 40 * scale, 40 * scale);
          ctx.fillRect(t.x - 20 * scale, t.y - 20 * scale, 40 * scale, 40 * scale);
          ctx.shadowBlur = 0;
        }
      });

      // Draw Mandalorian Kom'rk-class Gauntlet Fighter
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.roll);

      // Rotating Outer Scissor Wings (Kom'rk signature feature)
      ctx.save();
      ctx.rotate(Math.sin(frame * 0.04) * 0.4);

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;

      // Left Swept Wing
      ctx.beginPath();
      ctx.moveTo(-15, 0); ctx.lineTo(-75, -45); ctx.lineTo(-60, 40); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Right Swept Wing
      ctx.beginPath();
      ctx.moveTo(15, 0); ctx.lineTo(75, -45); ctx.lineTo(60, 40); ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.restore();

      // Central Command Cockpit Pod (Stays stationary relative to ship heading)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -35); ctx.lineTo(-14, 25); ctx.lineTo(14, 25); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Forward Heavy Lasers
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, -35); ctx.lineTo(-8, -50);
      ctx.moveTo(8, -35); ctx.lineTo(8, -50);
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              MANDALORIAN GAUNTLET // KOM'RK-CLASS FIGHTER COMBAT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rotating wing assault & orbital turret liberation for {currentUser?.name}
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

        {gameState === 'combat' && (
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
              [WASD / ARROWS] STEER GAUNTLET, [SPACE] HEAVY LASERS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'combat' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  {gameState === 'mandalore_liberated' ? 'MANDALORE IS LIBERATED - FOR MANDALORE!' : 'KOM\'RK GAUNTLET ASSAULT'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the rotating-wing Mandalorian Gauntlet fighter to eliminate Imperial orbital defenses!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH GAUNTLET FIGHTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
