import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, AlertTriangle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DeathStarCore() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'tunnel' | 'core' | 'escape' | 'victory' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [distanceToCore, setDistanceToCore] = useState(800); // 800m tunnel run
  const [escapeDistance, setEscapeDistance] = useState(0);
  const [highScore, setHighScore] = useState(115000);

  const shipPos = useRef({ x: 370, y: 240 });
  const animFrameRef = useRef<number | null>(null);

  const fireCoreMissile = () => {
    if (gameState !== 'core') return;
    uiaudio.warp();
    uiaudio.success();
    setGameState('escape');
    setScore(s => s + 50000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'tunnel' && gameState !== 'core' && gameState !== 'escape') return;
      const s = shipPos.current;
      const step = 9;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') s.y = Math.max(100, s.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') s.y = Math.min(380, s.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') s.x = Math.max(120, s.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') s.x = Math.min(620, s.x + step);

      if (e.code === 'Space' && gameState === 'core') fireCoreMissile();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('tunnel');
    setScore(0);
    setDistanceToCore(800);
    setEscapeDistance(0);
    shipPos.current = { x: 370, y: 240 };
  };

  // Death Star II Super-Structure Tunnel Physics Loop
  useEffect(() => {
    if (gameState !== 'tunnel' && gameState !== 'core' && gameState !== 'escape') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const s = shipPos.current;

      if (gameState === 'tunnel') {
        setDistanceToCore(d => {
          if (d <= 50) {
            setGameState('core');
            uiaudio.warp();
            return 0;
          }
          return d - 3;
        });
      }

      if (gameState === 'escape') {
        setEscapeDistance(ed => {
          if (ed >= 800) {
            setGameState('victory');
            uiaudio.success();
            setHighScore(h => Math.max(h, score + 45000));
            return 800;
          }
          return ed + 6;
        });
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Infrastructure Vector Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tunnel Perspective Grid Ribs (Neon Cyan Vector Wireframe)
      const vpX = cx;
      const vpY = cy;

      // Draw Super-Structure Outer Tunnel Tubes
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;

      for (let r = 0; r < 5; r++) {
        const offset = ((frame * 6 + r * 100) % 500) / 500;
        const w = (canvas.width - 120) * offset;
        const h = (canvas.height - 120) * offset;

        ctx.strokeStyle = gameState === 'escape' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(6, 182, 212, 0.4)';
        ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      }

      // If at Core: Draw Floating Death Star II Power Generator Spherical Reactor
      if (gameState === 'core') {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(cx, cy, 35, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('MAIN POWER CORE', cx - 45, cy + 55);
      }

      // Draw Millennium Falcon Cockpit Vector / Crosshair Reticle
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
      ctx.moveTo(s.x - 35, s.y); ctx.lineTo(s.x + 35, s.y);
      ctx.moveTo(s.x, s.y - 35); ctx.lineTo(s.x, s.y + 35);
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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Target className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              DEATH STAR II // 3D VECTOR REACTOR CORE RUN
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Super-structure tunnel dogfight, core missile lock & fireball escape for {currentUser?.name}
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

        {(gameState === 'tunnel' || gameState === 'core' || gameState === 'escape') && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">PHASE: </span>
                <span className="font-bold text-base text-cyan-300">
                  {gameState === 'tunnel' ? `INBOUND TUNNEL (${distanceToCore}m)` : (gameState === 'core' ? 'TARGET LOCK: CORE' : `OUTBOUND ESCAPE (${escapeDistance}m)`)}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-amber-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              {gameState === 'core' ? '[SPACE] LAUNCH CONCUSSION MISSILE INTO CORE' : '[WASD] NAVIGATE VECTOR TUNNEL'}
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'tunnel' && gameState !== 'core' && gameState !== 'escape' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  {gameState === 'victory' ? 'SUPERNOVA ESCAPE SUCCESSFUL - DEATH STAR II DESTROYED!' : 'DEATH STAR II CORE RUN'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Fly through the internal superstructure, lock onto the main reactor core, and outrun the shockwave to freedom!
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
