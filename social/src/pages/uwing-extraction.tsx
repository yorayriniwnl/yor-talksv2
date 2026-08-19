import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface ImperialWalker {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function UwingExtraction() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'extraction' | 'crashed' | 'squad_extracted'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [troopsRescued, setTroopsRescued] = useState(0);
  const [highScore, setHighScore] = useState(265000);

  const uwingPos = useRef({ x: 370, y: 360, roll: 0 });
  const walkersRef = useRef<ImperialWalker[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireDoorBlaster = () => {
    if (gameState !== 'extraction') return;
    uiaudio.warp();
    const u = uwingPos.current;

    // Check hit on Imperial Walkers
    walkersRef.current.forEach((w) => {
      if (w.alive && w.z < 520 && w.z > 50) {
        if (Math.hypot(w.x - u.x, w.y - u.y) < 65) {
          w.alive = false;
          uiaudio.success();
          setTroopsRescued(tr => tr + 2);
          setScore(sc => sc + 30000);
        }
      }
    });

    if (walkersRef.current.every(w => !w.alive)) {
      setGameState('squad_extracted');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 140000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'extraction') return;
      const u = uwingPos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') u.y = Math.max(100, u.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') u.y = Math.min(420, u.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        u.x = Math.max(100, u.x - step);
        u.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        u.x = Math.min(640, u.x + step);
        u.roll = 0.3;
      }

      if (e.code === 'Space') fireDoorBlaster();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        uwingPos.current.roll = 0;
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
    setGameState('extraction');
    setScore(0);
    setShields(8);
    setTroopsRescued(0);
    uwingPos.current = { x: 370, y: 360, roll: 0 };
    walkersRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // UT-60D U-Wing Combat Loop
  useEffect(() => {
    if (gameState !== 'extraction') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const u = uwingPos.current;

      // Move Walkers
      walkersRef.current.forEach((w) => {
        w.z -= 4.0;
        if (w.z < 50 && w.z > 10 && w.alive) {
          w.z = 640; // Loop around
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

      // Dusty Jedha Sky Void
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Holy City Ruins Ground Grid
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 6; s++) {
        const offset = (frame * 3 + s * 80) % 480;
        ctx.strokeRect(cx - 300 + s * 100, cy + 50, 50, 120);
      }

      // Draw Imperial AT-ST Walkers (Chicken Walkers)
      walkersRef.current.forEach((w) => {
        if (w.alive && w.z > 0) {
          const scale = 250 / w.z;
          ctx.fillStyle = '#94a3b8';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;

          // AT-ST Head
          ctx.beginPath();
          ctx.rect(w.x - 16 * scale, w.y - 20 * scale, 32 * scale, 24 * scale);
          ctx.fill();
          ctx.stroke();

          // 2 Bipedal Legs
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(w.x - 10 * scale, w.y + 4 * scale); ctx.lineTo(w.x - 14 * scale, w.y + 32 * scale);
          ctx.moveTo(w.x + 10 * scale, w.y + 4 * scale); ctx.lineTo(w.x + 14 * scale, w.y + 32 * scale);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw UT-60D U-Wing (Long Forward Swing Wings + Side Door Gunner)
      ctx.save();
      ctx.translate(u.x, u.y);
      ctx.rotate(u.roll);

      // Rebel Blue & White Transport Hull
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      // Elongated Fuselage & Cockpit
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.lineTo(16, 10);
      ctx.lineTo(14, 45);
      ctx.lineTo(-14, 45);
      ctx.lineTo(-16, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Long Forward Swept Swing Wings (U-Shape Forward)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      // Left Wing
      ctx.beginPath();
      ctx.moveTo(-16, 5); ctx.lineTo(-65, -40);
      // Right Wing
      ctx.moveTo(16, 5); ctx.lineTo(65, -40);
      ctx.stroke();

      // Quad Incom Sublight Thrusters (Aft)
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 16;
      ctx.fillRect(-12, 45, 4, 10);
      ctx.fillRect(-4, 45, 4, 10);
      ctx.fillRect(4, 45, 4, 10);
      ctx.fillRect(12, 45, 4, 10);
      ctx.shadowBlur = 0;

      // Side Door Heavy Repeating Laser (Cyan Line)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(16, 20); ctx.lineTo(35, 10);
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-sky-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(2,132,199,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-amber-600 flex items-center justify-center shadow-lg shadow-sky-500/30 border border-sky-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-amber-200 to-cyan-400">
              U-WING GUNSHIP // TROOP EXTRACTION COMBAT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              UT-60D gunship swing-wings & door blaster vs Imperial AT-STs for {currentUser?.name}
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

        {gameState === 'extraction' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">HULL: </span>
                <span className="font-bold text-sky-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">RESCUED: </span>
                <span className="font-bold text-amber-300">{troopsRescued} SQUADS</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-sky-400 font-bold">
              [WASD] FLY U-WING, [SPACE] SIDE DOOR REPEATING BLASTER
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'extraction' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-amber-300 to-cyan-400">
                  {gameState === 'squad_extracted' ? 'GROUND SQUAD SAFELY EXTRACTED!' : 'UT-60D U-WING GUNSHIP READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the agile Rebel UT-60D U-Wing, sweep through enemy fire, eliminate Imperial walkers, and rescue pinned ground squads!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-sky-500 via-amber-500 to-cyan-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>LAUNCH U-WING GUNSHIP</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
