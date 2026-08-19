import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Radio, RadioReceiver
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PirateMine {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieScoutProbe() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'recon' | 'crashed' | 'sector_mapped'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [minesNeutralized, setMinesNeutralized] = useState(0);
  const [highScore, setHighScore] = useState(365000);

  const scoutPos = useRef({ x: 370, y: 360, roll: 0 });
  const minesRef = useRef<PirateMine[]>([
    { x: 240, y: 200, z: 320, alive: true },
    { x: 500, y: 190, z: 460, alive: true },
    { x: 370, y: 240, z: 580, alive: true },
    { x: 310, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const deploySensorDecoyProbe = () => {
    if (gameState !== 'recon') return;
    uiaudio.warp();
    const s = scoutPos.current;

    // Check hit on Mines
    minesRef.current.forEach((m) => {
      if (m.alive && m.z < 520 && m.z > 50) {
        if (Math.hypot(m.x - s.x, m.y - s.y) < 60) {
          m.alive = false;
          uiaudio.success();
          setMinesNeutralized(mn => mn + 1);
          setScore(sc => sc + 45000);
        }
      }
    });

    if (minesRef.current.every(m => !m.alive)) {
      setGameState('sector_mapped');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 210000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'recon') return;
      const s = scoutPos.current;
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

      if (e.code === 'Space') deploySensorDecoyProbe();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        scoutPos.current.roll = 0;
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
    setGameState('recon');
    setScore(0);
    setShields(8);
    setMinesNeutralized(0);
    scoutPos.current = { x: 370, y: 360, roll: 0 };
    minesRef.current = [
      { x: 240, y: 200, z: 320, alive: true },
      { x: 500, y: 190, z: 460, alive: true },
      { x: 370, y: 240, z: 580, alive: true },
      { x: 310, y: 170, z: 640, alive: true },
    ];
  };

  // TIE/rc Scout Reconnaissance Loop
  useEffect(() => {
    if (gameState !== 'recon') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = scoutPos.current;

      // Move Mines
      minesRef.current.forEach((m) => {
        m.z -= 4.4;
        if (m.z < 50 && m.z > 10 && m.alive) {
          m.z = 640; // Loop around
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

      // Outer Rim Nebula Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Radar Range Rings
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.arc(cx, cy, r * 100, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Pirate Proximity Mines (Spiky Octahedrons)
      minesRef.current.forEach((m) => {
        if (m.alive && m.z > 0) {
          const scale = 250 / m.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.arc(m.x, m.y, 14 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/rc Scout (Enlarged Recon Cockpit + Dish Antenna + Solar Wings)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Lightweight Titanium Armor
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Enlarged Central Spherical Cockpit + Sensor Nose
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Top-Mounted High-Gain Hyperwave Dish Antenna
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -22, 9, Math.PI * 0.2, Math.PI * 0.8, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -16); ctx.lineTo(0, -22);
      ctx.stroke();

      // Cyan Pilot Viewport
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Standard Hexagonal Solar Wings (Left & Right)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;

      // Left Hexagonal Wing
      ctx.beginPath();
      ctx.moveTo(-45, -35);
      ctx.lineTo(-65, 0);
      ctx.lineTo(-45, 35);
      ctx.lineTo(-30, 20);
      ctx.lineTo(-30, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Hexagonal Wing
      ctx.beginPath();
      ctx.moveTo(45, -35);
      ctx.lineTo(65, 0);
      ctx.lineTo(45, 35);
      ctx.lineTo(30, 20);
      ctx.lineTo(30, -20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Pylons
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-16, 0); ctx.lineTo(-30, 0);
      ctx.moveTo(16, 0); ctx.lineTo(30, 0);
      ctx.stroke();

      // Forward Single Recon Laser Blaster
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 16); ctx.lineTo(0, 45);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-900 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
              TIE SCOUT // LONG-RANGE RECON PROBE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/rc Scout deep reconnaissance & asteroid minefield sweep for {currentUser?.name}
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

        {gameState === 'recon' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">MINES: </span>
                <span className="font-bold text-amber-400">{minesNeutralized} CLEARED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-sky-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY TIE SCOUT, [SPACE] DEPLOY SENSOR DECOY PULSE
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'recon' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-400">
                  {gameState === 'sector_mapped' ? 'OUTER RIM SECTOR FULLY MAPPED!' : 'TIE/RC SCOUT PROBE READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the long-range TIE Scout reconnaissance starfighter, deploy high-power sensor decoy pulses, and clear hostile pirate minefields!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-700 to-amber-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE SCOUT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
