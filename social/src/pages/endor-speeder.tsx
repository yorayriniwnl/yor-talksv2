import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Trees
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface RedwoodTree {
  x: number;
  z: number;
  width: number;
}

export default function EndorSpeeder() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'racing' | 'crashed' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(500); // 500 km/h speeder bike run
  const [distanceKm, setDistanceKm] = useState(0);
  const [highScore, setHighScore] = useState(108000);

  const bikePos = useRef({ x: 370, y: 380 });
  const treesRef = useRef<RedwoodTree[]>([]);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'racing') return;
      const b = bikePos.current;
      const step = 14;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') b.x = Math.max(120, b.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') b.x = Math.min(620, b.x + step);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('racing');
    setScore(0);
    setDistanceKm(0);
    bikePos.current = { x: 370, y: 380 };
    treesRef.current = [];
  };

  // Endor Forest Speeder Bike 3D Physics Loop
  useEffect(() => {
    if (gameState !== 'racing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const b = bikePos.current;

      setDistanceKm(d => {
        const next = +(d + 0.05).toFixed(2);
        if (next >= 10.0) {
          setGameState('victory');
          uiaudio.success();
          setHighScore(h => Math.max(h, score + 40000));
        }
        return next;
      });
      setScore(s => s + 45);

      // Spawn Random Approaching Redwood Trees (z = 600 down to 0)
      if (Math.random() < 0.18) {
        treesRef.current.push({
          x: Math.random() * (canvas.width - 200) + 100,
          z: 600,
          width: Math.random() * 20 + 30,
        });
      }

      // Move Trees towards Player (Z decreases)
      treesRef.current.forEach((t) => {
        t.z -= 14;

        // Collision Check when tree is close (z < 60)
        if (t.z < 60 && t.z > 20) {
          if (Math.abs(t.x - b.x) < t.width / 2 + 18) {
            setGameState('crashed');
            uiaudio.error();
          }
        }
      });

      treesRef.current = treesRef.current.filter(t => t.z > 0);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Forest Twilight Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Forest Floor Perspective Grid (Emerald Green Vector Lines)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 240);
        ctx.lineTo(cx + (x - cx) * 3, canvas.height);
        ctx.stroke();
      }

      // Draw Approaching Redwood Trees in 3D Perspective
      treesRef.current.forEach((t) => {
        const scale = 1 - t.z / 600;
        const screenX = cx + (t.x - cx) * scale;
        const screenY = 240 + 180 * scale;
        const treeW = t.width * scale * 2.5;
        const treeH = 320 * scale;

        ctx.fillStyle = 'rgba(5, 150, 105, 0.85)';
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.fillRect(screenX - treeW / 2, screenY - treeH, treeW, treeH);
        ctx.strokeRect(screenX - treeW / 2, screenY - treeH, treeW, treeH);
      });

      // Draw Player 74-Z Speeder Bike Cockpit / Handlebars
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.fillRect(b.x - 22, b.y - 12, 44, 24);
      ctx.shadowBlur = 0;

      // Front Outriggers
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - 16, b.y - 12); ctx.lineTo(b.x - 28, b.y - 45);
      ctx.moveTo(b.x + 16, b.y - 12); ctx.lineTo(b.x + 28, b.y - 45);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Trees className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">
              FOREST OF ENDOR // 3D SPEEDER BIKE SLALOM
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              500 km/h redwood tree evasion & scout trooper dogfight for {currentUser?.name}
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

        {gameState === 'racing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">DISTANCE: </span>
                <span className="font-bold text-base text-emerald-300">{distanceKm} / 10.0 km</span>
              </div>
              <div>
                <span className="text-zinc-400">SPEED: </span>
                <span className="font-bold text-cyan-300">{speedKmh} km/h</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-amber-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-emerald-400 font-bold">
              [A / D / ARROWS] STEER SPEEDER BIKE
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'racing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-pink-400">
                  {gameState === 'victory' ? 'ENDOR RUN COMPLETED - ESCAPED!' : (gameState === 'crashed' ? 'SPEEDER CRASHED INTO REDWOOD!' : 'ENDOR SPEEDER BIKE 3D')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Pilot the 74-Z speeder bike through the dense forest canopy of Endor at 500 km/h!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START SPEEDER RUN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
