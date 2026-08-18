import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Car, Play, RotateCcw, Trophy, Zap, 
  MapPin, DollarSign, Sparkles, Award, Clock
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CityCourier() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [earnings, setEarnings] = useState(0);
  const [highScore, setHighScore] = useState(4800);
  const [timeLeft, setTimeLeft] = useState(45);

  const carPosRef = useRef({ x: 300, y: 240, vx: 0, vy: 0, angle: 0 });
  const targetPosRef = useRef({ x: 500, y: 350 });
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
    setEarnings(0);
    setTimeLeft(45);
    carPosRef.current = { x: 300, y: 240, vx: 0, vy: 0, angle: 0 };
    targetPosRef.current = { x: 500, y: 350 };
  };

  // Timer countdown
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = window.setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setGameState('gameover');
          setHighScore(h => Math.max(h, earnings));
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, earnings]);

  // Isometric City Engine Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const c = carPosRef.current;
      const t = targetPosRef.current;
      const keys = keysPressed.current;

      // Driving Physics
      if (keys['KeyW'] || keys['ArrowUp']) {
        c.vx += Math.cos(c.angle) * 0.35;
        c.vy += Math.sin(c.angle) * 0.35;
      }
      if (keys['KeyS'] || keys['ArrowDown']) {
        c.vx -= Math.cos(c.angle) * 0.2;
        c.vy -= Math.sin(c.angle) * 0.2;
      }
      if (keys['KeyA'] || keys['ArrowLeft']) c.angle -= 0.06;
      if (keys['KeyD'] || keys['ArrowRight']) c.angle += 0.06;

      c.vx *= 0.94;
      c.vy *= 0.94;

      c.x += c.vx;
      c.y += c.vy;

      // Boundary clamp
      if (c.x < 40) c.x = 40;
      if (c.x > canvas.width - 40) c.x = canvas.width - 40;
      if (c.y < 40) c.y = 40;
      if (c.y > canvas.height - 40) c.y = canvas.height - 40;

      // Check Customer Drop-off Target
      const distToTarget = Math.hypot(c.x - t.x, c.y - t.y);
      if (distToTarget < 35) {
        uiaudio.success();
        setEarnings(e => e + 250);
        setTimeLeft(tl => tl + 5);
        // Spawn next target
        targetPosRef.current = {
          x: Math.random() * (canvas.width - 160) + 80,
          y: Math.random() * (canvas.height - 160) + 80,
        };
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Cyberpunk City Ground
      ctx.fillStyle = '#05070e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Isometric City Grid Road Network
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 40;
      // Horizontal Avenues
      ctx.beginPath();
      ctx.moveTo(0, 160); ctx.lineTo(canvas.width, 160);
      ctx.moveTo(0, 340); ctx.lineTo(canvas.width, 340);
      // Vertical Boulevards
      ctx.moveTo(220, 0); ctx.lineTo(220, canvas.height);
      ctx.moveTo(520, 0); ctx.lineTo(520, canvas.height);
      ctx.stroke();

      // Road Neon Lane Markings
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, 160); ctx.lineTo(canvas.width, 160);
      ctx.moveTo(0, 340); ctx.lineTo(canvas.width, 340);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Customer Delivery Waypoint
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Player Cyber Taxi
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);

      // Taxi Body
      ctx.fillStyle = '#eab308';
      ctx.shadowColor = '#eab308';
      ctx.shadowBlur = 12;
      ctx.fillRect(-18, -10, 36, 20);

      // Windshield
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-2, -8, 8, 16);

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
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-yellow-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(234,179,8,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-yellow-600 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30 border border-yellow-400/40">
            <Car className="w-8 h-8 text-black animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-300 to-cyan-400">
              CITY COURIER // TOKYO NEON TAXI
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              High-speed customer drop-off courier arcade engine for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* HUD */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-400">EARNINGS:</span>
            <span className="text-emerald-400 font-black">${earnings}</span>
          </div>
        </div>
      </div>

      {/* Canvas Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        {gameState === 'playing' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-pink-400" />
              <span className="text-zinc-400">TIME:</span>
              <span className={cn("font-bold text-sm", timeLeft < 10 ? "text-red-400 animate-pulse" : "text-white")}>
                {timeLeft}S
              </span>
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-amber-400 to-cyan-400">
                  CITY COURIER
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Drive your cyber-taxi to flashing drop-off waypoints before time runs out!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-500 to-cyan-500 font-black tracking-wider text-black shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-black" />
                <span>START COURIER SHIFT</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
