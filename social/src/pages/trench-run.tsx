import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface TieFighter {
  x: number;
  y: number;
  z: number;
  alive: boolean;
}

interface Torpedo {
  x: number;
  y: number;
  z: number;
  life: number;
}

export default function TrenchRun() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [torpedoes, setTorpedoes] = useState(2);
  const [trenchDistance, setTrenchDistance] = useState(1000); // 1000 meters to exhaust port
  const [highScore, setHighScore] = useState(99400);

  const playerPos = useRef({ x: 370, y: 280 });
  const tiesRef = useRef<TieFighter[]>([]);
  const torpedoesRef = useRef<Torpedo[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireProtonTorpedo = () => {
    if (gameState !== 'playing' || torpedoes <= 0) return;
    const p = playerPos.current;
    torpedoesRef.current.push({
      x: p.x,
      y: p.y,
      z: 50,
      life: 80,
    });
    setTorpedoes(t => t - 1);
    uiaudio.warp();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const p = playerPos.current;
      const step = 9;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') p.y = Math.max(120, p.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') p.y = Math.min(360, p.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') p.x = Math.max(160, p.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') p.x = Math.min(580, p.x + step);

      if (e.code === 'Space') fireProtonTorpedo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, torpedoes]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setTorpedoes(2);
    setTrenchDistance(1000);
    playerPos.current = { x: 370, y: 280 };
    torpedoesRef.current = [];
    tiesRef.current = [
      { x: 300, y: 200, z: 400, alive: true },
      { x: 440, y: 220, z: 600, alive: true },
      { x: 370, y: 180, z: 800, alive: true },
    ];
  };

  // Star Wars Vector Wireframe Trench Run Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const p = playerPos.current;

      setTrenchDistance(d => {
        if (d <= 50) {
          return 50; // At thermal exhaust port!
        }
        return d - 2;
      });

      // Update TIE Fighters
      tiesRef.current.forEach((tie) => {
        if (tie.alive) {
          tie.z -= 4;
          if (tie.z < 20) tie.z = 800;
        }
      });

      // Update Proton Torpedoes
      torpedoesRef.current.forEach((torp) => {
        torp.z += 8;
        torp.life -= 1;

        // Check Hit Thermal Exhaust Port at End of Trench
        if (trenchDistance <= 60 && torp.z > 300) {
          torp.life = 0;
          uiaudio.success();
          setGameState('victory');
          setHighScore(h => Math.max(h, score + 25000));
        }
      });

      torpedoesRef.current = torpedoesRef.current.filter(t => t.life > 0);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Vector Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3D Perspective Vector Wireframe Trench (Neon Cyan / Blue Lines)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;

      // Vanishing point horizon
      const vpX = cx;
      const vpY = cy - 20;

      // Left Wall Lines
      ctx.beginPath();
      ctx.moveTo(80, canvas.height); ctx.lineTo(vpX - 40, vpY);
      ctx.moveTo(80, 40); ctx.lineTo(vpX - 40, vpY);
      // Right Wall Lines
      ctx.moveTo(canvas.width - 80, canvas.height); ctx.lineTo(vpX + 40, vpY);
      ctx.moveTo(canvas.width - 80, 40); ctx.lineTo(vpX + 40, vpY);
      ctx.stroke();

      // Transverse Floor Trench Ribs (Moving towards player)
      for (let z = 0; z < 6; z++) {
        const offset = ((frame * 6 + z * 100) % 600) / 600;
        const ribY = vpY + (canvas.height - vpY) * offset;
        const leftX = (vpX - 40) - ((vpX - 40) - 80) * offset;
        const rightX = (vpX + 40) + (canvas.width - 80 - (vpX + 40)) * offset;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.moveTo(leftX, ribY); ctx.lineTo(rightX, ribY);
        ctx.stroke();
      }

      // Draw 2-Meter Thermal Exhaust Port at Far End (Golden Circle)
      if (trenchDistance <= 150) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(vpX, vpY + 20, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw X-Wing Targeting Reticle (Neon Green / Cyan)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 22, 0, Math.PI * 2);
      ctx.moveTo(p.x - 30, p.y); ctx.lineTo(p.x + 30, p.y);
      ctx.moveTo(p.x, p.y - 30); ctx.lineTo(p.x, p.y + 30);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Proton Torpedoes (Glowing Magenta Bolts)
      torpedoesRef.current.forEach((torp) => {
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(torp.x, torp.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, trenchDistance]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Target className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              STAR WARS // 3D VECTOR WIREFRAME TRENCH RUN
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Meridian trench speed run & 2-meter thermal exhaust port proton torpedo strike for {currentUser?.name}
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

        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">DISTANCE: </span>
                <span className="font-bold text-base text-cyan-300">{trenchDistance} m</span>
              </div>
              <div>
                <span className="text-zinc-400">TORPEDOES: </span>
                <span className="font-bold text-pink-400">{torpedoes}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] STEER RETICLE, [SPACE] FIRE PROTON TORPEDO
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'playing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  {gameState === 'victory' ? 'DIRECT HIT! REACTOR CORE DESTROYED - VICTORY!' : 'TRENCH RUN 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Navigate down the Meridian Trench, switch off your targeting computer, and launch proton torpedoes into the 2-meter thermal exhaust port!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START ATTACK RUN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
