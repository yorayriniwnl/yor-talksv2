import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, TowerControl
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface TurretTower {
  x: number;
  z: number;
  alive: boolean;
}

export default function SurfaceTurretAssault() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'strafing' | 'crashed' | 'victory'>('idle');
  const [score, setScore] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [shields, setShields] = useState(5);
  const [highScore, setHighScore] = useState(135000);

  const shipPos = useRef({ x: 370, y: 380 });
  const turretsRef = useRef<TurretTower[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const fireProtonLasers = () => {
    if (gameState !== 'strafing') return;
    uiaudio.warp();
    const s = shipPos.current;

    // Check hit on approaching turrets in crosshair lane
    turretsRef.current.forEach((t) => {
      if (t.alive && t.z < 450 && t.z > 60) {
        if (Math.abs(t.x - s.x) < 45) {
          t.alive = false;
          uiaudio.success();
          setScore(sc => sc + 2500);
        }
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'strafing') return;
      const s = shipPos.current;
      const step = 12;

      if (e.code === 'KeyA' || e.code === 'ArrowLeft') s.x = Math.max(120, s.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') s.x = Math.min(620, s.x + step);

      if (e.code === 'Space') fireProtonLasers();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('strafing');
    setScore(0);
    setDistanceKm(0);
    setShields(5);
    shipPos.current = { x: 370, y: 380 };
    turretsRef.current = [];
  };

  // Death Star Surface Strafing 3D Physics Loop
  useEffect(() => {
    if (gameState !== 'strafing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const s = shipPos.current;

      setDistanceKm(d => {
        const next = +(d + 0.05).toFixed(2);
        if (next >= 8.0) {
          setGameState('victory');
          uiaudio.success();
          setHighScore(h => Math.max(h, score + 60000));
        }
        return next;
      });
      setScore(sc => sc + 35);

      // Spawn Approaching Surface Laser Turret Towers (z = 600 down to 0)
      if (Math.random() < 0.15) {
        turretsRef.current.push({
          x: Math.random() * (canvas.width - 240) + 120,
          z: 600,
          alive: true,
        });
      }

      // Move Turrets towards Ship
      turretsRef.current.forEach((t) => {
        t.z -= 12;

        // Collision Check if turret crashes into ship
        if (t.alive && t.z < 60 && t.z > 20) {
          if (Math.abs(t.x - s.x) < 35) {
            t.alive = false;
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

      turretsRef.current = turretsRef.current.filter(t => t.z > 0);

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Surface Sky
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Monolithic Geometric Surface Grid (Cyan & Slate Wireframe Floor)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 220);
        ctx.lineTo(cx + (x - cx) * 3, canvas.height);
        ctx.stroke();
      }

      // Draw Approaching Turret Towers in 3D Perspective
      turretsRef.current.forEach((t) => {
        if (t.alive) {
          const scale = 1 - t.z / 600;
          const screenX = cx + (t.x - cx) * scale;
          const screenY = 220 + 200 * scale;
          const tw = 36 * scale;
          const th = 80 * scale;

          ctx.fillStyle = '#475569';
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 2;
          ctx.fillRect(screenX - tw / 2, screenY - th, tw, th);
          ctx.strokeRect(screenX - tw / 2, screenY - th, tw, th);

          // Turbolaser Barrels firing red energy
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(screenX, screenY - th, 6 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Player X-Wing Cockpit HUD & Laser Cannons
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fillRect(s.x - 20, s.y - 10, 40, 20);
      ctx.shadowBlur = 0;

      // S-Foil Wings
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x - 40, s.y); ctx.lineTo(s.x + 40, s.y);
      ctx.stroke();

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <TowerControl className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              DEATH STAR SURFACE // 3D TURRET TOWER ASSAULT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Low-altitude surface strafing run & turbolaser evasion for {currentUser?.name}
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

        {gameState === 'strafing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">DISTANCE: </span>
                <span className="font-bold text-base text-cyan-300">{distanceKm} / 8.0 km</span>
              </div>
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-amber-400">{shields} / 5</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [A / D / ARROWS] STRAFE, [SPACE] FIRE PROTON LASERS
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'strafing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  {gameState === 'victory' ? 'SURFACE RUN CLEARED - TRENCH REACHED!' : (gameState === 'crashed' ? 'X-WING DESTROYED BY TURRET COLLISION!' : 'DEATH STAR SURFACE ASSAULT')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Skim the surface plates, destroy Imperial laser towers, and breach the thermal exhaust trench!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START SURFACE ASSAULT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
