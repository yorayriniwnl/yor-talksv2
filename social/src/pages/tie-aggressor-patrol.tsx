import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelFreighter {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieAggressorPatrol() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'patrol' | 'crashed' | 'freighters_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(9);
  const [freightersDestroyed, setFreightersDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(355000);

  const aggressorPos = useRef({ x: 370, y: 360, roll: 0 });
  const freightersRef = useRef<RebelFreighter[]>([
    { x: 250, y: 210, z: 330, alive: true },
    { x: 490, y: 190, z: 470, alive: true },
    { x: 370, y: 250, z: 590, alive: true },
    { x: 310, y: 180, z: 650, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireTwinAndTurretLasers = () => {
    if (gameState !== 'patrol') return;
    uiaudio.warp();
    const a = aggressorPos.current;

    // Check hit on Rebel Freighters
    freightersRef.current.forEach((f) => {
      if (f.alive && f.z < 530 && f.z > 50) {
        if (Math.hypot(f.x - a.x, f.y - a.y) < 65) {
          f.alive = false;
          uiaudio.success();
          setFreightersDestroyed(fd => fd + 1);
          setScore(sc => sc + 50000);
        }
      }
    });

    if (freightersRef.current.every(f => !f.alive)) {
      setGameState('freighters_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 205000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'patrol') return;
      const a = aggressorPos.current;
      const step = 16;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') a.y = Math.max(100, a.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') a.y = Math.min(420, a.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        a.x = Math.max(100, a.x - step);
        a.roll = -0.35;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        a.x = Math.min(640, a.x + step);
        a.roll = 0.35;
      }

      if (e.code === 'Space') fireTwinAndTurretLasers();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        aggressorPos.current.roll = 0;
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
    setShields(9);
    setFreightersDestroyed(0);
    aggressorPos.current = { x: 370, y: 360, roll: 0 };
    freightersRef.current = [
      { x: 250, y: 210, z: 330, alive: true },
      { x: 490, y: 190, z: 470, alive: true },
      { x: 370, y: 250, z: 590, alive: true },
      { x: 310, y: 180, z: 650, alive: true },
    ];
  };

  // TIE/ag Aggressor Heavy Gunship Patrol Loop
  useEffect(() => {
    if (gameState !== 'patrol') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const a = aggressorPos.current;

      // Move Rebel Freighters
      freightersRef.current.forEach((f) => {
        f.z -= 4.2;
        if (f.z < 50 && f.z > 10 && f.alive) {
          f.z = 650; // Loop around
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

      // Asteroid Field Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Asteroid Outlines in Distance
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 5; s++) {
        const offset = (frame * 3 + s * 90) % 480;
        ctx.strokeRect(cx - 280 + s * 120, cy + 60, 60, 60);
      }

      // Draw Rebel GR-75 Medium Freighters (Clamshell Transport Ships)
      freightersRef.current.forEach((f) => {
        if (f.alive && f.z > 0) {
          const scale = 250 / f.z;
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.ellipse(f.x, f.y, 40 * scale, 16 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/ag Aggressor (Twin Cockpits + Rear Ball Turret + Stepped Solar Wings)
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.roll);

      // Heavy Reinforced Titanium Armor
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Central Elongated Fuselage (Pilot Pod + Gunner Pod Behind)
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Front Pilot Viewport (Glowing Green)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, -12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Rear 360-Degree Ball Turret (Top/Rear at 0, 12)
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rear Turret Twin Barrel (Rotates slightly with time)
      const turretAngle = Math.sin(frame * 0.08) * 0.6;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(Math.sin(turretAngle) * 22, 12 + Math.cos(turretAngle) * 22);
      ctx.stroke();

      // Stepped Heavy Solar Wings (Left & Right Cut-Corner Wings)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Left Wing
      ctx.beginPath();
      ctx.moveTo(-18, -10);
      ctx.lineTo(-65, -35);
      ctx.lineTo(-70, 35);
      ctx.lineTo(-18, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Wing
      ctx.beginPath();
      ctx.moveTo(18, -10);
      ctx.lineTo(65, -35);
      ctx.lineTo(70, 35);
      ctx.lineTo(18, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Forward Twin Heavy Green Laser Cannons
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-12, -26); ctx.lineTo(-12, -55);
      ctx.moveTo(12, -26); ctx.lineTo(12, -55);
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
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
              TIE AGGRESSOR // HEAVY GUNSHIP PATROL
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/ag twin-cockpit gunship & 360-degree ball turret convoy sweep for {currentUser?.name}
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
                <span className="font-bold text-cyan-400">{shields} / 9</span>
              </div>
              <div>
                <span className="text-zinc-400">FREIGHTERS: </span>
                <span className="font-bold text-amber-400">{freightersDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-sky-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY TIE AGGRESSOR, [SPACE] FORWARD CANNONS & TURRET BARRAGE
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
                  {gameState === 'freighters_destroyed' ? 'REBEL CONVOY FLEET NEUTRALIZED!' : 'TIE/AG AGGRESSOR READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the twin-cockpit TIE Aggressor heavy gunship, engage forward lasers and rear 360-degree turret fire, and annihilate Rebel cargo lines!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-700 to-emerald-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE AGGRESSOR</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
