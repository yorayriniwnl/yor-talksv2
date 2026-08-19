import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Disc, Cross
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface SublightEngine {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function BwingAssault() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'bombing' | 'crashed' | 'star_destroyer_disabled'>('idle');
  const [score, setScore] = useState(0);
  const [torpedoesLeft, setTorpedoesLeft] = useState(8);
  const [shields, setShields] = useState(6);
  const [highScore, setHighScore] = useState(182000);

  const bwingPos = useRef({ x: 370, y: 360, angle: 0 });
  const enginesRef = useRef<SublightEngine[]>([
    { x: 320, y: 220, z: 450, alive: true },
    { x: 370, y: 200, z: 450, alive: true },
    { x: 420, y: 220, z: 450, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireIonTorpedo = () => {
    if (gameState !== 'bombing' || torpedoesLeft <= 0) return;
    uiaudio.warp();
    setTorpedoesLeft(t => t - 1);
    const b = bwingPos.current;

    // Check hit on Star Destroyer 3 Main Sublight Ion Engines
    enginesRef.current.forEach((eng) => {
      if (eng.alive && eng.z < 500 && eng.z > 60) {
        if (Math.hypot(eng.x - b.x, eng.y - b.y) < 55) {
          eng.alive = false;
          uiaudio.success();
          setScore(sc => sc + 25000);
        }
      }
    });

    // If all 3 engines destroyed -> Victory!
    if (enginesRef.current.every(eng => !eng.alive)) {
      setGameState('star_destroyer_disabled');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 120000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'bombing') return;
      const b = bwingPos.current;
      const step = 12;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') b.y = Math.max(100, b.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') b.y = Math.min(420, b.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') b.x = Math.max(100, b.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') b.x = Math.min(640, b.x + step);

      // Roll B-Wing Main Airfoil Blade around Cockpit
      if (e.code === 'KeyQ') b.angle -= 0.2;
      if (e.code === 'KeyE') b.angle += 0.2;

      if (e.code === 'Space') fireIonTorpedo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, torpedoesLeft]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('bombing');
    setScore(0);
    setTorpedoesLeft(8);
    setShields(6);
    bwingPos.current = { x: 370, y: 360, angle: 0 };
    enginesRef.current = [
      { x: 320, y: 220, z: 450, alive: true },
      { x: 370, y: 200, z: 450, alive: true },
      { x: 420, y: 220, z: 450, alive: true },
    ];
  };

  // B-Wing Heavy Star Destroyer Ion Assault Physics Loop
  useEffect(() => {
    if (gameState !== 'bombing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const b = bwingPos.current;
      setScore(sc => sc + 30);

      // Move Star Destroyer closer
      enginesRef.current.forEach((eng) => {
        eng.z -= 2.5;
        if (eng.z < 60 && eng.z > 20 && eng.alive) {
          eng.z = 450; // Loop pass
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

      // Dark Space Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Star Destroyer Rear Triangular Hull Wireframe (Distant)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, 100);
      ctx.lineTo(160, 240);
      ctx.lineTo(canvas.width - 160, 240);
      ctx.closePath();
      ctx.stroke();

      // 3 Massive Blue Ion Engine Exhaust Nozzles (Center Rear)
      enginesRef.current.forEach((eng) => {
        if (eng.alive) {
          ctx.fillStyle = '#06b6d4';
          ctx.strokeStyle = '#38bdf8';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 20;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(eng.x, eng.y, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Player A/SF-01 B-Wing Heavy Starfighter with Gyroscopic Cockpit
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);

      // Long Vertical Main Blade Airfoil
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.fillRect(-8, -45, 16, 90);
      ctx.strokeRect(-8, -45, 16, 90);

      // S-Foil Cross Wings
      ctx.fillRect(-35, -5, 70, 10);
      ctx.strokeRect(-35, -5, 70, 10);

      // Gyroscopic Spherical Command Pod at Top Tip
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(0, -45, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, torpedoesLeft]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Cross className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-cyan-300 to-pink-400">
              B-WING ASSAULT // 3D STAR DESTROYER ION BOMBING RUN
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Gyroscopic foil roll & heavy proton torpedo bombing for {currentUser?.name}
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

        {gameState === 'bombing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">TORPEDOES: </span>
                <span className="font-bold text-base text-amber-300">{torpedoesLeft} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-300">{shields} / 6</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-amber-400 font-bold">
              [WASD] MOVE, [Q/E] ROLL FOILS, [SPACE] ION TORPEDO
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'bombing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-cyan-400 to-pink-400">
                  {gameState === 'star_destroyer_disabled' ? 'STAR DESTROYER DISABLED - ENGINES DESTROYED!' : (gameState === 'crashed' ? 'B-WING DESTROYED BY TURBOLASERS!' : 'B-WING ION BOMBING RUN')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the heavy B-Wing bomber, roll gyroscopic foils, and disable the 3 sublight ion thrusters of the Imperial Star Destroyer!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-cyan-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START B-WING ASSAULT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
