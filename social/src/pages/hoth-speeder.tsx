import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Cable
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HothSpeeder() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'approach' | 'cable_orbit' | 'takedown' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [orbitsCompleted, setOrbitsCompleted] = useState(0); // 3 orbits needed to trip walker
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [highScore, setHighScore] = useState(94000);

  const speederPos = useRef({ x: 370, y: 360 });
  const animFrameRef = useRef<number | null>(null);

  const launchTowCable = () => {
    if (gameState !== 'approach') return;
    uiaudio.warp();
    setGameState('cable_orbit');
    setOrbitsCompleted(0);
    setOrbitAngle(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'approach' && gameState !== 'cable_orbit') return;
      const s = speederPos.current;
      const step = 8;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') s.y = Math.max(120, s.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') s.y = Math.min(420, s.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') s.x = Math.max(100, s.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') s.x = Math.min(640, s.x + step);

      if (e.code === 'Space' && gameState === 'approach') launchTowCable();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('approach');
    setScore(0);
    setOrbitsCompleted(0);
    speederPos.current = { x: 370, y: 360 };
  };

  // Battle of Hoth Tow Cable Orbit Physics Loop
  useEffect(() => {
    if (gameState !== 'approach' && gameState !== 'cable_orbit') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      if (gameState === 'cable_orbit') {
        setOrbitAngle(oa => {
          const next = oa + 0.05;
          if (next >= Math.PI * 2) {
            setOrbitsCompleted(oc => {
              const updated = oc + 1;
              if (updated >= 3) {
                setGameState('takedown');
                uiaudio.success();
                setHighScore(h => Math.max(h, score + 50000));
              }
              return updated;
            });
            return 0;
          }
          return next;
        });
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Frozen Hoth Vector Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground Ice Horizon (White / Cyan Perspective Lines)
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.3)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 260);
        ctx.lineTo(cx + (x - cx) * 3, canvas.height);
        ctx.stroke();
      }

      // Draw Giant AT-AT Imperial Walker Vector Body (Center 370, 180)
      ctx.strokeStyle = gameState === 'takedown' ? '#ef4444' : '#e2e8f0';
      ctx.lineWidth = 3;
      // Head
      ctx.strokeRect(cx - 100, 130, 45, 30);
      // Neck
      ctx.beginPath(); ctx.moveTo(cx - 55, 145); ctx.lineTo(cx - 30, 145); ctx.stroke();
      // Body
      ctx.strokeRect(cx - 30, 110, 120, 60);
      // Legs (Four Vector Legs down to 260)
      ctx.beginPath();
      ctx.moveTo(cx - 20, 170); ctx.lineTo(cx - 30, 260);
      ctx.moveTo(cx + 10, 170); ctx.lineTo(cx, 260);
      ctx.moveTo(cx + 50, 170); ctx.lineTo(cx + 40, 260);
      ctx.moveTo(cx + 80, 170); ctx.lineTo(cx + 70, 260);
      ctx.stroke();

      // If Harpooned: Draw Glowing Cable Wrapping Legs
      if (gameState === 'cable_orbit') {
        const sx = cx + Math.cos(orbitAngle) * 90;
        const sy = 240 + Math.sin(orbitAngle) * 35;

        // Harpoon Cable Line
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx + 20, 230);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        // Speeder in Orbit
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Free-flying Speeder Reticle
        const s = speederPos.current;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x - 14, s.y - 10, 28, 20);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, orbitAngle, score]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Cable className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              BATTLE OF HOTH // 3D VECTOR SNOWSPEEDER HARPOON
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              AT-AT walker leg entanglement, tow cable orbital trajectory for {currentUser?.name}
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

        {(gameState === 'approach' || gameState === 'cable_orbit') && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">PHASE: </span>
                <span className="font-bold text-base text-cyan-300">
                  {gameState === 'approach' ? 'INBOUND RUN (HARPOON READY)' : `TOW CABLE ORBITS: ${orbitsCompleted} / 3`}
                </span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              {gameState === 'approach' ? '[SPACE] HARPOON AT-AT WALKER LEGS' : 'ORBITING AT-AT LEGS...'}
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'approach' && gameState !== 'cable_orbit' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400">
                  {gameState === 'takedown' ? 'AT-AT LEGS BOUND - WALKER CRASHED!' : 'BATTLE OF HOTH 3D'}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Fly low across the snow, fire the magnetic tow cable, and circle the Imperial Walker three times to bring it down!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>LAUNCH T-47 SPEEDER</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
