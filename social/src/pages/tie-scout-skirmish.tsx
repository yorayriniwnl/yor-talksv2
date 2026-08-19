import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Radio, Radar
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface MandalorianRaiderGunship {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieScoutSkirmish() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'recon' | 'crashed' | 'sector_mapped'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(10);
  const [raidersNeutralized, setRaidersNeutralized] = useState(0);
  const [highScore, setHighScore] = useState(425000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const raidersRef = useRef<MandalorianRaiderGunship[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireTwinBlasters = () => {
    if (gameState !== 'recon') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Mandalorian Raiders
    raidersRef.current.forEach((r) => {
      if (r.alive && r.z < 520 && r.z > 50) {
        if (Math.hypot(r.x - s.x, r.y - s.y) < 65) {
          r.alive = false;
          uiaudio.success();
          setRaidersNeutralized(rn => rn + 1);
          setScore(sc => sc + 62000);
        }
      }
    });

    if (raidersRef.current.every(r => !r.alive)) {
      setGameState('sector_mapped');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 260000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'recon') return;
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

      if (e.code === 'Space') fireTwinBlasters();
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
    setGameState('recon');
    setScore(0);
    setShields(10);
    setRaidersNeutralized(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    raidersRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Scout Recon Combat Loop
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
      const s = shipPos.current;

      // Move Mandalorian Raiders
      raidersRef.current.forEach((r) => {
        r.z -= 4.3;
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

      // Deep Core Nebula Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Radar Sensor Sweep Lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 1.5;
      const sweepAngle = (frame * 0.05) % (Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sweepAngle) * 350, cy + Math.sin(sweepAngle) * 350);
      ctx.stroke();

      // Draw Mandalorian Raider Gunships
      raidersRef.current.forEach((r) => {
        if (r.alive && r.z > 0) {
          const scale = 250 / r.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.moveTo(r.x, r.y - 18 * scale);
          ctx.lineTo(r.x + 22 * scale, r.y + 12 * scale);
          ctx.lineTo(r.x - 22 * scale, r.y + 12 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/rc Scout Probe (Central TIE Ball + 2 High-Gain Sensor Dishes + Standard Solar Wings)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Central Imperial Cockpit
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Pilot Sensor Port
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 2 High-Gain Sensor Dish Masts (Top-Left & Top-Right)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -14); ctx.lineTo(-20, -32);
      ctx.moveTo(10, -14); ctx.lineTo(20, -32);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-20, -32, 4, 0, Math.PI * 2);
      ctx.arc(20, -32, 4, 0, Math.PI * 2);
      ctx.fill();

      // Hexagonal Solar Panels (Left & Right)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;

      // Left Hex Wing
      ctx.beginPath();
      ctx.moveTo(-45, -30);
      ctx.lineTo(-60, 0);
      ctx.lineTo(-45, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Hex Wing
      ctx.beginPath();
      ctx.moveTo(45, -30);
      ctx.lineTo(60, 0);
      ctx.lineTo(45, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing Pylons
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-16, 0); ctx.lineTo(-45, 0);
      ctx.moveTo(16, 0); ctx.lineTo(45, 0);
      ctx.stroke();

      // Twin Rapid-Fire Blaster Cannons
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-6, 16, 3, 0, Math.PI * 2);
      ctx.arc(6, 16, 3, 0, Math.PI * 2);
      ctx.fill();

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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Radar className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
              TIE SCOUT // HYPERSPACE RECON SKIRMISH
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/rc Scout Probe Deep Core hyperspace charting & combat for {currentUser?.name}
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
                <span className="font-bold text-cyan-400">{shields} / 10</span>
              </div>
              <div>
                <span className="text-zinc-400">RAIDERS: </span>
                <span className="font-bold text-emerald-400">{raidersNeutralized} NEUTRALIZED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-sky-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY SCOUT PROBE, [SPACE] FIRE TWIN BLASTERS
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
                  {gameState === 'sector_mapped' ? 'DEEP CORE SECTOR FULLY MAPPED!' : 'TIE SCOUT PROBE READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the hyperdrive-equipped TIE/rc Scout Probe, scan uncharted hyperspace lanes, and eliminate Mandalorian pirate interceptors!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-700 to-emerald-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH SCOUT PROBE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
