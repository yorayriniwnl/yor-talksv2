import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Coins, Shield
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PirateShip {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function RazorCrestPursuit() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'hunt' | 'crashed' | 'bounty_claimed'>('idle');
  const [score, setScore] = useState(0);
  const [beskarIngots, setBeskarIngots] = useState(0);
  const [shields, setShields] = useState(6);
  const [highScore, setHighScore] = useState(185000);

  const crestPos = useRef({ x: 370, y: 360, roll: 0 });
  const piratesRef = useRef<PirateShip[]>([
    { x: 260, y: 220, z: 350, alive: true },
    { x: 460, y: 180, z: 500, alive: true },
    { x: 370, y: 260, z: 650, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireTwinCannons = () => {
    if (gameState !== 'hunt') return;
    uiaudio.warp();
    const c = crestPos.current;

    // Check hit on pirate gunships
    piratesRef.current.forEach((p) => {
      if (p.alive && p.z < 500 && p.z > 50) {
        if (Math.hypot(p.x - c.x, p.y - c.y) < 60) {
          p.alive = false;
          uiaudio.success();
          setBeskarIngots(b => b + 2);
          setScore(sc => sc + 25000);
        }
      }
    });

    if (piratesRef.current.every(p => !p.alive)) {
      setGameState('bounty_claimed');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 120000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'hunt') return;
      const c = crestPos.current;
      const step = 14;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') c.y = Math.max(100, c.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') c.y = Math.min(420, c.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        c.x = Math.max(100, c.x - step);
        c.roll = -0.25;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        c.x = Math.min(640, c.x + step);
        c.roll = 0.25;
      }

      if (e.code === 'Space') fireTwinCannons();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        crestPos.current.roll = 0;
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
    setGameState('hunt');
    setScore(0);
    setBeskarIngots(0);
    setShields(6);
    crestPos.current = { x: 370, y: 360, roll: 0 };
    piratesRef.current = [
      { x: 260, y: 220, z: 350, alive: true },
      { x: 460, y: 180, z: 500, alive: true },
      { x: 370, y: 260, z: 650, alive: true },
    ];
  };

  // Razor Crest Planetary Ring Bounty Hunt Loop
  useEffect(() => {
    if (gameState !== 'hunt') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const c = crestPos.current;

      // Move Pirates
      piratesRef.current.forEach((p) => {
        p.z -= 3.5;
        if (p.z < 50 && p.z > 10 && p.alive) {
          p.z = 650; // Loop around
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

      // Nevarro Planetary Ring Dust (Golden Horizontal Band)
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.2)';
      ctx.lineWidth = 40;
      ctx.beginPath();
      ctx.moveTo(0, cy + 20); ctx.lineTo(canvas.width, cy + 20);
      ctx.stroke();

      // Draw Pirate Ships (Red Skiffs)
      piratesRef.current.forEach((p) => {
        if (p.alive && p.z > 0) {
          const scale = 250 / p.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 15 * scale);
          ctx.lineTo(p.x - 20 * scale, p.y + 15 * scale);
          ctx.lineTo(p.x + 20 * scale, p.y + 15 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw ST-70 Razor Crest Assault Gunship
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.roll);

      // Gunmetal Gray Armored Fuselage
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2.5;
      ctx.fillRect(-18, -35, 36, 70);
      ctx.strokeRect(-18, -35, 36, 70);

      // Twin Outboard Turbofan Ion Engines (Left & Right)
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.fillRect(-45, -25, 16, 50); // Left Engine
      ctx.fillRect(29, -25, 16, 50);  // Right Engine
      ctx.shadowBlur = 0;

      // Forward Twin Laser Cannons
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-12, -35); ctx.lineTo(-12, -50);
      ctx.moveTo(12, -35); ctx.lineTo(12, -50);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, beskarIngots]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-zinc-700 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Shield className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-zinc-200 to-cyan-400">
              RAZOR CREST PURSUIT // BESKAR BOUNTY HUNTER RUN
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              ST-70 gunship twin ion cannons & tracking fob pursuit for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* High Score & Beskar */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BESKAR:</span>
            <span className="text-amber-300 font-bold">{beskarIngots} INGOTS</span>
          </div>

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

        {gameState === 'hunt' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">BESKAR: </span>
                <span className="font-bold text-amber-400">{beskarIngots} / 6</span>
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
              [WASD / ARROWS] FLY RAZOR CREST, [SPACE] FIRE TWIN LASERS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'hunt' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-zinc-300 to-cyan-400">
                  {gameState === 'bounty_claimed' ? 'BOUNTIES CLAIMED - THIS IS THE WAY!' : 'RAZOR CREST BOUNTY PURSUIT'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the armored Razor Crest gunship through the planetary rings and neutralize pirate skiffs!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-zinc-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START BOUNTY RUN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
