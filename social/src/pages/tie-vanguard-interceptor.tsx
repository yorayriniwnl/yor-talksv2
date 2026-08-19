import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Shield, Radar
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RebelInfiltratorShip {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieVanguardInterceptor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'recon' | 'crashed' | 'sector_mapped'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(10);
  const [infiltratorsScanned, setInfiltratorsScanned] = useState(0);
  const [highScore, setHighScore] = useState(485000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const shipsRef = useRef<RebelInfiltratorShip[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireForwardLasers = () => {
    if (gameState !== 'recon') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Rebel Infiltrators
    shipsRef.current.forEach((sh) => {
      if (sh.alive && sh.z < 520 && sh.z > 50) {
        if (Math.hypot(sh.x - s.x, sh.y - s.y) < 65) {
          sh.alive = false;
          uiaudio.success();
          setInfiltratorsScanned(is => is + 1);
          setScore(sc => sc + 82000);
        }
      }
    });

    if (shipsRef.current.every(sh => !sh.alive)) {
      setGameState('sector_mapped');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 330000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'recon') return;
      const s = shipPos.current;
      const step = 18;

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

      if (e.code === 'Space') fireForwardLasers();
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
    setInfiltratorsScanned(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    shipsRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // TIE Vanguard Recon Combat Loop
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

      // Move Rebel Infiltrators
      shipsRef.current.forEach((sh) => {
        sh.z -= 4.6;
        if (sh.z < 50 && sh.z > 10 && sh.alive) {
          sh.z = 640; // Loop around
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

      // Distant Sensor Grid Sweep
      const sweepAngle = (frame * 0.05) % (Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 80, 80, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 80);
      ctx.lineTo(cx + Math.cos(sweepAngle) * 80, cy - 80 + Math.sin(sweepAngle) * 80);
      ctx.stroke();

      // Draw Rebel Infiltrator Ships
      shipsRef.current.forEach((sh) => {
        if (sh.alive && sh.z > 0) {
          const scale = 250 / sh.z;
          ctx.fillStyle = '#ec4899';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ec4899';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.moveTo(sh.x, sh.y - 20 * scale);
          ctx.lineTo(sh.x + 18 * scale, sh.y + 16 * scale);
          ctx.lineTo(sh.x - 18 * scale, sh.y + 16 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw TIE/rc Vanguard (Command Pod + Upper Sensor Dome + Cutout Solar Wings)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Central Command Pod
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Upper Long-Range Recon Sensor Dome (Top at 0, -22)
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, -20, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Pilot Viewport
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      // Cutout High-Agility Solar Wings (Left & Right)
      ctx.fillStyle = '#09090b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;

      // Left Cutout Wing
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-45, -30);
      ctx.lineTo(-45, -10);
      ctx.lineTo(-32, 0);
      ctx.lineTo(-45, 10);
      ctx.lineTo(-45, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Cutout Wing
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(45, -30);
      ctx.lineTo(45, -10);
      ctx.lineTo(32, 0);
      ctx.lineTo(45, 10);
      ctx.lineTo(45, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Twin Forward Laser Cannons
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-8, 14, 3, 0, Math.PI * 2);
      ctx.arc(8, 14, 3, 0, Math.PI * 2);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Radar className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-400">
              TIE VANGUARD // RECON SCOUT COMBAT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              TIE/rc Vanguard upper sensor dome long-range reconnaissance for {currentUser?.name}
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
                <span className="font-bold text-sky-400">{shields} / 10</span>
              </div>
              <div>
                <span className="text-zinc-400">SCANNED: </span>
                <span className="font-bold text-pink-400">{infiltratorsScanned} INFILTRATORS</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-emerald-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] RECON FLIGHT, [SPACE] TWIN FORWARD LASERS
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-400">
                  {gameState === 'sector_mapped' ? 'RECONNAISSANCE PATROL COMPLETED!' : 'TIE VANGUARD READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the Imperial TIE/rc Vanguard, sweep the sector with the upper sensor dome, and neutralize cloaked Rebel reconnaissance vessels!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-sky-700 to-pink-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH VANGUARD</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
