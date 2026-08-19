import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Flipper {
  lane: number;
  depth: number; // 0 (far) to 1.0 (rim)
}

interface Blast {
  lane: number;
  depth: number;
}

export default function TempestVortex() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(69400);

  const playerLane = useRef(0); // 0 to 15 (16 geometric prism lanes)
  const flippersRef = useRef<Flipper[]>([]);
  const blastsRef = useRef<Blast[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireBlast = () => {
    if (gameState !== 'playing') return;
    blastsRef.current.push({
      lane: playerLane.current,
      depth: 1.0, // starts at outer rim, moves inward
    });
    uiaudio.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') playerLane.current = (playerLane.current - 1 + 16) % 16;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') playerLane.current = (playerLane.current + 1) % 16;
      if (e.code === 'Space') fireBlast();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    playerLane.current = 0;
    blastsRef.current = [];
    flippersRef.current = [
      { lane: 4, depth: 0.1 },
      { lane: 8, depth: 0.2 },
      { lane: 12, depth: 0.15 },
    ];
  };

  // Tempest Vector Tube Perspective Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;

      // Spawn Flippers from Vortex Abyss
      if (frame % 45 === 0) {
        flippersRef.current.push({
          lane: Math.floor(Math.random() * 16),
          depth: 0.05,
        });
      }

      // Update Flippers ascending toward outer rim
      flippersRef.current.forEach((f) => {
        f.depth += 0.008;

        // Hit outer rim on player's lane -> Game Over
        if (f.depth >= 0.98 && f.lane === playerLane.current) {
          uiaudio.error();
          setGameState('gameover');
          setHighScore(h => Math.max(h, score));
        }
      });

      // Update Blasts descending down vortex
      blastsRef.current.forEach((b) => {
        b.depth -= 0.035;

        // Check Hit Flipper
        flippersRef.current.forEach((f) => {
          if (f.lane === b.lane && Math.abs(f.depth - b.depth) < 0.08) {
            f.depth = 99; // destroyed
            b.depth = -1;
            uiaudio.success();
            setScore(s => s + 150);
          }
        });
      });

      flippersRef.current = flippersRef.current.filter(f => f.depth < 1.05);
      blastsRef.current = blastsRef.current.filter(b => b.depth > 0);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Geometric Vortex Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const innerR = 40;
      const outerR = 190;

      // Draw 16 Vector Tube Corridors
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;

      for (let i = 0; i < 16; i++) {
        const a1 = (i * Math.PI * 2) / 16;
        const a2 = ((i + 1) * Math.PI * 2) / 16;

        // Outer rim segment
        const ox1 = cx + Math.cos(a1) * outerR;
        const oy1 = cy + Math.sin(a1) * outerR;
        const ox2 = cx + Math.cos(a2) * outerR;
        const oy2 = cy + Math.sin(a2) * outerR;

        // Inner vortex abyss segment
        const ix1 = cx + Math.cos(a1) * innerR;
        const iy1 = cy + Math.sin(a1) * innerR;
        const ix2 = cx + Math.cos(a2) * innerR;
        const iy2 = cy + Math.sin(a2) * innerR;

        // Highlight active player lane in Yellow
        if (i === playerLane.current) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
          ctx.beginPath();
          ctx.moveTo(ox1, oy1); ctx.lineTo(ox2, oy2); ctx.lineTo(ix2, iy2); ctx.lineTo(ix1, iy1);
          ctx.closePath();
          ctx.fill();
        }

        ctx.beginPath();
        ctx.moveTo(ox1, oy1); ctx.lineTo(ix1, iy1);
        ctx.moveTo(ox1, oy1); ctx.lineTo(ox2, oy2);
        ctx.moveTo(ix1, iy1); ctx.lineTo(ix2, iy2);
        ctx.stroke();
      }

      // Draw Flippers ascending the tube (Red Bowties)
      flippersRef.current.forEach((f) => {
        const midA = ((f.lane + 0.5) * Math.PI * 2) / 16;
        const r = innerR + f.depth * (outerR - innerR);
        const fx = cx + Math.cos(midA) * r;
        const fy = cy + Math.sin(midA) * r;

        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(fx, fy, 4 + f.depth * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Blasts (Cyan Laser Bolts)
      blastsRef.current.forEach((b) => {
        const midA = ((b.lane + 0.5) * Math.PI * 2) / 16;
        const r = innerR + b.depth * (outerR - innerR);
        const bx = cx + Math.cos(midA) * r;
        const by = cy + Math.sin(midA) * r;

        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bx, by, 3 + b.depth * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Player Blaster Claw at Outer Rim (Neon Yellow Chevron)
      const pAngle = ((playerLane.current + 0.5) * Math.PI * 2) / 16;
      const px = cx + Math.cos(pAngle) * outerR;
      const py = cy + Math.sin(pAngle) * outerR;

      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Target className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              TEMPEST // 3D VECTOR TUBE VORTEX SHOOTER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              16-lane geometric prism corridor & abyss flipper interception for {currentUser?.name}
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
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
              <span className="text-zinc-400">SCORE: </span>
              <span className="font-bold text-base text-cyan-300">{score.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [A/D] SWITCH LANES, [SPACE] FIRE INTO TUBE
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
                  {gameState === 'gameover' ? 'VORTEX OVERRUN - GAME OVER' : 'TEMPEST 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Rotate along the outer rim of the 16-facet vector prism and blast crawlers before they reach the edge!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ENTER THE VORTEX</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
