import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Disc
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface TumblingAsteroid {
  x: number;
  y: number;
  z: number;
  radius: number;
  rotation: number;
}

export default function FalconAsteroids() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'flying' | 'crashed' | 'hyperspace'>('idle');
  const [score, setScore] = useState(0);
  const [distanceAu, setDistanceAu] = useState(0);
  const [shields, setShields] = useState(6);
  const [highScore, setHighScore] = useState(148000);

  const falconPos = useRef({ x: 370, y: 360 });
  const asteroidsRef = useRef<TumblingAsteroid[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireQuadTurrets = () => {
    if (gameState !== 'flying') return;
    uiaudio.warp();
    const f = falconPos.current;

    // Blast closest asteroid in front of Falcon
    asteroidsRef.current.forEach((ast) => {
      if (ast.z < 450 && ast.z > 80) {
        if (Math.hypot(ast.x - f.x, ast.y - f.y) < ast.radius * 2) {
          ast.z = -100; // Destroy asteroid
          uiaudio.success();
          setScore(sc => sc + 3000);
        }
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'flying') return;
      const f = falconPos.current;
      const step = 14;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') f.y = Math.max(100, f.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') f.y = Math.min(420, f.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') f.x = Math.max(100, f.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') f.x = Math.min(640, f.x + step);

      if (e.code === 'Space') fireQuadTurrets();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('flying');
    setScore(0);
    setDistanceAu(0);
    setShields(6);
    falconPos.current = { x: 370, y: 360 };
    asteroidsRef.current = [];
  };

  // Millennium Falcon Asteroid Slalom 3D Physics Loop
  useEffect(() => {
    if (gameState !== 'flying') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const f = falconPos.current;

      setDistanceAu(d => {
        const next = +(d + 0.05).toFixed(2);
        if (next >= 12.0) {
          setGameState('hyperspace');
          uiaudio.success();
          setHighScore(h => Math.max(h, score + 75000));
        }
        return next;
      });
      setScore(sc => sc + 40);

      // Spawn Random Tumbling Jagged Asteroids (z = 600 down to 0)
      if (Math.random() < 0.16) {
        asteroidsRef.current.push({
          x: Math.random() * (canvas.width - 160) + 80,
          y: Math.random() * (canvas.height - 160) + 80,
          z: 600,
          radius: Math.random() * 25 + 20,
          rotation: Math.random() * Math.PI * 2,
        });
      }

      // Move Asteroids towards Falcon
      asteroidsRef.current.forEach((ast) => {
        ast.z -= 11;
        ast.rotation += 0.03;

        // Collision Check if asteroid strikes Falcon
        if (ast.z < 60 && ast.z > 15) {
          if (Math.hypot(ast.x - f.x, ast.y - f.y) < ast.radius + 20) {
            ast.z = -100;
            setShields(sh => {
              if (sh <= 1) {
                setGameState('crashed');
                uiaudio.error();
                return 0;
              }
              uiaudio.error();
              return sh - 1;
            });
          }
        }
      });

      asteroidsRef.current = asteroidsRef.current.filter(ast => ast.z > 0);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Star Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distant Vector Starfield
      ctx.fillStyle = '#ffffff';
      for (let s = 0; s < 45; s++) {
        const sx = ((s * 89 + frame * 0.4) % canvas.width);
        const sy = (s * 53) % canvas.height;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Draw Tumbling Jagged Asteroids in 3D Perspective
      asteroidsRef.current.forEach((ast) => {
        const scale = 1 - ast.z / 600;
        const screenX = cx + (ast.x - cx) * scale;
        const screenY = cy + (ast.y - cy) * scale;
        const r = ast.radius * scale * 1.8;

        ctx.strokeStyle = '#f59e0b';
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        for (let a = 0; a < 6; a++) {
          const angle = ast.rotation + (a * Math.PI) / 3;
          const dist = r * (0.8 + 0.3 * Math.sin(a * 2.5));
          const px = screenX + Math.cos(angle) * dist;
          const py = screenY + Math.sin(angle) * dist;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      // Draw Player YT-1300 Millennium Falcon (Saucer with offset cockpit)
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;

      // Main Saucer Hull
      ctx.beginPath();
      ctx.arc(f.x, f.y, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Front Mandibles
      ctx.fillStyle = '#64748b';
      ctx.fillRect(f.x - 18, f.y - 42, 10, 18);
      ctx.fillRect(f.x + 8, f.y - 42, 10, 18);

      // Starboard Cockpit Pod
      ctx.fillRect(f.x + 28, f.y - 12, 14, 20);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Disc className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-cyan-300 to-pink-400">
              MILLENNIUM FALCON // 3D ASTEROID SLALOM
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Hoth asteroid field evasion & quad turbolaser dogfight for {currentUser?.name}
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

        {gameState === 'flying' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">DISTANCE: </span>
                <span className="font-bold text-base text-cyan-300">{distanceAu} / 12.0 AU</span>
              </div>
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-amber-400">{shields} / 6</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-amber-400 font-bold">
              [WASD / ARROWS] PILOT FALCON, [SPACE] QUAD TURRETS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'flying' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-cyan-400 to-pink-400">
                  {gameState === 'hyperspace' ? 'ASTEROID FIELD CLEARED - HYPERSPACE JUMP!' : (gameState === 'crashed' ? 'FALCON OBLITERATED BY ASTEROID IMPACT!' : 'FALCON ASTEROID SLALOM')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Navigate the dense Hoth asteroid belt and destroy tumbling jagged rocks with quad lasers!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 via-cyan-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>COMMENCE ASTEROID RUN</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
