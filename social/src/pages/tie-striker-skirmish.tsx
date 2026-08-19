import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelTarget {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieStrikerSkirmish() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'skirmish' | 'crashed' | 'rebels_destroyed'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [protonBombsLeft, setProtonBombsLeft] = useState(4);
  const [highScore, setHighScore] = useState(270000);

  const strikerPos = useRef({ x: 370, y: 360, roll: 0 });
  const rebelsRef = useRef<RebelTarget[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireTwinHeavyBlasters = () => {
    if (gameState !== 'skirmish') return;
    uiaudio.warp();
    const s = strikerPos.current;

    // Check hit on Rebel targets
    rebelsRef.current.forEach((r) => {
      if (r.alive && r.z < 520 && r.z > 50) {
        if (Math.hypot(r.x - s.x, r.y - s.y) < 65) {
          r.alive = false;
          uiaudio.success();
          setScore(sc => sc + 32000);
        }
      }
    });

    if (rebelsRef.current.every(r => !r.alive)) {
      setGameState('rebels_destroyed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 150000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'skirmish') return;
      const s = strikerPos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') s.y = Math.max(100, s.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') s.y = Math.min(420, s.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        s.x = Math.max(100, s.x - step);
        s.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        s.x = Math.min(640, s.x + step);
        s.roll = 0.3;
      }

      if (e.code === 'Space') fireTwinHeavyBlasters();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        strikerPos.current.roll = 0;
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
    setGameState('skirmish');
    setScore(0);
    setShields(8);
    setProtonBombsLeft(4);
    strikerPos.current = { x: 370, y: 360, roll: 0 };
    rebelsRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // TIE Striker Scarif Atmospheric Skirmish Loop
  useEffect(() => {
    if (gameState !== 'skirmish') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const s = strikerPos.current;

      // Move Rebel Targets
      rebelsRef.current.forEach((r) => {
        r.z -= 4.0;
        if (r.z < 50 && r.z > 10 && r.alive) {
          r.z = 640; // Loop around
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

      // Tropical Scarif Coastal Sky Void
      ctx.fillStyle = '#021827';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Turquoise Ocean Archipelago Islands below
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const offset = (frame * 4 + i * 80) % 480;
        ctx.strokeRect(cx - 300 + i * 100, cy + 60, 60, 80);
      }

      // Draw Rebel U-Wing Transports (Swing-Wing Silver/Blue Transports)
      rebelsRef.current.forEach((r) => {
        if (r.alive && r.z > 0) {
          const scale = 250 / r.z;
          ctx.fillStyle = '#38bdf8';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          // U-Wing Forward Cockpit + Wide Wings
          ctx.moveTo(r.x, r.y - 12 * scale);
          ctx.lineTo(r.x + 28 * scale, r.y + 14 * scale);
          ctx.lineTo(r.x - 28 * scale, r.y + 14 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE Striker (Long Cylindrical Pod + Long Pointed Flat Wings)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Dark Imperial Gray Hull
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;

      // Central Elongated Cylindrical Pod
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Glowing Cockpit Viewport
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, -12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Long Pointed Horizontal Flat Wings (Left & Right)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;

      // Left Long Pointed Wing
      ctx.beginPath();
      ctx.moveTo(-14, -10);
      ctx.lineTo(-75, 25);
      ctx.lineTo(-14, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Long Pointed Wing
      ctx.beginPath();
      ctx.moveTo(14, -10);
      ctx.lineTo(75, 25);
      ctx.lineTo(14, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wingtip Green Laser Cannons
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-75, 25); ctx.lineTo(-75, -15);
      ctx.moveTo(75, 25); ctx.lineTo(75, -15);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-200 to-cyan-400">
              TIE STRIKER // SCARIF ATMOSPHERIC SKIRMISH
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/sk x1 experimental atmospheric air superiority fighter vs Rebel U-Wings for {currentUser?.name}
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

        {gameState === 'skirmish' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">HULL: </span>
                <span className="font-bold text-red-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">PROTON BOMBS: </span>
                <span className="font-bold text-amber-400">{protonBombsLeft}</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-yellow-400 font-bold">
              [WASD] FLY TIE STRIKER, [SPACE] HEAVY CANNONS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'skirmish' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
                  {gameState === 'rebels_destroyed' ? 'REBEL U-WING FLEET NEUTRALIZED!' : 'TIE STRIKER SQUADRON READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the fast TIE/sk x1 experimental striker through Scarif's tropical skies and destroy Rebel U-Wing transports!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE STRIKER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
