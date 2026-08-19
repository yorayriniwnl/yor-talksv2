import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Gem
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

// Grid tile types: 0: empty, 1: dirt, 2: boulder, 3: diamond, 4: wall, 5: exit
export default function BoulderDash() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [diamondsCollected, setDiamondsCollected] = useState(0);
  const [diamondsNeeded, setDiamondsNeeded] = useState(12);
  const [highScore, setHighScore] = useState(58900);

  const playerPos = useRef({ r: 2, c: 2 });
  const gridRef = useRef<number[][]>([]);
  const animFrameRef = useRef<number | null>(null);

  const initGrid = () => {
    const rows = 12;
    const cols = 18;
    const g: number[][] = [];

    for (let r = 0; r < rows; r++) {
      g[r] = [];
      for (let c = 0; c < cols; c++) {
        if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
          g[r][c] = 4; // Wall border
        } else if (r === 2 && c === 2) {
          g[r][c] = 0; // Player start
        } else if (r === rows - 2 && c === cols - 2) {
          g[r][c] = 5; // Exit portal
        } else {
          const rand = Math.random();
          if (rand < 0.15) g[r][c] = 2; // Boulder
          else if (rand < 0.30) g[r][c] = 3; // Diamond
          else g[r][c] = 1; // Dirt
        }
      }
    }
    gridRef.current = g;
    playerPos.current = { r: 2, c: 2 };
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const g = gridRef.current;
      const p = playerPos.current;
      let nr = p.r;
      let nc = p.c;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') nr--;
      if (e.code === 'KeyS' || e.code === 'ArrowDown') nr++;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') nc--;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') nc++;

      // Check wall collision
      if (g[nr][nc] === 4) return;

      // Check boulder pushing
      if (g[nr][nc] === 2) {
        const pushC = nc + (nc - p.c);
        if (g[nr][pushC] === 0) {
          g[nr][pushC] = 2;
          g[nr][nc] = 0;
          uiaudio.click();
        } else {
          return;
        }
      }

      // Collect diamond
      if (g[nr][nc] === 3) {
        uiaudio.success();
        setDiamondsCollected(d => {
          const next = d + 1;
          return next;
        });
      } else if (g[nr][nc] === 1) {
        uiaudio.click(); // Dig dirt
      }

      // Check exit
      if (g[nr][nc] === 5) {
        if (diamondsCollected >= diamondsNeeded) {
          uiaudio.success();
          setGameState('victory');
          setHighScore(h => Math.max(h, diamondsCollected * 1000 + 5000));
          return;
        }
      }

      g[nr][nc] = 0;
      playerPos.current = { r: nr, c: nc };
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, diamondsCollected, diamondsNeeded]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setDiamondsCollected(0);
    initGrid();
  };

  // Boulder Gravity Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const loop = () => {
      tick++;

      // Update falling boulders every 15 frames
      if (tick % 15 === 0) {
        const g = gridRef.current;
        const p = playerPos.current;

        for (let r = g.length - 2; r >= 1; r--) {
          for (let c = 1; c < g[0].length - 1; c++) {
            if (g[r][c] === 2 || g[r][c] === 3) {
              // Check empty below
              if (g[r + 1][c] === 0) {
                // Check if boulder crushed player
                if (r + 1 === p.r && c === p.c) {
                  uiaudio.error();
                  setGameState('gameover');
                } else {
                  g[r + 1][c] = g[r][c];
                  g[r][c] = 0;
                }
              }
            }
          }
        }
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Cave Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const g = gridRef.current;
      const tw = canvas.width / 18;
      const th = canvas.height / 12;

      for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 18; c++) {
          const type = g[r]?.[c] ?? 0;
          const x = c * tw;
          const y = r * th;

          if (type === 4) {
            // Steel Wall
            ctx.fillStyle = '#334155';
            ctx.fillRect(x + 1, y + 1, tw - 2, th - 2);
          } else if (type === 1) {
            // Cyber Dirt
            ctx.fillStyle = '#78350f';
            ctx.fillRect(x + 2, y + 2, tw - 4, th - 4);
          } else if (type === 2) {
            // Neon Boulder (Slate Grey Round)
            ctx.fillStyle = '#64748b';
            ctx.beginPath();
            ctx.arc(x + tw / 2, y + th / 2, tw / 2 - 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (type === 3) {
            // Cyber Diamond Gem (Cyan Glowing Diamond)
            ctx.fillStyle = '#06b6d4';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(x + tw / 2, y + 4);
            ctx.lineTo(x + tw - 4, y + th / 2);
            ctx.lineTo(x + tw / 2, y + th - 4);
            ctx.lineTo(x + 4, y + th / 2);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
          } else if (type === 5) {
            // Exit Portal (Emerald Gateway)
            ctx.fillStyle = '#22c55e';
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 12;
            ctx.fillRect(x + 4, y + 4, tw - 8, th - 8);
            ctx.shadowBlur = 0;
          }
        }
      }

      // Draw Cyber Miner Player (Neon Yellow Hexagon)
      const p = playerPos.current;
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(p.c * tw + tw / 2, p.r * th + th / 2, tw / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, diamondsCollected]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Gem className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              BOULDER DASH // 3D CYBER DIAMOND MINER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Gravity falling rocks, dirt burrowing & exit portal escape for {currentUser?.name}
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

      {/* Cave Stage */}
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
              <span className="text-zinc-400">DIAMONDS: </span>
              <span className="font-bold text-base text-cyan-300">{diamondsCollected} / {diamondsNeeded}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [WASD] / ARROWS TO DIG & PUSH BOULDERS
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
                  {gameState === 'victory' ? 'CAVE ESCAPED - VICTORY!' : (gameState === 'gameover' ? 'CRUSHED BY BOULDER' : 'BOULDER DASH')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Collect at least {diamondsNeeded} cyan diamonds while dodging falling boulders to unlock the green escape hatch!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ENTER THE MINE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
