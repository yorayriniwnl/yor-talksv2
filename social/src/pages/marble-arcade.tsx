import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Circle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MarbleArcade() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [highScore, setHighScore] = useState(78200);

  const marblePos = useRef({ x: 120, y: 100, vx: 0, vy: 0 });
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const m = marblePos.current;
      const accel = 0.8;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') m.vy -= accel;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') m.vy += accel;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') m.vx -= accel;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') m.vx += accel;
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setTimeLeft(60);
    marblePos.current = { x: 120, y: 100, vx: 0, vy: 0 };
  };

  // Marble Madness Isometric Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          setGameState('gameover');
          uiaudio.error();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const m = marblePos.current;

      // Inertia and Isometric Slope Gravity (Pulling southeast down track)
      m.vx += 0.05; // Slight isometric slope drift
      m.vy += 0.05;

      m.vx *= 0.96; // Surface friction
      m.vy *= 0.96;

      m.x += m.vx;
      m.y += m.vy;

      // Check Victory Goal (Bottom right goal area)
      if (m.x > 620 && m.y > 360) {
        uiaudio.success();
        setGameState('victory');
        setHighScore(h => Math.max(h, score + timeLeft * 100));
      }

      // Check Fall Off Grid
      if (m.x < 40 || m.x > 700 || m.y < 40 || m.y > 440) {
        uiaudio.error();
        // Reset to top ramp
        m.x = 120;
        m.y = 100;
        m.vx = 0;
        m.vy = 0;
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Isometric Grid Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Isometric Ramp Blocks (Neon Cyan / Purple Polygons)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;

      // Draw Main Winding Isometric Track Pathways
      [
        { x1: 80, y1: 80, x2: 240, y2: 180 },
        { x1: 240, y1: 180, x2: 460, y2: 160 },
        { x1: 460, y1: 160, x2: 520, y2: 320 },
        { x1: 520, y1: 320, x2: 660, y2: 400 },
      ].forEach((seg) => {
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 40;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
      });

      // Goal Pad (Golden Checkered Pad at 640, 380)
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(640, 380, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Chrome Marble with Reflection Highlight
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Chrome Reflection Glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x - 3, m.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, timeLeft]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Circle className="w-8 h-8 text-white animate-spin" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              MARBLE MADNESS // 3D ISOMETRIC TRACKBALL ARCADE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Gravitational slope navigation, inertia damping & obstacle evasion for {currentUser?.name}
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
                <span className="text-zinc-400">TIME: </span>
                <span className="font-bold text-base text-cyan-300">{timeLeft}s</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-amber-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD / ARROWS] ROLL MARBLE DOWN ISOMETRIC SLOPES
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
                  {gameState === 'victory' ? 'GOAL REACHED - VICTORY!' : 'MARBLE MADNESS 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Roll the chrome marble down steep isometric ramps and razor bridges before time runs out!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ROLL MARBLE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
