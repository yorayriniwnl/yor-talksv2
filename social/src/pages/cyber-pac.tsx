import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Dot {
  x: number;
  y: number;
  isEnergizer: boolean;
  eaten: boolean;
}

interface Ghost {
  x: number;
  y: number;
  color: string;
  isVulnerable: boolean;
}

export default function CyberPac() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(76200);

  const playerRef = useRef({ x: 370, y: 360, dir: 'left', nextDir: 'left', mouthOpen: 0.2 });
  const dotsRef = useRef<Dot[]>([]);
  const ghostsRef = useRef<Ghost[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const initMaze = () => {
    const dots: Dot[] = [];
    for (let r = 80; r <= 400; r += 40) {
      for (let c = 80; c <= 660; c += 40) {
        // Skip center box
        if (c >= 300 && c <= 440 && r >= 200 && r <= 280) continue;
        const isCorner = (c === 80 || c === 640) && (r === 80 || r === 400);
        dots.push({ x: c, y: r, isEnergizer: isCorner, eaten: false });
      }
    }
    dotsRef.current = dots;

    ghostsRef.current = [
      { x: 320, y: 240, color: '#ef4444', isVulnerable: false },
      { x: 370, y: 240, color: '#ec4899', isVulnerable: false },
      { x: 420, y: 240, color: '#06b6d4', isVulnerable: false },
    ];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const p = playerRef.current;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') p.nextDir = 'up';
      if (e.code === 'KeyS' || e.code === 'ArrowDown') p.nextDir = 'down';
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') p.nextDir = 'left';
      if (e.code === 'KeyD' || e.code === 'ArrowRight') p.nextDir = 'right';
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    playerRef.current = { x: 370, y: 360, dir: 'left', nextDir: 'left', mouthOpen: 0.2 };
    initMaze();
  };

  // Cyber Pac Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const speed = 3.5;
    let mouthPhase = 0;

    const loop = () => {
      mouthPhase += 0.15;
      const p = playerRef.current;

      p.dir = p.nextDir;
      if (p.dir === 'up') p.y -= speed;
      if (p.dir === 'down') p.y += speed;
      if (p.dir === 'left') p.x -= speed;
      if (p.dir === 'right') p.x += speed;

      // Screen Wrapping
      if (p.x < 50) p.x = canvas.width - 50;
      if (p.x > canvas.width - 50) p.x = 50;
      if (p.y < 50) p.y = canvas.height - 50;
      if (p.y > canvas.height - 50) p.y = 50;

      // Dot Eating Collisions
      dotsRef.current.forEach((dot) => {
        if (!dot.eaten) {
          const dx = p.x - dot.x;
          const dy = p.y - dot.y;
          if (Math.sqrt(dx * dx + dy * dy) < 14) {
            dot.eaten = true;
            uiaudio.click();
            setScore(sc => sc + (dot.isEnergizer ? 500 : 50));

            if (dot.isEnergizer) {
              uiaudio.success();
              // Make all ghosts vulnerable blue for 6 seconds
              ghostsRef.current.forEach(g => g.isVulnerable = true);
              setTimeout(() => {
                ghostsRef.current.forEach(g => g.isVulnerable = false);
              }, 6000);
            }
          }
        }
      });

      // Move Ghosts AI
      ghostsRef.current.forEach((g) => {
        const dx = p.x - g.x;
        const dy = p.y - g.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Chase or flee
        const factor = g.isVulnerable ? -1.5 : 2.0;
        if (dist > 10) {
          g.x += (dx / dist) * factor;
          g.y += (dy / dist) * factor;
        }

        // Ghost vs Player Collision
        if (dist < 18) {
          if (g.isVulnerable) {
            // Eat Ghost
            g.x = 370;
            g.y = 240;
            g.isVulnerable = false;
            uiaudio.success();
            setScore(sc => sc + 800);
          } else {
            // Player Death
            uiaudio.error();
            setGameState('gameover');
            setHighScore(h => Math.max(h, score));
          }
        }
      });

      // Check Victory
      if (dotsRef.current.every(d => d.eaten)) {
        uiaudio.success();
        setGameState('victory');
        setHighScore(h => Math.max(h, score + 2000));
        return;
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Neon Matrix Arena
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Arena Outer Bounds & Maze Walls
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
      // Ghost Box in center
      ctx.strokeRect(280, 200, 180, 80);

      // Draw Glowing Energy Dots
      dotsRef.current.forEach((d) => {
        if (!d.eaten) {
          ctx.fillStyle = d.isEnergizer ? '#ec4899' : '#f59e0b';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = d.isEnergizer ? 15 : 6;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.isEnergizer ? 8 : 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Ghosts
      ghostsRef.current.forEach((g) => {
        ctx.fillStyle = g.isVulnerable ? '#38bdf8' : g.color;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Cyber Pac (Yellow Neon with opening/closing wedge mouth)
      ctx.save();
      ctx.translate(p.x, p.y);
      let rot = 0;
      if (p.dir === 'right') rot = 0;
      if (p.dir === 'down') rot = Math.PI / 2;
      if (p.dir === 'left') rot = Math.PI;
      if (p.dir === 'up') rot = -Math.PI / 2;
      ctx.rotate(rot);

      const mouthWedge = Math.abs(Math.sin(mouthPhase)) * 0.5 + 0.1;
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(0, 0, 15, mouthWedge, Math.PI * 2 - mouthWedge);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Zap className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
              CYBER PAC // 3D NEON LABYRINTH
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Power energizer ghost hunting & vector maze clearing for {currentUser?.name}
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
              <span className="font-bold text-base text-amber-300">{score.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] / ARROWS TO STEER PAC
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400">
                  {gameState === 'victory' ? 'GRID PURGED - VICTORY!' : (gameState === 'gameover' ? 'CAUGHT BY DRONES' : 'CYBER PAC')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Navigate the labyrinth with [WASD] or Arrow keys. Eat pink energizers to hunt vulnerable blue hunter drones!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-600 to-cyan-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>START MAZE RUN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
