import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Swords, Compass as CompassIcon
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface VagaariPirateFrigate {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

export default function TieClawcraftSkirmish() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'dogfight' | 'crashed' | 'anomaly_cleared'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(12);
  const [piratesDestroyed, setPiratesDestroyed] = useState(0);
  const [highScore, setHighScore] = useState(405000);

  const shipPos = useRef({ x: 370, y: 360, roll: 0 });
  const piratesRef = useRef<VagaariPirateFrigate[]>([
    { x: 230, y: 210, z: 320, alive: true },
    { x: 510, y: 180, z: 460, alive: true },
    { x: 370, y: 250, z: 580, alive: true },
    { x: 300, y: 170, z: 640, alive: true },
  ]);
  const animFrameRef = useRef<number | null>(null);

  const fireQuadLaserBarrage = () => {
    if (gameState !== 'dogfight') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on Vagaari Frigates
    piratesRef.current.forEach((p) => {
      if (p.alive && p.z < 520 && p.z > 50) {
        if (Math.hypot(p.x - s.x, p.y - s.y) < 65) {
          p.alive = false;
          uiaudio.success();
          setPiratesDestroyed(pd => pd + 1);
          setScore(sc => sc + 58000);
        }
      }
    });

    if (piratesRef.current.every(p => !p.alive)) {
      setGameState('anomaly_cleared');
      uiaudio.success();
      setHighScore(h => Math.max(h, score + 240000));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'dogfight') return;
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

      if (e.code === 'Space') fireQuadLaserBarrage();
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
    setGameState('dogfight');
    setScore(0);
    setShields(12);
    setPiratesDestroyed(0);
    shipPos.current = { x: 370, y: 360, roll: 0 };
    piratesRef.current = [
      { x: 230, y: 210, z: 320, alive: true },
      { x: 510, y: 180, z: 460, alive: true },
      { x: 370, y: 250, z: 580, alive: true },
      { x: 300, y: 170, z: 640, alive: true },
    ];
  };

  // Nssis-Class Clawcraft Combat Loop
  useEffect(() => {
    if (gameState !== 'dogfight') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 45);
      const s = shipPos.current;

      // Move Vagaari Frigates
      piratesRef.current.forEach((p) => {
        p.z -= 4.3;
        if (p.z < 50 && p.z > 10 && p.alive) {
          p.z = 640; // Loop around
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

      // Unknown Regions Hyperspace Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Hyperspace Anomaly Distortion Waves
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.lineWidth = 1;
      for (let d = 0; d < 5; d++) {
        const offset = (frame * 3 + d * 90) % 480;
        ctx.strokeRect(cx - 280 + d * 120, cy + 60, 60, 60);
      }

      // Draw Vagaari Pirate Warships
      piratesRef.current.forEach((p) => {
        if (p.alive && p.z > 0) {
          const scale = 250 / p.z;
          ctx.fillStyle = '#ef4444';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y - 15 * scale);
          ctx.lineTo(p.x + 25 * scale, p.y + 15 * scale);
          ctx.lineTo(p.x - 25 * scale, p.y + 15 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Chiss Nssis-Class Clawcraft (Central TIE Ball + 4 Curved Claw Wing Arms)
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.roll);

      // Central Imperial TIE Ball Cockpit
      ctx.fillStyle = '#18181b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Red Chiss Sensor Viewport
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4 Forward-Curved Claw Wings (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;

      // Top-Left Claw
      ctx.beginPath();
      ctx.moveTo(-12, -12);
      ctx.quadraticCurveTo(-45, -35, -25, -55);
      ctx.stroke();

      // Top-Right Claw
      ctx.beginPath();
      ctx.moveTo(12, -12);
      ctx.quadraticCurveTo(45, -35, 25, -55);
      ctx.stroke();

      // Bottom-Left Claw
      ctx.beginPath();
      ctx.moveTo(-12, 12);
      ctx.quadraticCurveTo(-45, 35, -25, 55);
      ctx.stroke();

      // Bottom-Right Claw
      ctx.beginPath();
      ctx.moveTo(12, 12);
      ctx.quadraticCurveTo(45, 35, 25, 55);
      ctx.stroke();

      // Quad Laser Cannons at Wingtips
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(-25, -55, 3.5, 0, Math.PI * 2);
      ctx.arc(25, -55, 3.5, 0, Math.PI * 2);
      ctx.arc(-25, 55, 3.5, 0, Math.PI * 2);
      ctx.arc(25, 55, 3.5, 0, Math.PI * 2);
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
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-red-900 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Swords className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-red-400">
              TIE CLAWCRAFT // CHISS ASCENDANCY SKIRMISH
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Nssis-Class Clawcraft Unknown Regions combat patrol for {currentUser?.name}
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

        {gameState === 'dogfight' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-400">{shields} / 12</span>
              </div>
              <div>
                <span className="text-zinc-400">VAGAARI WARSHIPS: </span>
                <span className="font-bold text-red-400">{piratesDestroyed} DESTROYED</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-sky-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] FLY CLAWCRAFT, [SPACE] FIRE QUAD LASER CANNONS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'dogfight' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-red-400">
                  {gameState === 'anomaly_cleared' ? 'UNKNOWN REGIONS SECTOR SECURED!' : 'CHISS NSSIS CLAWCRAFT READY'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot Grand Admiral Thrawn's personal Nssis-Class Clawcraft, navigate hyperspace anomaly storms, and destroy Vagaari pirate raiders!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-indigo-700 to-red-600 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH CLAWCRAFT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
