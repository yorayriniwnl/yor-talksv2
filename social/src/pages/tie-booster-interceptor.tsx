import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, FastForward
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelAWingInterceptors {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieBoosterInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'pursuit' | 'crashed' | 'interceptors_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(10);
  const [boostEnergy, setBoostEnergy] = useState(100);
  const [isBoosting, setIsBoosting] = useState(false);
  const [awingsDestroyed, setAwingsDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(510000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const awingsRef = useRef<RebelAWingInterceptors[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireRapidLasers = () => {
    if (gameState !== 'pursuit') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Rebel A-Wings
    awingsRef.current.forEach((a) => {
      if (a.alive && a.z < 520 && a.z > 50) {
        if (Math.hypot(a.x - s.x, a.y - s.y) < 65) {
          a.alive = false;
          uiaudio.success();
          setAwingsDestroyed(ad => ad + 1);
          setScore(sc => sc + 90000);
        }
      }
    });

    if (awingsRef.current.every(a => !a.alive)) {
      setGameState('interceptors_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 350000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'pursuit') return;
      const s = shipPos.current;
      const step = isBoosting ? 26 : 18;

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

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsBoosting(true);
        uiaudio.warp();
      }

      if (e.code === 'Space') fireRapidLasers();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        shipPos.current.roll = 0;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsBoosting(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, isBoosting]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('pursuit');
    setScore(0);
    setShields(10);
    setBoostEnergy(100);
    setIsBoosting(false);
    setAwingsDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    awingsRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Booster Pursuit Combat Loop
  useEffect(() => {
    if (gameState !== 'pursuit') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + (isBoosting ? 90 : 45));
      const s = shipPos.current;

      const speed = isBoosting ? 7.5 : 5.0;

      // Move Rebel A-Wings
      awingsRef.current.forEach((a) => {
        a.z -= speed;
        if (a.z < 50 && a.z > 10 && a.alive) {
          a.z = 640; // Loop around
          setShields(shield => {
            if (shield <= 1) {
              setGameState('crashed');
              uiaudio.error();
              return 0;
            }
            uiaudio.error();
            return shield - 1;
          });
        }
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Deep Space Canyon Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Speed lines
      for (let i = 0; i < 15; i++) {
        const lineX = (i * 50 + frame * (isBoosting ? 18 : 8)) % canvas.width;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lineX, 0); ctx.lineTo(lineX - 40, canvas.height);
        ctx.stroke();
      }

      // Draw Rebel A-Wings (High-Speed Wedge Shape)
      awingsRef.current.forEach((a) => {
        if (a.alive && a.z > 0) {
          const scale = 250 / a.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y - 18 * scale);
          ctx.lineTo(a.x + 15 * scale, a.y + 16 * scale);
          ctx.lineTo(a.x - 15 * scale, a.y + 16 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/exp M2 Booster (Command Pod + Twin Huge Aft Cylindrical Booster Engines)
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

      // Pilot Viewport
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Twin Huge Aft Booster Engines (Top & Bottom on Pod)
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = isBoosting ? '#ec4899' : '#06b6d4';
      ctx.lineWidth = 3;

      // Left Booster
      ctx.fillRect(-28, -6, 12, 28);
      ctx.strokeRect(-28, -6, 12, 28);

      // Right Booster
      ctx.fillRect(16, -6, 12, 28);
      ctx.strokeRect(16, -6, 12, 28);

      // Massive Exhaust Flames
      ctx.fillStyle = isBoosting ? '#ec4899' : '#06b6d4';
      ctx.shadowColor = isBoosting ? '#ec4899' : '#06b6d4';
      ctx.shadowBlur = isBoosting ? 25 : 12;

      ctx.beginPath();
      ctx.moveTo(-28, 22); ctx.lineTo(-22, 22 + (isBoosting ? 38 : 20)); ctx.lineTo(-16, 22);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(16, 22); ctx.lineTo(22, 22 + (isBoosting ? 38 : 20)); ctx.lineTo(28, 22);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Small Cutout Solar Wings
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-36, -20); ctx.lineTo(-36, 20);
      ctx.moveTo(36, -20); ctx.lineTo(36, 20);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, isBoosting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <FastForward className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-400">
              TIE BOOSTER // HIGH-SPEED INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/exp M2 Booster twin oversized ion afterburner dogfight for {currentUser?.name}
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

        {gameState === 'pursuit' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-sky-400">{shields} / 10</span>
              </div>
              <div>
                <span className="text-zinc-400">BOOST: </span>
                <span className={cn("font-bold", isBoosting ? "text-pink-400 animate-pulse" : "text-cyan-400")}>
                  {isBoosting ? 'AFTERBURNER ACTIVE' : 'CRUISE DRIVE'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">A-WINGS: </span>
                <span className="font-bold text-emerald-400">{awingsDestroyed} INTERCEPTED</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-pink-400 font-bold">
              [WASD] FLY, [SHIFT] BOOST, [SPACE] RAPID LASERS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'pursuit' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-400">
                  {gameState === 'interceptors_destroyed' ? 'REBEL A-WING SQUADRON INTERCEPTED!' : 'TIE BOOSTER READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the extreme-speed Imperial TIE/exp M2 Booster, engage twin aft ion afterburners, and intercept high-speed Rebel A-wings!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-600 via-rose-700 to-cyan-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH BOOSTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
