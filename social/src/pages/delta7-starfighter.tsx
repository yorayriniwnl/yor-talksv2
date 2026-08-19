import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface SeismicCharge {
  x: number;
  y: number;
  radius: number;
  active: boolean;
}

export default function Delta7Starfighter() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'pursuit' | 'crashed' | 'slave1_defeated'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(6);
  const [slave1Hp, setSlave1Hp] = useState(100);
  const [highScore, setHighScore] = useState(215000);

  const delta7Pos = useRef({ x: 370, y: 360, roll: 0 });
  const slave1Pos = useRef({ x: 370, y: 180, z: 350, vx: 2 });
  const chargesRef = useRef<SeismicCharge[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireTwinLasers = () => {
    if (gameState !== 'pursuit') return;
    uiaudio.warp();
    const d = delta7Pos.current;
    const s = slave1Pos.current;

    // Check hit on Slave I
    if (Math.hypot(d.x - s.x, d.y - s.y) < 70) {
      uiaudio.success();
      setScore(sc => sc + 15000);
      setSlave1Hp(hp => {
        if (hp <= 25) {
          setGameState('slave1_defeated');
          uiaudio.success();
          return 0;
        }
        return hp - 25;
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'pursuit') return;
      const d = delta7Pos.current;
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

      if (e.code === 'Space') fireTwinLasers();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        delta7Pos.current.roll = 0;
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
    setGameState('pursuit');
    setScore(0);
    setShields(6);
    setSlave1Hp(100);
    delta7Pos.current = { x: 370, y: 360, roll: 0 };
    slave1Pos.current = { x: 370, y: 180, z: 350, vx: 2 };
    chargesRef.current = [];
  };

  // Delta-7 Jedi Starfighter Geonosis Asteroids Dogfight Loop
  useEffect(() => {
    if (gameState !== 'pursuit') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 40);
      const d = delta7Pos.current;
      const s = slave1Pos.current;

      // Slave I evasive weave
      s.x += s.vx;
      if (s.x > 540 || s.x < 200) s.vx = -s.vx;

      // Random Seismic Charge drop from Slave I
      if (frame % 120 === 0) {
        chargesRef.current.push({ x: s.x, y: s.y, radius: 10, active: true });
        uiaudio.warp();
      }

      // Expand Seismic Shockwaves
      chargesRef.current.forEach((c) => {
        if (c.active) {
          c.radius += 5;
          if (c.radius > 200) c.active = false;

          // Check damage to Delta-7
          if (Math.hypot(c.x - d.x, c.y - d.y) < c.radius && Math.hypot(c.x - d.x, c.y - d.y) > c.radius - 20) {
            setShields(sh => {
              if (sh <= 1) {
                setGameState('crashed');
                uiaudio.error();
                return 0;
              }
              return sh - 1;
            });
          }
        }
      });

      chargesRef.current = chargesRef.current.filter(c => c.active);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Geonosis Asteroid Field Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Geonosis Ochre Planetary Dust Arc
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.3)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, canvas.height + 380, 480, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Expanding Cyan Seismic Charge Shockwaves
      chargesRef.current.forEach((c) => {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw Jango Fett's Slave I (Firespray-31)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.fillStyle = '#047857'; // Green / Silver armored hull
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;

      // Firespray Rotating Tail / Cockpit
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Lower Skirt Stabilizers
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-30, 15, 60, 15);
      ctx.restore();

      // Draw Obi-Wan's Delta-7 Aethersprite Jedi Starfighter
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.roll);

      // Dagger-Nosed Arrowhead Fuselage (Red & White)
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(0, -45); // Pointed tip
      ctx.lineTo(24, 35);
      ctx.lineTo(0, 25);
      ctx.lineTo(-24, 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Astromech Droid Socket (R4-P17)
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(-8, 5, 4, 0, Math.PI * 2);
      ctx.fill();

      // Forward Twin Laser Cannons (Emerald Green)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-18, 15); ctx.lineTo(-18, -25);
      ctx.moveTo(18, 15); ctx.lineTo(18, -25);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, slave1Hp]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
              DELTA-7 AETHERSPRITE // GEONOSIS ASTEROID DOGFIGHT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Obi-Wan's Jedi starfighter vs Jango Fett's Slave I seismic charges for {currentUser?.name}
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
                <span className="text-zinc-400">SLAVE I HP: </span>
                <span className="font-bold text-emerald-400">{slave1Hp} / 100</span>
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

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-red-400 font-bold">
              [WASD] FLY DELTA-7, [SPACE] LASERS, AVOID SEISMIC SHOCKWAVES
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-amber-400 to-cyan-400">
                  {gameState === 'slave1_defeated' ? 'SLAVE I DISABLED - WE GOT HIM, R4!' : 'DELTA-7 JEDI STARFIGHTER PURSUIT'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pursue Jango Fett's Slave I through the hazardous Geonosis asteroid ring and weave through devastating seismic charges!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH DELTA-7 STARFIGHTER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
