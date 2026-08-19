import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface AtAtWalker {
  x: number;
  y: number;
  z: number;
  legsTied: boolean;
  toppled: boolean;
}

export default function SnowspeederDefense() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'blizzard_defense' | 'crashed' | 'walkers_toppled'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(6);
  const [towCablesLeft, setTowCablesLeft] = useState(3);
  const [highScore, setHighScore] = useState(260000);

  const t47Pos = useRef({ x: 370, y: 360, roll: 0 });
  const walkersRef = useRef<AtAtWalker[]>([
    { x: 260, y: 220, z: 340, legsTied: false, toppled: false },
    { x: 480, y: 190, z: 480, legsTied: false, toppled: false },
    { x: 370, y: 240, z: 620, legsTied: false, toppled: false },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const launchHarpoonTowCable = () => {
    if (gameState !== 'blizzard_defense' || towCablesLeft <= 0) return;
    uiaudio.warp();
    setTowCablesLeft(tc => tc - 1);
    const t = t47Pos.current;

    // Check closest AT-AT walker
    walkersRef.current.forEach((w) => {
      if (!w.toppled && w.z < 520 && w.z > 50) {
        if (Math.hypot(w.x - t.x, w.y - t.y) < 75) {
          w.legsTied = true;
          w.toppled = true;
          uiaudio.success();
          setScore(sc => sc + 45000);
        }
      }
    });

    if (walkersRef.current.every(w => w.toppled)) {
      setGameState('walkers_toppled');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 160000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'blizzard_defense') return;
      const t = t47Pos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') t.y = Math.max(100, t.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') t.y = Math.min(420, t.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        t.x = Math.max(100, t.x - step);
        t.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        t.x = Math.min(640, t.x + step);
        t.roll = 0.3;
      }

      if (e.code === 'Space') launchHarpoonTowCable();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        t47Pos.current.roll = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, towCablesLeft]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('blizzard_defense');
    setScore(0);
    setShields(6);
    setTowCablesLeft(3);
    t47Pos.current = { x: 370, y: 360, roll: 0 };
    walkersRef.current = [
      { x: 260, y: 220, z: 340, legsTied: false, toppled: false },
      { x: 480, y: 190, z: 480, legsTied: false, toppled: false },
      { x: 370, y: 240, z: 620, legsTied: false, toppled: false },
    ];
  };

  // T-47 Snowspeeder Blizzard Defense Loop
  useEffect(() => {
    if (gameState !== 'blizzard_defense') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const t = t47Pos.current;

      // Move Walkers Forward
      walkersRef.current.forEach((w) => {
        if (!w.toppled) {
          w.z -= 3.5;
          if (w.z < 50 && w.z > 10) {
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
        }
      });

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Frozen Hoth Blizzard Void
      ctx.fillStyle = '#010511';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fast Flying Snowflakes Particles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let s = 0; s < 45; s++) {
        const sx = (Math.sin(s * 99 + frame * 0.1) * 380 + cx) % canvas.width;
        const sy = (frame * 6 + s * 45) % canvas.height;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // Frozen Ice Plains Grid Lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 6; s++) {
        const offset = (frame * 4 + s * 80) % 480;
        ctx.strokeRect(cx - 300 + s * 100, cy + 50, 45, 120);
      }

      // Draw Imperial AT-AT Walkers (Tall Quadruped Giant Walkers)
      walkersRef.current.forEach((w) => {
        if (w.z > 0) {
          const scale = 260 / w.z;
          ctx.fillStyle = w.toppled ? '#475569' : '#94a3b8';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = w.toppled ? 0 : 12;

          // Armored Body + Head
          ctx.beginPath();
          ctx.rect(w.x - 28 * scale, w.y - 25 * scale, 56 * scale, 32 * scale);
          ctx.fill();
          ctx.stroke();

          // 4 Stomping Legs
          if (!w.toppled) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(w.x - 22 * scale, w.y + 7 * scale); ctx.lineTo(w.x - 25 * scale, w.y + 42 * scale);
            ctx.moveTo(w.x + 22 * scale, w.y + 7 * scale); ctx.lineTo(w.x + 25 * scale, w.y + 42 * scale);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }
      });

      // Draw T-47 Snowspeeder (Triangular Wedge Hull & Dual Rear Harpoon)
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.roll);

      // Armored Orange & White Wedge Hull
      ctx.fillStyle = '#f97316';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      // Triangular Wedge Fuselage
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.lineTo(26, 25);
      ctx.lineTo(-26, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Twin Forward Laser Blasters
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-24, 15); ctx.lineTo(-24, -20);
      ctx.moveTo(24, 15); ctx.lineTo(24, -20);
      ctx.stroke();

      // Aft Harpoon Gun & Cable Spool (Cyan Needle)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 25); ctx.lineTo(0, 45);
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-orange-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(249,115,22,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-sky-600 flex items-center justify-center shadow-lg shadow-orange-500/30 border border-orange-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-sky-200 to-cyan-400">
              T-47 SNOWSPEEDER // BLIZZARD HARPOON DEFENSE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Modified airspeeder tow cable harpoon vs Imperial AT-AT Walkers for {currentUser?.name}
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

        {gameState === 'blizzard_defense' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-orange-400">{shields} / 6</span>
              </div>
              <div>
                <span className="text-zinc-400">TOW CABLES: </span>
                <span className="font-bold text-cyan-300">{towCablesLeft}</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-orange-400 font-bold">
              [WASD] FLY SNOWSPEEDER, [SPACE] LAUNCH TOW CABLE HARPOON
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'blizzard_defense' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-sky-300 to-cyan-400">
                  {gameState === 'walkers_toppled' ? 'ALL IMPERIAL WALKERS TOPPLED!' : 'T-47 ROGUE SQUADRON READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the agile T-47 Snowspeeder through freezing Hoth blizzards, wrap tow cables around AT-AT walker legs, and protect Echo Base!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 via-sky-500 to-cyan-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>LAUNCH T-47 SNOWSPEEDER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
