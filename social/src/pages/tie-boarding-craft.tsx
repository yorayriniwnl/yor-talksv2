import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Anchor
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PointDefenseLaser {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieBoardingCraft() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'boarding' | 'crashed' | 'bridge_breached'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(11);
  const [lasersDestroyed, setLasersDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(385000);

  const craftPos = useRef({ x: 370, y: 360, roll: 0 });
  const lasersRef = useRef<PointDefenseLaser[]>([
    { x: 240, y: 200, z: 320, alive: true },
    { x: 500, y: 190, z: 460, alive: true },
    { x: 370, y: 240, z: 580, alive: true },
    { x: 310, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireBoardingTorpedo = () => {
    if (gameState !== 'boarding') return;
    uiaudio.warp();
    const c = craftPos.current;

    // Check hit on Defense Lasers
    lasersRef.current.forEach((l) => {
      if (l.alive && l.z < 520 && l.z > 50) {
        if (Math.hypot(l.x - c.x, l.y - c.y) < 65) {
          l.alive = false;
          uiaudio.success();
          setLasersDestroyed(ld => ld + 1);
          setScore(sc => sc + 52000);
        }
      }
    });

    if (lasersRef.current.every(l => !l.alive)) {
      setGameState('bridge_breached');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 220000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'boarding') return;
      const c = craftPos.current;
      const step = 16;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') c.y = Math.max(100, c.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') c.y = Math.min(420, c.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        c.x = Math.max(100, c.x - step);
        c.roll = -0.35;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        c.x = Math.min(640, c.x + step);
        c.roll = 0.35;
      }

      if (e.code === 'Space') fireBoardingTorpedo();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        craftPos.current.roll = 0;
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
    setGameState('boarding');
    setScore(0);
    setShields(11);
    setLasersDestroyed(0);
    craftPos.current = { x: 370, y: 360, roll: 0 };
    lasersRef.current = [
      { x: 240, y: 200, z: 320, alive: true },
      { x: 500, y: 190, z: 460, alive: true },
      { x: 370, y: 240, z: 580, alive: true },
      { x: 310, y: 170, z: 640, alive: true },
    ];
  };

  // TIE/bc Boarding Craft Assault Loop
  useEffect(() => {
    if (gameState !== 'boarding') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const c = craftPos.current;

      // Move Defense Lasers
      lasersRef.current.forEach((l) => {
        l.z -= 4.3;
        if (l.z < 50 && l.z > 10 && l.alive) {
          l.z = 640; // Loop around
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

      // Mon Calamari Cruiser Hull Surface Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mon Cal Organic Hull Armor Plating Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      for (let d = 0; d < 5; d++) {
        const offset = (frame * 3 + d * 90) % 480;
        ctx.strokeRect(cx - 280 + d * 120, cy + 60, 60, 60);
      }

      // Draw Point-Defense Laser Turrets
      lasersRef.current.forEach((l) => {
        if (l.alive && l.z > 0) {
          const scale = 250 / l.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.arc(l.x, l.y, 14 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/bc Boarding Craft (Elongated Troop Pod + Breaching Drills + Bent Wings)
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.roll);

      // Heavy Beskar-Reinforced Armor
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Dual Elongated Marine Pods (Left & Right)
      // Left Pilot Pod
      ctx.beginPath();
      ctx.ellipse(-15, 0, 14, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Right Troop Marine Pod
      ctx.beginPath();
      ctx.ellipse(15, 0, 14, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Front Breaching Drills / Plasma Clamps (at 0, -26)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -22); ctx.lineTo(0, -38); ctx.lineTo(8, -22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cyan Pilot Viewport
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(-15, -8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bent Heavy Solar Wings (Left & Right Inward-Bent Wings)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Left Inward-Bent Wing
      ctx.beginPath();
      ctx.moveTo(-45, -35);
      ctx.lineTo(-65, -10);
      ctx.lineTo(-65, 10);
      ctx.lineTo(-45, 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Inward-Bent Wing
      ctx.beginPath();
      ctx.moveTo(45, -35);
      ctx.lineTo(65, -10);
      ctx.lineTo(65, 10);
      ctx.lineTo(45, 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Pylons
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-29, 0); ctx.lineTo(-45, 0);
      ctx.moveTo(29, 0); ctx.lineTo(45, 0);
      ctx.stroke();

      // Forward Defense Laser Cannon
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(15, -22); ctx.lineTo(15, -50);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-900 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Anchor className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
              TIE BOARDING CRAFT // MARINE ASSAULT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/bc Boarding Craft capital warship breach & stormtrooper insertion for {currentUser?.name}
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

        {gameState === 'boarding' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-400">{shields} / 11</span>
              </div>
              <div>
                <span className="text-zinc-400">DEFENSE TURRETS: </span>
                <span className="font-bold text-amber-400">{lasersDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-sky-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY TIE BOARDING CRAFT, [SPACE] LAUNCH BOARDING TORPEDO
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'boarding' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
                  {gameState === 'bridge_breached' ? 'REBEL CAPITAL CRUISER BRIDGE SEIZED!' : 'TIE/BC BOARDING CRAFT READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the armored TIE Boarding Craft, destroy point-defense turrets, and clamp onto the Rebel command bridge with plasma drills!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-700 to-amber-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH BOARDING CRAFT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
