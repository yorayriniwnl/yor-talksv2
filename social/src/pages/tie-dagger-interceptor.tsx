import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface ResistanceBWing {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieDaggerInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'intercept' | 'crashed' | 'resistance_routed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [bWingsDestroyed, setBWingsDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(310000);

  const daggerPos = useRef({ x: 370, y: 360, roll: 0 });
  const bWingsRef = useRef<ResistanceBWing[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireHeavySithLasers = () => {
    if (gameState !== 'intercept') return;
    uiaudio.warp();
    const d = daggerPos.current;

    // Check hit on Resistance B-Wings
    bWingsRef.current.forEach((b) => {
      if (b.alive && b.z < 520 && b.z > 50) {
        if (Math.hypot(b.x - d.x, b.y - d.y) < 65) {
          b.alive = false;
          uiaudio.success();
          setBWingsDestroyed(bd => bd + 1);
          setScore(sc => sc + 45000);
        }
      }
    });

    if (bWingsRef.current.every(b => !b.alive)) {
      setGameState('resistance_routed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 180000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'intercept') return;
      const d = daggerPos.current;
      const step = 16;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') d.y = Math.max(100, d.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') d.y = Math.min(420, d.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        d.x = Math.max(100, d.x - step);
        d.roll = -0.35;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        d.x = Math.min(640, d.x + step);
        d.roll = 0.35;
      }

      if (e.code === 'Space') fireHeavySithLasers();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        daggerPos.current.roll = 0;
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
    setGameState('intercept');
    setScore(0);
    setShields(8);
    setBWingsDestroyed(0);
    daggerPos.current = { x: 370, y: 360, roll: 0 };
    bWingsRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // TIE/dg Dagger Exegol Fleet Interceptor Loop
  useEffect(() => {
    if (gameState !== 'intercept') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const d = daggerPos.current;

      // Move B-Wings
      bWingsRef.current.forEach((b) => {
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

      // Exegol Sith Red Lightning Space Void
      ctx.fillStyle = '#0a0204';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Crimson Sith Lightning Bolts
      if (Math.random() < 0.15) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, 0);
        ctx.lineTo(Math.random() * canvas.width, canvas.height);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw Resistance B-Wings (Cross-like Heavy Bombers)
      bWingsRef.current.forEach((b) => {
        if (b.alive && b.z > 0) {
          const scale = 250 / b.z;
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          // Vertical B-Wing Blade
          ctx.rect(b.x - 4 * scale, b.y - 25 * scale, 8 * scale, 50 * scale);
          ctx.fill();
          ctx.stroke();

          // Cross S-Foils
          ctx.rect(b.x - 20 * scale, b.y + 10 * scale, 40 * scale, 6 * scale);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Sith Eternal TIE/dg Dagger (Triangular Knife Solar Wings + Spherical Eyeball)
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.roll);

      // Crimson Sith Armor Plates
      ctx.fillStyle = '#180306';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Spherical Central Cockpit Pod
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glowing Red Sith Cockpit Viewport
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Triangular Dagger Solar Wings (Left & Right Knife Blades)
      ctx.fillStyle = '#0f0203';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Left Triangular Blade
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-70, -45);
      ctx.lineTo(-65, 45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Triangular Blade
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(70, -45);
      ctx.lineTo(65, 45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy Crimson Laser Cannons (Wing-tip mounted)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-70, -45); ctx.lineTo(-70, -75);
      ctx.moveTo(70, -45); ctx.lineTo(70, -75);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-zinc-900 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-rose-300 to-amber-400">
              TIE DAGGER // SITH ETERNAL INTERCEPTOR
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/dg triangular heavy interceptor & Exegol fleet defense for {currentUser?.name}
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

        {gameState === 'intercept' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-red-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">B-WINGS: </span>
                <span className="font-bold text-amber-300">{bWingsDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-rose-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-red-400 font-bold">
              [WASD] FLY TIE DAGGER, [SPACE] HEAVY SITH LASERS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'intercept' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-rose-300 to-amber-400">
                  {gameState === 'resistance_routed' ? 'RESISTANCE B-WING SQUADRON DESTROYED!' : 'TIE/DG DAGGER INTERCEPTOR READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the razor-sharp Sith Eternal TIE/dg Dagger, fire heavy crimson laser cannons, and defend the Xyston Star Destroyer armada!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-700 to-amber-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE DAGGER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
