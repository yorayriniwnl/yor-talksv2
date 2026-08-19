import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Shield, Rocket
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelFlakBattery {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieShuttleEvacuation() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'evacuation' | 'crashed' | 'evac_complete'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(12);
  const [batteriesDestroyed, setBatteriesDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(375000);

  const shuttlePos = useRef({ x: 370, y: 360, roll: 0 });
  const batteriesRef = useRef<RebelFlakBattery[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireDefensiveTurretSalvo = () => {
    if (gameState !== 'evacuation') return;
    uiaudio.warp();
    const s = shuttlePos.current;

    // Check hit on Flak Batteries
    batteriesRef.current.forEach((b) => {
      if (b.alive && b.z < 520 && b.z > 50) {
        if (Math.hypot(b.x - s.x, b.y - s.y) < 65) {
          b.alive = false;
          uiaudio.success();
          setBatteriesDestroyed(bd => bd + 1);
          setScore(sc => sc + 48000);
        }
      }
    });

    if (batteriesRef.current.every(b => !b.alive)) {
      setGameState('evac_complete');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 215000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'evacuation') return;
      const s = shuttlePos.current;
      const step = 16;

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

      if (e.code === 'Space') fireDefensiveTurretSalvo();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        shuttlePos.current.roll = 0;
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
    setGameState('evacuation');
    setScore(0);
    setShields(12);
    setBatteriesDestroyed(0);
    shuttlePos.current = { x: 370, y: 360, roll: 0 };
    batteriesRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE/sh Shuttle Evacuation Loop
  useEffect(() => {
    if (gameState !== 'evacuation') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shuttlePos.current;

      // Move Flak Batteries
      batteriesRef.current.forEach((b) => {
        b.z -= 4.2;
        if (b.z < 50 && b.z > 10 && b.alive) {
          b.z = 640; // Loop around
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

      // Exploding Orbital Station Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Station Debris Grid Lines
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 1;
      for (let d = 0; d < 5; d++) {
        const offset = (frame * 3 + d * 90) % 480;
        ctx.strokeRect(cx - 280 + d * 120, cy + 60, 60, 60);
      }

      // Draw Rebel Flak Platforms
      batteriesRef.current.forEach((b) => {
        if (b.alive && b.z > 0) {
          const scale = 250 / b.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.rect(b.x - 18 * scale, b.y - 12 * scale, 36 * scale, 24 * scale);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/sh Shuttle (Dual Pod Heavy Fuselage + Inverted Bent Wings)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Heavy Reinforced Armor
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Left Pilot Pod
      ctx.beginPath();
      ctx.arc(-16, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Right Passenger/VIP Evac Pod
      ctx.beginPath();
      ctx.arc(16, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cyan Pilot Viewport
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(-16, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Bent Heavy Solar Wings (Left & Right Outward-Bent Shield Wings)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Left Bent Wing
      ctx.beginPath();
      ctx.moveTo(-45, -40);
      ctx.lineTo(-65, -15);
      ctx.lineTo(-65, 15);
      ctx.lineTo(-45, 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Bent Wing
      ctx.beginPath();
      ctx.moveTo(45, -40);
      ctx.lineTo(65, -15);
      ctx.lineTo(65, 15);
      ctx.lineTo(45, 40);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Connecting Structural Bridge
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-31, 0); ctx.lineTo(31, 0);
      ctx.stroke();

      // Forward Defense Laser Cannon
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-16, -15); ctx.lineTo(-16, -45);
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
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
              TIE SHUTTLE // ORBITAL EVACUATION ESCORT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/sh Command Shuttle VIP orbital escort & flak battery suppression for {currentUser?.name}
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

        {gameState === 'evacuation' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-400">{shields} / 12</span>
              </div>
              <div>
                <span className="text-zinc-400">FLAK BATTERIES: </span>
                <span className="font-bold text-amber-400">{batteriesDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-sky-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY TIE SHUTTLE, [SPACE] FIRE POINT-DEFENSE TURRET
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'evacuation' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
                  {gameState === 'evac_complete' ? 'VIP ORBITAL EVACUATION SUCCESSFUL!' : 'TIE/SH COMMAND SHUTTLE READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the heavily armored TIE Command Shuttle, suppress Rebel surface flak batteries, and escort VIP pods to hyperspace safety!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-700 to-amber-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE SHUTTLE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
