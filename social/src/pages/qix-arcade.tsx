import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Box
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function QixArcade() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [claimedPercent, setClaimedPercent] = useState(0);
  const [highScore, setHighScore] = useState(62800);

  const markerPos = useRef({ x: 60, y: 60, drawing: false });
  const qixHelix = useRef<{ points: { x: number; y: number }[] }>({ points: [] });
  const claimedBoxes = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const claimNewTerritory = () => {
    claimedBoxes.current.push({
      x: 60,
      y: 60,
      w: Math.random() * 180 + 100,
      h: Math.random() * 140 + 80,
    });
    setClaimedPercent(p => {
      const np = Math.min(85, p + 18);
      if (np >= 75) {
        uiaudio.success();
        setGameState('victory');
        setHighScore(h => Math.max(h, score + 15000));
      }
      return np;
    });
    setScore(s => s + 850);
    uiaudio.success();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const m = markerPos.current;
      const step = 8;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') m.y = Math.max(60, m.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') m.y = Math.min(420, m.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') m.x = Math.max(60, m.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') m.x = Math.min(680, m.x + step);

      if (e.code === 'Space') claimNewTerritory();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, score]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setClaimedPercent(0);
    claimedBoxes.current = [];
    markerPos.current = { x: 60, y: 60, drawing: false };
  };

  // Qix Geometric Vector Stix Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const m = markerPos.current;

      // Update Qix Wandering Helical Multi-Segment Entity in Center
      const qx = 370 + Math.sin(frame * 0.04) * 140;
      const qy = 240 + Math.cos(frame * 0.03) * 90;

      qixHelix.current.points.unshift({ x: qx, y: qy });
      if (qixHelix.current.points.length > 24) qixHelix.current.points.pop();

      // Check Qix collision with drawing marker
      if (Math.hypot(m.x - qx, m.y - qy) < 25) {
        uiaudio.error();
        setGameState('gameover');
        setHighScore(h => Math.max(h, score));
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Arena Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Arena Boundary (Lethal Neon Cyan Grid Frame)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

      // Draw Claimed Territories (Filled Cyan Rectangles)
      claimedBoxes.current.forEach((b) => {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      });

      // Draw The Qix (Rotating Rainbow Helical Ribbon)
      ctx.lineWidth = 2;
      for (let i = 0; i < qixHelix.current.points.length - 1; i++) {
        const p1 = qixHelix.current.points[i];
        const p2 = qixHelix.current.points[i + 1];

        ctx.strokeStyle = `hsl(${(frame * 5 + i * 15) % 360}, 100%, 65%)`;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Draw Diamond Marker Player (Neon Amber Diamond)
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - 8);
      ctx.lineTo(m.x + 8, m.y);
      ctx.lineTo(m.x, m.y + 8);
      ctx.lineTo(m.x - 8, m.y);
      ctx.closePath();
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
            <Box className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              QIX // 3D NEON GEOMETRIC TERRITORY STAKER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Stix line drawing, 75% threshold territory capture & Qix evasion for {currentUser?.name}
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
                <span className="text-zinc-400">CLAIMED: </span>
                <span className="font-bold text-base text-cyan-300">{claimedPercent}% / 75%</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-amber-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] MOVE MARKER, [SPACE] CLOSE STIX TERRITORY
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
                  {gameState === 'victory' ? '75% TERRITORY CLAIMED - VICTORY!' : 'QIX 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Draw Stix lines across the grid to claim 75% of the total arena surface without letting the wandering Qix helix touch your line!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START DRAWING</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
