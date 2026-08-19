import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelAWing {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieDefenderCombat() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'dogfight' | 'crashed' | 'rebels_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8); // TIE Defender Heavy Deflector Shields (8 HP)
  const [highScore, setHighScore] = useState(225000);

  const defenderPos = useRef({ x: 370, y: 360, roll: 0 });
  const awingsRef = useRef<RebelAWing[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireTripleLasers = () => {
    if (gameState !== 'dogfight') return;
    uiaudio.warp();
    const d = defenderPos.current;

    // Check hit on Rebel A-Wings
    awingsRef.current.forEach((a) => {
      if (a.alive && a.z < 520 && a.z > 50) {
        if (Math.hypot(a.x - d.x, a.y - d.y) < 65) {
          a.alive = false;
          uiaudio.success();
          setScore(sc => sc + 25000);
        }
      }
    });

    if (awingsRef.current.every(a => !a.alive)) {
      setGameState('rebels_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 120000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'dogfight') return;
      const d = defenderPos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') d.y = Math.max(100, d.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') d.y = Math.min(420, d.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        d.x = Math.max(100, d.x - step);
        d.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        d.x = Math.min(640, d.x + step);
        d.roll = 0.3;
      }

      if (e.code === 'Space') fireTripleLasers();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        defenderPos.current.roll = 0;
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
    setShields(8);
    defenderPos.current = { x: 370, y: 360, roll: 0 };
    awingsRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // TIE Defender Lothal Canyon Dogfight Loop
  useEffect(() => {
    if (gameState !== 'dogfight') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const d = defenderPos.current;

      // Move A-Wings forward
      awingsRef.current.forEach((a) => {
        a.z -= 4.2;
        if (a.z < 50 && a.z > 10 && a.alive) {
          a.z = 640; // Loop around
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

      // Dark Lothal Canyon Sky Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Lothal Canyon Mountain Ridge Wireframes
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 2;
      for (let r = 0; r < 6; r++) {
        const offset = (frame * 4 + r * 80) % 480;
        ctx.beginPath();
        ctx.moveTo(80, cy + offset * 0.4); ctx.lineTo(cx, cy + 180); ctx.lineTo(canvas.width - 80, cy + offset * 0.4);
        ctx.stroke();
      }

      // Draw Rebel A-Wings (Red Wedge Starfighters)
      awingsRef.current.forEach((a) => {
        if (a.alive && a.z > 0) {
          const scale = 250 / a.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#fca5a5';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;

          // A-Wing Arrow Shape
          ctx.beginPath();
          ctx.moveTo(a.x, a.y - 20 * scale);
          ctx.lineTo(a.x + 18 * scale, a.y + 15 * scale);
          ctx.lineTo(a.x - 18 * scale, a.y + 15 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/D Defender (Triple Solar Wings at 120-degree symmetry)
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.roll);

      // Triple Solar Wings (Top, Bottom-Left, Bottom-Right)
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;

      // Wing 1: Top Vertically Pointing Wing
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(-12, -48); ctx.lineTo(12, -48); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Wing 2: Bottom Left Wing (120 deg)
      ctx.beginPath();
      ctx.moveTo(-8, 5); ctx.lineTo(-44, 32); ctx.lineTo(-28, 48); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Wing 3: Bottom Right Wing (120 deg)
      ctx.beginPath();
      ctx.moveTo(8, 5); ctx.lineTo(44, 32); ctx.lineTo(28, 48); ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Central Eyeball Cockpit Pod
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Targeting Viewport
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Triple Green Laser Cannons
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -48); ctx.lineTo(0, -65);
      ctx.moveTo(-44, 32); ctx.lineTo(-55, 4);
      ctx.moveTo(44, 32); ctx.lineTo(55, 4);
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
              TIE DEFENDER // TRIPLE-WING LOTHAL CANYON COMBAT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Grand Admiral Thrawn's shielded starfighter vs Rebel A-Wings for {currentUser?.name}
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
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-300">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] PILOT TIE DEFENDER, [SPACE] TRIPLE LASERS
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                  {gameState === 'rebels_destroyed' ? 'REBEL SQUADRON ANNIHILATED!' : 'TIE DEFENDER INTERCEPTOR READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the triple-solar-wing TIE/D Defender equipped with heavy deflector shields through Lothal canyons and blast Rebel A-Wings!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE DEFENDER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
