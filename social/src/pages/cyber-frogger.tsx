import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  color: string;
  isLog: boolean;
}

export default function CyberFrogger() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(48200);

  const playerRef = useRef({ x: 370, y: 440, r: 12 });
  const obstaclesRef = useRef<Obstacle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const initObstacles = () => {
    obstaclesRef.current = [
      // Cyber Highway Traffic (y: 380, 320, 260)
      { x: 100, y: 380, w: 60, h: 25, vx: 3.5, color: '#ef4444', isLog: false },
      { x: 400, y: 380, w: 60, h: 25, vx: 3.5, color: '#ef4444', isLog: false },
      { x: 200, y: 320, w: 80, h: 25, vx: -4.2, color: '#f59e0b', isLog: false },
      { x: 550, y: 320, w: 80, h: 25, vx: -4.2, color: '#f59e0b', isLog: false },
      { x: 150, y: 260, w: 50, h: 25, vx: 5.0, color: '#ec4899', isLog: false },

      // Cyber River Holographic Conduits (y: 180, 120, 60)
      { x: 80, y: 180, w: 100, h: 25, vx: 2.2, color: '#06b6d4', isLog: true },
      { x: 360, y: 180, w: 100, h: 25, vx: 2.2, color: '#06b6d4', isLog: true },
      { x: 150, y: 120, w: 120, h: 25, vx: -2.8, color: '#38bdf8', isLog: true },
      { x: 450, y: 120, w: 120, h: 25, vx: -2.8, color: '#38bdf8', isLog: true },
      { x: 200, y: 60, w: 90, h: 25, vx: 3.2, color: '#06b6d4', isLog: true },
    ];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const p = playerRef.current;
      const hop = 30;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        p.y = Math.max(30, p.y - hop);
        uiaudio.click();
        setScore(s => s + 50);
      }
      if (e.code === 'KeyS' || e.code === 'ArrowDown') p.y = Math.min(440, p.y + hop);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') p.x = Math.max(30, p.x - hop);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') p.x = Math.min(710, p.x + hop);

      // Check Victory Reach Goal
      if (p.y <= 40) {
        uiaudio.success();
        setGameState('victory');
        setHighScore(h => Math.max(h, score + 2000));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, score]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    playerRef.current = { x: 370, y: 440, r: 12 };
    initObstacles();
  };

  // Cyber Frogger Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const p = playerRef.current;

      // Update Obstacles
      obstaclesRef.current.forEach((obs) => {
        obs.x += obs.vx;
        if (obs.vx > 0 && obs.x > canvas.width) obs.x = -obs.w;
        if (obs.vx < 0 && obs.x + obs.w < 0) obs.x = canvas.width;
      });

      // Check Highway Car Collisions (y between 240 and 400)
      if (p.y >= 240 && p.y <= 400) {
        obstaclesRef.current.forEach((obs) => {
          if (!obs.isLog) {
            if (p.x > obs.x && p.x < obs.x + obs.w && p.y > obs.y && p.y < obs.y + obs.h) {
              uiaudio.error();
              setGameState('gameover');
            }
          }
        });
      }

      // Check River Drowning (y between 50 and 200)
      if (p.y >= 50 && p.y <= 200) {
        let onLog = false;
        let logVx = 0;
        obstaclesRef.current.forEach((obs) => {
          if (obs.isLog) {
            if (p.x > obs.x && p.x < obs.x + obs.w && p.y > obs.y && p.y < obs.y + obs.h) {
              onLog = true;
              logVx = obs.vx;
            }
          }
        });

        if (onLog) {
          p.x += logVx; // Carry player along log
        } else {
          // Drowned in Cyber River
          uiaudio.error();
          setGameState('gameover');
        }
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background Lanes
      ctx.fillStyle = '#020617'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Cyber River Zone (Cyan water)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)'; ctx.fillRect(0, 50, canvas.width, 160);
      // Cyber Highway Zone (Dark Asphalt)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)'; ctx.fillRect(0, 240, canvas.width, 170);

      // Draw Obstacles (Cars & Logs)
      obstaclesRef.current.forEach((obs) => {
        ctx.fillStyle = obs.color;
        ctx.shadowColor = obs.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.shadowBlur = 0;
      });

      // Draw Cyber Frog (Neon Emerald Sphere)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(34,197,94,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Compass className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              CYBER FROGGER // 3D HIGHWAY & RIVER CROSS
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Traffic evasion & holographic conduit river crossing for {currentUser?.name}
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

      {/* Game Stage */}
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
              <span className="font-bold text-base text-emerald-300">{score.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] / ARROWS TO HOP
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
                  {gameState === 'victory' ? 'GRID PERIMETER REACHED - VICTORY!' : (gameState === 'gameover' ? 'DERESOLVED - GAME OVER' : 'CYBER FROGGER')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Dodge highway cyber traffic and ride holographic log conduits across the river to victory!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>START CYBER HOP</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
