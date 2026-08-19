import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface DefenseCruiser {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieEchelonRaid() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'raid' | 'crashed' | 'fleet_captured'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(8);
  const [specialForcesDeployed, setSpecialForcesDeployed] = useState(0);
  const [highScore, setHighScore] = useState(295000);

  const echelonPos = useRef({ x: 370, y: 360, roll: 0 });
  const cruisersRef = useRef<DefenseCruiser[]>([
    { x: 260, y: 220, z: 320, alive: true },
    { x: 480, y: 190, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 310, y: 180, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireHeavyQuadLasers = () => {
    if (gameState !== 'raid') return;
    uiaudio.warp();
    const e = echelonPos.current;

    // Check hit on Defense Cruisers
    cruisersRef.current.forEach((c) => {
      if (c.alive && c.z < 520 && c.z > 50) {
        if (Math.hypot(c.x - e.x, c.y - e.y) < 65) {
          c.alive = false;
          uiaudio.success();
          setSpecialForcesDeployed(sf => sf + 6);
          setScore(sc => sc + 40000);
        }
      }
    });

    if (cruisersRef.current.every(c => !c.alive)) {
      setGameState('fleet_captured');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 175000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'raid') return;
      const ec = echelonPos.current;
      const step = 15;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') ec.y = Math.max(100, ec.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') ec.y = Math.min(420, ec.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        ec.x = Math.max(100, ec.x - step);
        ec.roll = -0.3;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        ec.x = Math.min(640, ec.x + step);
        ec.roll = 0.3;
      }

      if (e.code === 'Space') fireHeavyQuadLasers();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        echelonPos.current.roll = 0;
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
    setGameState('raid');
    setScore(0);
    setShields(8);
    setSpecialForcesDeployed(0);
    echelonPos.current = { x: 370, y: 360, roll: 0 };
    cruisersRef.current = [
      { x: 260, y: 220, z: 320, alive: true },
      { x: 480, y: 190, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 310, y: 180, z: 640, alive: true },
    ];
  };

  // TIE/es Echelon Heavy Assault Raid Loop
  useEffect(() => {
    if (gameState !== 'raid') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 40);
      const ec = echelonPos.current;

      // Move Cruisers
      cruisersRef.current.forEach((c) => {
        c.z -= 4.0;
        if (c.z < 50 && c.z > 10 && c.alive) {
          c.z = 640; // Loop around
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

      // Exegol Sith Lightning Atmosphere Void
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Blue Atmospheric Lightning Bolts
      if (Math.random() < 0.15) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, 0);
        ctx.lineTo(Math.random() * canvas.width, canvas.height);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw Planetary Defense Cruisers
      cruisersRef.current.forEach((c) => {
        if (c.alive && c.z > 0) {
          const scale = 250 / c.z;
          ctx.fillStyle = '#0284c7';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          // Wedge-shaped Command Cruiser
          ctx.moveTo(c.x, c.y - 20 * scale);
          ctx.lineTo(c.x + 35 * scale, c.y + 16 * scale);
          ctx.lineTo(c.x - 35 * scale, c.y + 16 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/es Echelon (Massive Inward-Canted Tall Dagger Wings + Command Pod)
      ctx.save();
      ctx.translate(ec.x, ec.y);
      ctx.rotate(ec.roll);

      // First Order Matte Black Hull
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Armored Angular Command Cockpit Pod
      ctx.beginPath();
      ctx.moveTo(0, -32);
      ctx.lineTo(16, 5);
      ctx.lineTo(12, 35);
      ctx.lineTo(-12, 35);
      ctx.lineTo(-16, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Red First Order Cockpit Glass
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, -10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Tall Inward-Canted Dagger Wings (Left & Right)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;

      // Left Inward-Canted Wing
      ctx.beginPath();
      ctx.moveTo(-16, -15);
      ctx.lineTo(-65, -55);
      ctx.lineTo(-75, 35);
      ctx.lineTo(-16, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Inward-Canted Wing
      ctx.beginPath();
      ctx.moveTo(16, -15);
      ctx.lineTo(65, -55);
      ctx.lineTo(75, 35);
      ctx.lineTo(16, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Heavy Green Quad Laser Cannons (Wing-mounted)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-65, -55); ctx.lineTo(-65, -85);
      ctx.moveTo(-75, 35); ctx.lineTo(-75, 5);
      ctx.moveTo(65, -55); ctx.lineTo(65, -85);
      ctx.moveTo(75, 35); ctx.lineTo(75, 5);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-zinc-800 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-200 to-cyan-400">
              TIE ECHELON // EXEGOL HYPERSPACE RAID
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/es heavy assault shuttle & First Order Special Forces insertion for {currentUser?.name}
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

        {gameState === 'raid' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">HULL: </span>
                <span className="font-bold text-red-400">{shields} / 8</span>
              </div>
              <div>
                <span className="text-zinc-400">SPECIAL FORCES: </span>
                <span className="font-bold text-amber-300">{specialForcesDeployed} DEPLOYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-red-400 font-bold">
              [WASD] FLY TIE ECHELON, [SPACE] HEAVY QUAD CANNONS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'raid' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
                  {gameState === 'fleet_captured' ? 'ENEMY DEFENSE FLEET NEUTRALIZED!' : 'TIE/ES ECHELON ASSAULT READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the heavy TIE/es Echelon assault shuttle through Exegol's lightning skies, eliminate defense cruisers, and deploy Special Forces!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-zinc-800 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH TIE ECHELON</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
