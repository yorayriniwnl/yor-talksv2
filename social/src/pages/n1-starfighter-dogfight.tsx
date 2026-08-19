import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PirateCorvette {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function N1StarfighterDogfight() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'dogfight' | 'crashed' | 'corvettes_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(6);
  const [turbocavityBoostActive, setTurbocavityBoostActive] = useState(false);
  const [highScore, setHighScore] = useState(205000);

  const n1Pos = useRef({ x: 370, y: 360, roll: 0 });
  const corvettesRef = useRef<PirateCorvette[]>([
    { x: 260, y: 200, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 230, z: 620, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireTwinBlasters = () => {
    if (gameState !== 'dogfight') return;
    uiaudio.warp();
    const n = n1Pos.current;

    // Check hit on pirate corvettes
    corvettesRef.current.forEach((c) => {
      if (c.alive && c.z < 500 && c.z > 50) {
        if (Math.hypot(c.x - n.x, c.y - n.y) < 65) {
          c.alive = false;
          uiaudio.success();
          setScore(sc => sc + 35000);
        }
      }
    });

    if (corvettesRef.current.every(c => !c.alive)) {
      setGameState('corvettes_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 140000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'dogfight') return;
      const n = n1Pos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') n.y = Math.max(100, n.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') n.y = Math.min(420, n.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        n.x = Math.max(100, n.x - step);
        n.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        n.x = Math.min(640, n.x + step);
        n.roll = 0.3;
      }

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setTurbocavityBoostActive(true);
        uiaudio.warp();
      }

      if (e.code === 'Space') fireTwinBlasters();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        n1Pos.current.roll = 0;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setTurbocavityBoostActive(false);
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
    setGameState('dogfight');
    setScore(0);
    setShields(6);
    n1Pos.current = { x: 370, y: 360, roll: 0 };
    corvettesRef.current = [
      { x: 260, y: 200, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 230, z: 620, alive: true },
    ];
  };

  // Modified Naboo N-1 Starfighter Outer Rim Dogfight Loop
  useEffect(() => {
    if (gameState !== 'dogfight') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + (turbocavityBoostActive ? 70 : 35));
      const n = n1Pos.current;

      // Move Corvettes
      corvettesRef.current.forEach((c) => {
        c.z -= (turbocavityBoostActive ? 6.5 : 3.5);
        if (c.z < 50 && c.z > 10 && c.alive) {
          c.z = 620; // Loop around
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

      // Dark Hyperspace Starfield Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Hyperspace Tunnel Streak Lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      for (let s = 0; s < 12; s++) {
        const angle = (s * Math.PI) / 6;
        const len = (frame * (turbocavityBoostActive ? 15 : 6) + s * 40) % 360;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * (len * 0.4), cy + Math.sin(angle) * (len * 0.4));
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.stroke();
      }

      // Draw Pirate Corvettes (Heavy Red Cruisers)
      corvettesRef.current.forEach((c) => {
        if (c.alive && c.z > 0) {
          const scale = 250 / c.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          // Cruiser Diamond Shape
          ctx.beginPath();
          ctx.moveTo(c.x, c.y - 25 * scale);
          ctx.lineTo(c.x + 35 * scale, c.y);
          ctx.lineTo(c.x, c.y + 25 * scale);
          ctx.lineTo(c.x - 35 * scale, c.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Modified Naboo N-1 Starfighter (Sleek Chrome & Yellow)
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.rotate(n.roll);

      // Sleek Chrome / Yellow Fuselage
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2.5;

      // Central Needle Needle-Nosed Body
      ctx.beginPath();
      ctx.moveTo(0, -45);
      ctx.lineTo(10, 10);
      ctx.lineTo(4, 55); // Long pointed aft tail
      ctx.lineTo(-4, 55);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Twin Chrome Engine Nacelles (Left & Right with long fins)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-35, -25, 12, 45); // Left Nacelle
      ctx.fillRect(23, -25, 12, 45);  // Right Nacelle

      // Aft Turbocavity Booster Flame (Cyan / Blue Plasma)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = turbocavityBoostActive ? 28 : 12;
      ctx.beginPath();
      ctx.moveTo(-5, 55);
      ctx.lineTo(0, 55 + (turbocavityBoostActive ? 45 : 20));
      ctx.lineTo(5, 55);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Forward Twin Blaster Cannons
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-15, -15); ctx.lineTo(-15, -45);
      ctx.moveTo(15, -15); ctx.lineTo(15, -45);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, turbocavityBoostActive]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-200 to-cyan-400">
              NABOO N-1 STARFIGHTER // HYPERSPACE CORVETTE DOGFIGHT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Modified N-1 turbocavity booster & twin blaster combat for {currentUser?.name}
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

        {gameState === 'dogfight' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">BOOST: </span>
                <span className={cn("font-bold", turbocavityBoostActive ? "text-cyan-400 animate-pulse" : "text-zinc-500")}>
                  {turbocavityBoostActive ? 'TURBOCAVITY ENGAGED' : 'READY (HOLD SHIFT)'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-amber-300">{shields} / 6</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-amber-400 font-bold">
              [WASD] STEER N-1, [SPACE] LASERS, [SHIFT] TURBOCAVITY BOOST
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'dogfight' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400">
                  {gameState === 'corvettes_destroyed' ? 'PIRATE CORVETTES ANNIHILATED!' : 'MODIFIED N-1 STARFIGHTER ASSAULT'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the sleek yellow-and-chrome Naboo N-1 Starfighter at supersonic speeds through hyperspace and blast enemy corvettes!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-cyan-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>LAUNCH N-1 STARFIGHTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
