import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Point {
  x: number;
  y: number;
}

export default function LightCycles() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'player_win' | 'ai_win'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(38400);

  const p1Ref = useRef<{ x: number; y: number; dir: 'up' | 'down' | 'left' | 'right'; trail: Point[] }>({
    x: 180, y: 240, dir: 'right', trail: []
  });

  const p2Ref = useRef<{ x: number; y: number; dir: 'up' | 'down' | 'left' | 'right'; trail: Point[] }>({
    x: 560, y: 240, dir: 'left', trail: []
  });

  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const p = p1Ref.current;
      if ((e.code === 'KeyW' || e.code === 'ArrowUp') && p.dir !== 'down') p.dir = 'up';
      if ((e.code === 'KeyS' || e.code === 'ArrowDown') && p.dir !== 'up') p.dir = 'down';
      if ((e.code === 'KeyA' || e.code === 'ArrowLeft') && p.dir !== 'right') p.dir = 'left';
      if ((e.code === 'KeyD' || e.code === 'ArrowRight') && p.dir !== 'left') p.dir = 'right';
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    p1Ref.current = { x: 180, y: 240, dir: 'right', trail: [{ x: 180, y: 240 }] };
    p2Ref.current = { x: 560, y: 240, dir: 'left', trail: [{ x: 560, y: 240 }] };
  };

  // Light Cycles Physics & Collision Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const speed = 4;

    const loop = () => {
      const p1 = p1Ref.current;
      const p2 = p2Ref.current;

      // Move Player 1
      if (p1.dir === 'up') p1.y -= speed;
      if (p1.dir === 'down') p1.y += speed;
      if (p1.dir === 'left') p1.x -= speed;
      if (p1.dir === 'right') p1.x += speed;
      p1.trail.push({ x: p1.x, y: p1.y });

      // AI Simple Wall Avoidance Steering
      if (p2.dir === 'left' && (p2.x < 100 || Math.random() < 0.02)) p2.dir = p2.y > 240 ? 'up' : 'down';
      else if (p2.dir === 'right' && (p2.x > canvas.width - 100 || Math.random() < 0.02)) p2.dir = p2.y > 240 ? 'up' : 'down';
      else if (p2.dir === 'up' && (p2.y < 100 || Math.random() < 0.02)) p2.dir = p2.x > 370 ? 'left' : 'right';
      else if (p2.dir === 'down' && (p2.y > canvas.height - 100 || Math.random() < 0.02)) p2.dir = p2.x > 370 ? 'left' : 'right';

      if (p2.dir === 'up') p2.y -= speed;
      if (p2.dir === 'down') p2.y += speed;
      if (p2.dir === 'left') p2.x -= speed;
      if (p2.dir === 'right') p2.x += speed;
      p2.trail.push({ x: p2.x, y: p2.y });

      // Boundary Collisions
      if (p1.x < 30 || p1.x > canvas.width - 30 || p1.y < 30 || p1.y > canvas.height - 30) {
        uiaudio.error();
        setGameState('ai_win');
        return;
      }
      if (p2.x < 30 || p2.x > canvas.width - 30 || p2.y < 30 || p2.y > canvas.height - 30) {
        uiaudio.success();
        setGameState('player_win');
        setScore(sc => sc + 1000);
        setHighScore(h => Math.max(h, score + 1000));
        return;
      }

      // Check Trail Collisions
      const checkCrash = (head: Point, trail: Point[], skipRecent: number) => {
        for (let i = 0; i < trail.length - skipRecent; i++) {
          const dx = head.x - trail[i].x;
          const dy = head.y - trail[i].y;
          if (Math.sqrt(dx * dx + dy * dy) < 6) return true;
        }
        return false;
      };

      if (checkCrash(p1, p1.trail, 15) || checkCrash(p1, p2.trail, 0)) {
        uiaudio.error();
        setGameState('ai_win');
        return;
      }
      if (checkCrash(p2, p2.trail, 15) || checkCrash(p2, p1.trail, 0)) {
        uiaudio.success();
        setGameState('player_win');
        setScore(sc => sc + 1000);
        setHighScore(h => Math.max(h, score + 1000));
        return;
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Matrix Grid Floor
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Arena Bounds
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(25, 25, canvas.width - 50, canvas.height - 50);

      // Draw P1 Neon Cyan Light Wall Trail
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      p1.trail.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();

      // Draw P2 Neon Orange/Red Light Wall Trail
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      p2.trail.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
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
            <Zap className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              LIGHT CYCLES // 3D TRON GRID DUEL
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Solid laser light wall trail & AI interception duel for {currentUser?.name}
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

      {/* Grid Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              YOU: CYAN LIGHT CYCLE
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-rose-400 font-bold">
              [WASD] / ARROWS 90° VECTOR TURNS
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
                  {gameState === 'player_win' ? 'VICTORY - ENEMY DEREZZED!' : (gameState === 'ai_win' ? 'CRASH - GRID ELIMINATION' : 'LIGHT CYCLES')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Make 90° turns with [WASD] or Arrow keys. Force your opponent into your solid neon light wall!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ENTER THE GRID</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
