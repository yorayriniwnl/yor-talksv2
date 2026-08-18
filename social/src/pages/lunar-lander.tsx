import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function LunarLander() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'landed' | 'crashed'>('idle');
  const [fuelPct, setFuelPct] = useState(100);
  const [verticalSpeedMs, setVerticalSpeedMs] = useState(0);
  const [altitudeM, setAltitudeM] = useState(400);

  const landerRef = useRef({ x: 370, y: 80, vx: 1, vy: 0, angle: 0, fuel: 100 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setFuelPct(100);
    landerRef.current = { x: 370, y: 80, vx: (Math.random() - 0.5) * 2, vy: 0, angle: 0, fuel: 100 };
  };

  // Lunar Lander Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const groundY = 420;
    const padX1 = 320;
    const padX2 = 420;

    const loop = () => {
      const l = landerRef.current;
      const keys = keysPressed.current;

      // Lunar Gravity (1.62 m/s2)
      l.vy += 0.04;

      // RCS Rotation
      if (keys['KeyA'] || keys['ArrowLeft']) l.angle -= 0.04;
      if (keys['KeyD'] || keys['ArrowRight']) l.angle += 0.04;

      // Main Descent Engine Thrust
      if ((keys['KeyW'] || keys['ArrowUp'] || keys['Space']) && l.fuel > 0) {
        l.vx += Math.sin(l.angle) * 0.1;
        l.vy -= Math.cos(l.angle) * 0.1;
        l.fuel -= 0.25;
        setFuelPct(Math.max(0, Math.round(l.fuel)));
      }

      l.x += l.vx;
      l.y += l.vy;

      setVerticalSpeedMs(+(l.vy * 10).toFixed(1));
      setAltitudeM(Math.max(0, Math.round(groundY - l.y)));

      // Touchdown Detection
      if (l.y >= groundY - 15) {
        l.y = groundY - 15;
        // Check landing criteria: on pad, speed < 2.0 m/s, angle < 15 deg
        const onPad = l.x >= padX1 && l.x <= padX2;
        const safeSpeed = l.vy < 0.25 && Math.abs(l.vx) < 0.2;
        const safeAngle = Math.abs(l.angle) < 0.25;

        if (onPad && safeSpeed && safeAngle) {
          uiaudio.success();
          setGameState('landed');
        } else {
          uiaudio.error();
          setGameState('crashed');
        }
        return;
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Lunar Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Moon Surface Craggy Silhouette
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(padX1, groundY);
      // Flat Landing Pad
      ctx.lineTo(padX2, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.lineTo(0, canvas.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Neon Landing Pad Target (Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(padX1, groundY);
      ctx.lineTo(padX2, groundY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Lunar Module
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.angle);

      // Descent Engine Exhaust Flame
      if ((keys['KeyW'] || keys['ArrowUp'] || keys['Space']) && l.fuel > 0) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(-6, 12);
        ctx.lineTo(0, 28 + Math.random() * 8);
        ctx.lineTo(6, 12);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Lander Cabin
      ctx.fillStyle = '#eab308'; // Gold thermal foil
      ctx.fillRect(-12, -12, 24, 24);

      // Landing Legs
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 10); ctx.lineTo(-18, 18);
      ctx.moveTo(10, 10); ctx.lineTo(18, 18);
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              LUNAR LANDER // APOLLO VECTOR DESCENT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              1/6th gravity descent physics & target pad touchdown for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Telemetry Dials */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-white/10">
            <span className="text-zinc-400">FUEL: </span>
            <span className={cn("font-bold", fuelPct < 25 ? "text-rose-400" : "text-cyan-400")}>{fuelPct}%</span>
          </div>
        </div>
      </div>

      {/* Lander Canvas Stage */}
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
              <span className="text-zinc-400">V_SPEED: </span>
              <span className={cn("font-bold", Math.abs(verticalSpeedMs) > 2.0 ? "text-rose-400" : "text-emerald-400")}>
                {verticalSpeedMs} M/S
              </span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-cyan-400 font-bold">
              [W/SPACE] THRUST | [A/D] ROTATE
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
                  {gameState === 'landed' ? 'TOUCHDOWN CONFIRMED!' : (gameState === 'crashed' ? 'IMPACT CRASH DETECTED' : 'LUNAR LANDER')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Use [W/Space] to throttle main descent engine and [A/D] to balance attitude! Land gently on the cyan target pad (&lt;2.0 m/s).
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>{gameState === 'idle' ? 'START DESCENT' : 'RETRY LANDING'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
