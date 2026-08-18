import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, Play, RotateCcw, Trophy, Zap, 
  Flag, Gauge, Compass, Volume2, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CyberRally() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [lapTime, setLapTime] = useState(0);
  const [bestLap, setBestLap] = useState(24.8);
  const [currentSurface, setCurrentSurface] = useState<'ASPHALT' | 'GRAVEL' | 'MUD'>('ASPHALT');

  const carRef = useRef({ x: 350, y: 380, vx: 0, vy: 0, angle: -Math.PI / 2, speed: 0 });
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
    setLapTime(0);
    carRef.current = { x: 350, y: 380, vx: 0, vy: 0, angle: -Math.PI / 2, speed: 0 };
  };

  // Rally Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime = Date.now();

    const loop = () => {
      const c = carRef.current;
      const keys = keysPressed.current;

      setLapTime(+((Date.now() - startTime) / 1000).toFixed(2));

      // Acceleration & Steering
      const accel = 0.4;
      const friction = 0.95; // Asphalt

      if (keys['KeyW'] || keys['ArrowUp']) c.speed += accel;
      if (keys['KeyS'] || keys['ArrowDown']) c.speed -= accel * 0.5;

      c.speed *= friction;

      if (keys['KeyA'] || keys['ArrowLeft']) c.angle -= 0.05 * (c.speed > 0 ? 1 : -1);
      if (keys['KeyD'] || keys['ArrowRight']) c.angle += 0.05 * (c.speed > 0 ? 1 : -1);

      c.vx = Math.cos(c.angle) * c.speed;
      c.vy = Math.sin(c.angle) * c.speed;

      c.x += c.vx;
      c.y += c.vy;

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Ground
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Circuit Oval Track Asphalt
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 100;
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height / 2, 240, 140, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Track Neon Edge Curbs
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height / 2, 290, 190, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Start/Finish Line
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(340, 330, 20, 100);

      // Draw Rally Car Sprite
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);

      // Car Body
      ctx.fillStyle = '#f43f5e';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 15;
      ctx.fillRect(-18, -10, 36, 20);

      // Spoiler
      ctx.fillStyle = '#000000';
      ctx.fillRect(-22, -12, 6, 24);

      // Headlights
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(16, -8, 4, 4);
      ctx.fillRect(16, 4, 4, 4);

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-rose-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(244,63,94,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-500/30 border border-rose-400/40">
            <Car className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-amber-300 to-cyan-400">
              CYBER RALLY // NEON DIRT DRIFT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2D top-down rally physics & asphalt drift mechanics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Lap Record */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-zinc-400">BEST LAP:</span>
            <span className="text-amber-300 font-bold">{bestLap}S</span>
          </div>
        </div>
      </div>

      {/* Rally Track Stage */}
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
              <span className="text-zinc-400">CURRENT LAP: </span>
              <span className="font-bold text-base text-cyan-400">{lapTime}S</span>
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-amber-400 to-cyan-400">
                  CYBER RALLY
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Use [W/S] for throttle/brake, and [A/D] to counter-steer high angle drift slides!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START TIME TRIAL</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
