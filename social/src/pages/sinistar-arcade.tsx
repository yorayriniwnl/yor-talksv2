import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Gem
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Asteroid {
  x: number;
  y: number;
  r: number;
  sinisite: number;
}

interface Sinibomb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export default function SinistarArcade() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [sinibombs, setSinibombs] = useState(5);
  const [highScore, setHighScore] = useState(91500);

  const playerPos = useRef({ x: 370, y: 380, vx: 0, vy: 0, angle: -Math.PI / 2 });
  const sinistarPos = useRef({ x: 370, y: 120, hp: 10, built: true });
  const asteroidsRef = useRef<Asteroid[]>([]);
  const bombsRef = useRef<Sinibomb[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireSinibomb = () => {
    if (gameState !== 'playing' || sinibombs <= 0) return;
    const p = playerPos.current;
    const s = sinistarPos.current;

    // Homing Sinibomb directed toward Sinistar boss
    const angle = Math.atan2(s.y - p.y, s.x - p.x);
    bombsRef.current.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * 8.5,
      vy: Math.sin(angle) * 8.5,
      life: 60,
    });
    setSinibombs(b => b - 1);
    uiaudio.click();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      const p = playerPos.current;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') p.angle -= 0.12;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') p.angle += 0.12;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        p.vx += Math.cos(p.angle) * 0.5;
        p.vy += Math.sin(p.angle) * 0.5;
      }
      if (e.code === 'Space') fireSinibomb();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, sinibombs]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setScore(0);
    setSinibombs(5);
    playerPos.current = { x: 370, y: 380, vx: 0, vy: 0, angle: -Math.PI / 2 };
    sinistarPos.current = { x: 370, y: 120, hp: 10, built: true };
    bombsRef.current = [];
    asteroidsRef.current = [
      { x: 160, y: 180, r: 24, sinisite: 3 },
      { x: 580, y: 180, r: 24, sinisite: 3 },
      { x: 220, y: 320, r: 20, sinisite: 2 },
      { x: 520, y: 320, r: 20, sinisite: 2 },
    ];
  };

  // Sinistar Cyberpunk Boss Battle Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const p = playerPos.current;
      const s = sinistarPos.current;

      // Update Player Inertia
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;

      if (p.x < 30) p.x = 30;
      if (p.x > canvas.width - 30) p.x = canvas.width - 30;
      if (p.y < 30) p.y = 30;
      if (p.y > canvas.height - 30) p.y = canvas.height - 30;

      // Sinistar Homing Chase ("I HUNGER!")
      const sAngle = Math.atan2(p.y - s.y, p.x - s.x);
      s.x += Math.cos(sAngle) * 1.6;
      s.y += Math.sin(sAngle) * 1.6;

      // Check Sinistar Devour Player
      if (Math.hypot(p.x - s.x, p.y - s.y) < 45) {
        uiaudio.error();
        setGameState('gameover');
        setHighScore(h => Math.max(h, score));
      }

      // Update Sinibombs
      bombsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 1;

        // Check Hit Sinistar Core
        if (Math.hypot(b.x - s.x, b.y - s.y) < 40) {
          b.life = 0;
          s.hp--;
          uiaudio.success();
          setScore(sc => sc + 500);

          if (s.hp <= 0) {
            uiaudio.success();
            setGameState('victory');
            setHighScore(h => Math.max(h, score + 15000));
          }
        }
      });

      bombsRef.current = bombsRef.current.filter(b => b.life > 0);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Drifting Asteroids (Grey/Cyan Polygons with Sinisite Crystals)
      asteroidsRef.current.forEach((ast) => {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.r, 0, Math.PI * 2);
        ctx.stroke();

        // Sinisite Crystal Glow
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Sinistar Dreadnought Face (Roaring Demonic Skull in Red/Silver)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sinistar Eyes & Gritting Teeth
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x - 18, s.y - 12, 10, 8);
      ctx.fillRect(s.x + 8, s.y - 12, 10, 8);
      ctx.fillRect(s.x - 15, s.y + 12, 30, 10);

      // Draw Starfighter Player (Neon Cyan)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);

      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -8);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();

      // Draw Sinibombs (Glowing Cyan Torpedoes)
      bombsRef.current.forEach((b) => {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, sinibombs]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Target className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
              SINISTAR // 3D CYBERPUNK BEHEMOTH DREADNOUGHT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sinisite crystal mining & Sinibomb dreadnought destruction ("BEWARE, I LIVE!") for {currentUser?.name}
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
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-3">
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-base text-red-400">{score.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-zinc-400">SINIBOMBS: </span>
                <span className="font-bold text-cyan-400">{sinibombs}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [W] THRUST, [A/D] STEER, [SPACE] LAUNCH SINIBOMB
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-400 to-cyan-400">
                  {gameState === 'victory' ? 'SINISTAR DESTROYED - VICTORY!' : (gameState === 'gameover' ? 'DEVOUR BY SINISTAR ("I HUNGER!")' : 'SINISTAR 3D')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Evade the pursuing demonic dreadnought and launch 10 Sinibombs into its core before it consumes your starfighter!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-500 via-amber-600 to-cyan-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>ENGAGE SINISTAR</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
