import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, Cross
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelBlockadeRunner {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieBizarroGunship() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'assault' | 'crashed' | 'blockade_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(12);
  const [corvettesDestroyed, setCorvettesDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(495000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const corvettesRef = useRef<RebelBlockadeRunner[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireHeavyTurbolaser = () => {
    if (gameState !== 'assault') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Rebel CR90 Corvettes
    corvettesRef.current.forEach((c) => {
      if (c.alive && c.z < 520 && c.z > 50) {
        if (Math.hypot(c.x - s.x, c.y - s.y) < 70) {
          c.alive = false;
          uiaudio.success();
          setCorvettesDestroyed(cd => cd + 1);
          setScore(sc => sc + 85000);
        }
      }
    });

    if (corvettesRef.current.every(c => !c.alive)) {
      setGameState('blockade_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 340000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'assault') return;
      const s = shipPos.current;
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

      if (e.code === 'Space') fireHeavyTurbolaser();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        shipPos.current.roll = 0;
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
    setGameState('assault');
    setScore(0);
    setShields(12);
    setCorvettesDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    corvettesRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Bizarro Assault Combat Loop
  useEffect(() => {
    if (gameState !== 'assault') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shipPos.current;

      // Move Rebel Corvettes
      corvettesRef.current.forEach((c) => {
        c.z -= 4.4;
        if (c.z < 50 && c.z > 10 && c.alive) {
          c.z = 640; // Loop around
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

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Rebel Fleet Flagship Outline
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 160, cy - 120); ctx.lineTo(cx + 160, cy - 120);
      ctx.lineTo(cx + 200, cy - 80); ctx.lineTo(cx - 200, cy - 80);
      ctx.closePath();
      ctx.stroke();

      // Draw Rebel Blockade Runner Corvettes
      corvettesRef.current.forEach((c) => {
        if (c.alive && c.z > 0) {
          const scale = 250 / c.z;
          ctx.fillStyle = '#f59e0b';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 14;

          // Hammerhead Hull Shape
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 35 * scale, 14 * scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/exp M1 Bizarro (Asymmetrical Dual Pod: Cockpit Right + Heavy Turbolaser Left)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Connecting Structural Pylon
      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.fillRect(-35, -4, 70, 8);
      ctx.strokeRect(-35, -4, 70, 8);

      // Starboard Cockpit Pod (Right at +25, 0)
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(25, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Pilot Viewport
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(25, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Portside Heavy Turbolaser Battery Pod (Left at -25, 0)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(-25, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Heavy Turbolaser Gun Barrel
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 14;
      ctx.fillRect(-28, -26, 6, 16);
      ctx.shadowBlur = 0;

      // Outer Solar Array Wings (Far Left & Far Right)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;

      // Far-Left Wing
      ctx.beginPath();
      ctx.moveTo(-45, -35); ctx.lineTo(-45, 35);
      ctx.stroke();

      // Far-Right Wing
      ctx.beginPath();
      ctx.moveTo(45, -35); ctx.lineTo(45, 35);
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-amber-400">
              TIE BIZARRO // HEAVY TURBOLASER GUNSHIP
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/exp M1 Bizarro asymmetrical dual-pod heavy turbolaser assault for {currentUser?.name}
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

        {gameState === 'assault' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">ARMOR: </span>
                <span className="font-bold text-sky-400">{shields} / 12</span>
              </div>
              <div>
                <span className="text-zinc-400">CORVETTES: </span>
                <span className="font-bold text-emerald-400">{corvettesDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-amber-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-emerald-400 font-bold">
              [WASD] FLY, [SPACE] DUAL HEAVY TURBOLASERS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'assault' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-amber-400">
                  {gameState === 'blockade_destroyed' ? 'REBEL BLOCKADE CORVETTES ANNIHILATED!' : 'TIE BIZARRO READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the asymmetrical Imperial TIE/exp M1 Bizarro, unleash massive portside heavy turbolaser batteries, and obliterate Rebel CR90 corvettes!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-sky-700 to-amber-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH BIZARRO</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
