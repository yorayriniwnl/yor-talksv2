import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Play, RotateCcw, Trophy, Zap, 
  Award, Volume2, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function HoverboardSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(64500);
  const [currentTrick, setCurrentTrick] = useState<string>('AIR GLIDE');
  const [comboMultiplier, setComboMultiplier] = useState(1.0);

  const boardRef = useRef({ x: 370, y: 340, vx: 0, vy: 0, angle: 0, inAir: false });
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
    setScore(0);
    setComboMultiplier(1.0);
    boardRef.current = { x: 370, y: 340, vx: 0, vy: 0, angle: 0, inAir: false };
  };

  const doTrick = (trickName: string, points: number) => {
    uiaudio.success();
    setCurrentTrick(trickName);
    setScore(s => s + Math.round(points * comboMultiplier));
    setComboMultiplier(m => +(m + 0.2).toFixed(1));
  };

  // Halfpipe Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const loop = () => {
      time += 0.05;
      const b = boardRef.current;
      const keys = keysPressed.current;

      // Halfpipe U-Curve gravity physics: y = 380 - ((x - cx)^2 / 300)
      const cx = canvas.width / 2;

      if (keys['KeyA'] || keys['ArrowLeft']) b.vx -= 0.35;
      if (keys['KeyD'] || keys['ArrowRight']) b.vx += 0.35;

      b.vx *= 0.98;
      b.x += b.vx;

      // Keep within halfpipe boundaries
      b.x = Math.max(100, Math.min(canvas.width - 100, b.x));

      // Calculate halfpipe surface height
      const curveH = Math.pow((b.x - cx) / 16, 2);
      b.y = Math.min(420, 360 - curveH);

      // Angle aligns with slope tangent
      b.angle = ((b.x - cx) / 200) * 0.8;

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Cyberpunk Skatepark Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Neon Halfpipe Ramp Surface
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      for (let x = 60; x <= canvas.width - 60; x += 10) {
        const y = 360 - Math.pow((x - cx) / 16, 2);
        if (x === 60) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Maglev Hoverboard
      ctx.save();
      ctx.translate(b.x, b.y - 15);
      ctx.rotate(b.angle);

      // Hoverboard Deck
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.roundRect(-28, -6, 56, 12, 4);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Anti-Gravity Thruster Glow Under Deck
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fillRect(-20, 6, 12, 4);
      ctx.fillRect(8, 6, 12, 4);
      ctx.shadowBlur = 0;

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, comboMultiplier]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Zap className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
              HOVERBOARD 3D // NEON HALFPIPE FREESTYLE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Anti-gravity magnetic thruster physics & trick combo chaining for {currentUser?.name}
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

      {/* Halfpipe Stage */}
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
              <span className="font-bold text-base text-cyan-400">{score.toLocaleString()}</span>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-pink-400 font-bold">
              COMBO: {comboMultiplier}x ({currentTrick})
            </div>
          </div>
        )}

        {/* Trick Controls Bar */}
        {gameState === 'playing' && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center space-x-3 font-mono text-xs">
            <button
              onClick={() => doTrick('360 LASER SPIN', 500)}
              className="px-4 py-2.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/40 hover:bg-pink-500 hover:text-black font-bold transition-all shadow-md"
            >
              360 LASER SPIN (+500)
            </button>
            <button
              onClick={() => doTrick('720 INVERT KICKFLIP', 1200)}
              className="px-4 py-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500 hover:text-white font-bold transition-all shadow-md"
            >
              720 INVERT KICKFLIP (+1200)
            </button>
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
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
                  NEON HOVERBOARD
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Use [A] / [D] to pump momentum up the halfpipe lips and trigger trick combos!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>DROP INTO HALFPIPE</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
