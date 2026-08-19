import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Invader {
  x: number;
  y: number;
  alive: boolean;
  color: string;
  type: number;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  isPlayer: boolean;
}

export default function SpaceInvaders() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(64500);

  const playerX = useRef(370);
  const invadersRef = useRef<Invader[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const invaderDir = useRef(1);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  const initInvaders = () => {
    const inv: Invader[] = [];
    const colors = ['#ef4444', '#ec4899', '#38bdf8', '#a855f7'];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        inv.push({
          x: 120 + c * 60,
          y: 70 + r * 45,
          alive: true,
          color: colors[r],
          type: r,
        });
      }
    }
    invadersRef.current = inv;
    bulletsRef.current = [];
    invaderDir.current = 1;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = true;
      if (e.code === 'Space' && gameState === 'playing') {
        // Shoot player bullet
        bulletsRef.current.push({
          x: playerX.current,
          y: 430,
          vy: -8,
          isPlayer: true,
        });
        uiaudio.click();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.code] = false;
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
    setGameState('playing');
    setScore(0);
    playerX.current = 370;
    initInvaders();
  };

  // Space Invaders Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const loop = () => {
      tick++;

      // Player Movement
      if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) {
        playerX.current = Math.max(40, playerX.current - 5);
      }
      if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) {
        playerX.current = Math.min(canvas.width - 40, playerX.current + 5);
      }

      // Move Invaders Formation
      if (tick % 25 === 0) {
        let hitWall = false;
        invadersRef.current.forEach((inv) => {
          if (!inv.alive) return;
          if ((inv.x > canvas.width - 70 && invaderDir.current > 0) || (inv.x < 70 && invaderDir.current < 0)) {
            hitWall = true;
          }
        });

        if (hitWall) {
          invaderDir.current *= -1;
          invadersRef.current.forEach((inv) => {
            if (inv.alive) inv.y += 20;
          });
        } else {
          invadersRef.current.forEach((inv) => {
            if (inv.alive) inv.x += invaderDir.current * 14;
          });
        }
      }

      // Random Enemy Bullets
      if (tick % 40 === 0) {
        const liveInvaders = invadersRef.current.filter(i => i.alive);
        if (liveInvaders.length > 0) {
          const shooter = liveInvaders[Math.floor(Math.random() * liveInvaders.length)];
          bulletsRef.current.push({
            x: shooter.x,
            y: shooter.y + 15,
            vy: 4.5,
            isPlayer: false,
          });
        }
      }

      // Move Bullets & Check Collisions
      bulletsRef.current.forEach((b) => {
        b.y += b.vy;

        if (b.isPlayer) {
          // Check Invader Hits
          invadersRef.current.forEach((inv) => {
            if (inv.alive && Math.abs(b.x - inv.x) < 20 && Math.abs(b.y - inv.y) < 15) {
              inv.alive = false;
              b.y = -999;
              uiaudio.success();
              setScore(sc => {
                const next = sc + 200;
                setHighScore(h => Math.max(h, next));
                return next;
              });
            }
          });
        } else {
          // Check Player Hit
          if (Math.abs(b.x - playerX.current) < 22 && Math.abs(b.y - 440) < 15) {
            uiaudio.error();
            setGameState('gameover');
          }
        }
      });

      bulletsRef.current = bulletsRef.current.filter(b => b.y > 0 && b.y < canvas.height);

      // Check Victory Condition
      if (invadersRef.current.every(i => !i.alive)) {
        uiaudio.success();
        setGameState('victory');
        setHighScore(h => Math.max(h, score + 3000));
        return;
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Invaders
      invadersRef.current.forEach((inv) => {
        if (inv.alive) {
          ctx.fillStyle = inv.color;
          ctx.shadowColor = inv.color;
          ctx.shadowBlur = 12;
          ctx.fillRect(inv.x - 16, inv.y - 12, 32, 24);
          ctx.shadowBlur = 0;
        }
      });

      // Draw Bullets
      bulletsRef.current.forEach((b) => {
        ctx.fillStyle = b.isPlayer ? '#06b6d4' : '#ef4444';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.fillRect(b.x - 2, b.y - 6, 4, 12);
        ctx.shadowBlur = 0;
      });

      // Draw Player Cannon (Cyan Tank Base with Blaster)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.fillRect(playerX.current - 22, 435, 44, 16);
      ctx.fillRect(playerX.current - 4, 422, 8, 14);
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
            <Target className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              SPACE INVADERS // 3D ORBIT DEFENSE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Armada formation interception & dual-laser cannon fire for {currentUser?.name}
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
              [A/D] MOVE | [SPACE] FIRE LASER
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
                  {gameState === 'victory' ? 'ARMADA DESTROYED - VICTORY!' : (gameState === 'gameover' ? 'CANNON DESTROYED - GAME OVER' : 'SPACE INVADERS')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Intercept the descending alien fleet before they breach orbit perimeter!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>DEPLOY DEFENSE CANNON</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
