import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CyberPong() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover' | 'victory'>('idle');
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  const ballRef = useRef({ x: 370, y: 240, vx: 5, vy: 3, r: 8 });
  const playerY = useRef(200);
  const aiY = useRef(200);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const my = e.clientY - rect.top;
      playerY.current = Math.max(40, Math.min(canvas.height - 120, my - 40));
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const startGame = () => {
    uiaudio.warp();
    setGameState('playing');
    setPlayerScore(0);
    setAiScore(0);
    ballRef.current = { x: 370, y: 240, vx: 6, vy: 3, r: 8 };
  };

  // Cyber Pong Physics Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const b = ballRef.current;

      b.x += b.vx;
      b.y += b.vy;

      // Top and Bottom Wall Bounce
      if (b.y - b.r < 0 || b.y + b.r > canvas.height) {
        b.vy = -b.vy;
        uiaudio.click();
      }

      // AI Paddle Movement Tracking
      const aiCenter = aiY.current + 40;
      if (aiCenter < b.y - 10) aiY.current += 3.8;
      else if (aiCenter > b.y + 10) aiY.current -= 3.8;
      aiY.current = Math.max(0, Math.min(canvas.height - 80, aiY.current));

      // Player Paddle Collision (Left x = 40)
      if (b.x - b.r < 55 && b.x + b.r > 35 && b.y > playerY.current && b.y < playerY.current + 80) {
        b.vx = Math.abs(b.vx) * 1.05; // Speed increase
        const hitOffset = (b.y - (playerY.current + 40)) / 40;
        b.vy = hitOffset * 6;
        uiaudio.click();
      }

      // AI Paddle Collision (Right x = canvas.width - 55)
      if (b.x + b.r > canvas.width - 55 && b.x - b.r < canvas.width - 35 && b.y > aiY.current && b.y < aiY.current + 80) {
        b.vx = -Math.abs(b.vx) * 1.05;
        const hitOffset = (b.y - (aiY.current + 40)) / 40;
        b.vy = hitOffset * 6;
        uiaudio.click();
      }

      // Goal Scored
      if (b.x < 0) {
        // AI Point
        uiaudio.error();
        setAiScore(s => {
          const next = s + 1;
          if (next >= 7) setGameState('gameover');
          return next;
        });
        b.x = 370; b.y = 240; b.vx = 6; b.vy = (Math.random() - 0.5) * 6;
      } else if (b.x > canvas.width) {
        // Player Point
        uiaudio.success();
        setPlayerScore(s => {
          const next = s + 1;
          if (next >= 7) setGameState('victory');
          return next;
        });
        b.x = 370; b.y = 240; b.vx = -6; b.vy = (Math.random() - 0.5) * 6;
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Neon Arena
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center Divider Line (Dashed Cyan)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);

      // Player Paddle (Cyan Glowing Rounded Rect)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 15;
      ctx.fillRect(40, playerY.current, 14, 80);

      // AI Paddle (Pink Glowing Rounded Rect)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 15;
      ctx.fillRect(canvas.width - 54, aiY.current, 14, 80);

      // Ball (White Glowing Plasma Sphere)
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, playerScore, aiScore]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Zap className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              CYBER PONG // 3D HYPERFIELD TABLE TENNIS
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              High-velocity paddle collision & spin vector physics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Match Score */}
        <div className="flex items-center space-x-4 font-mono text-sm font-bold">
          <span className="text-cyan-400">YOU: {playerScore}</span>
          <span className="text-zinc-600">|</span>
          <span className="text-pink-400">AI: {aiScore}</span>
        </div>
      </div>

      {/* Arena Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black cursor-none">
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

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
                  {gameState === 'victory' ? 'VICTORY - MATCH WON!' : (gameState === 'gameover' ? 'DEFEAT - AI DOMINATED' : 'CYBER PONG')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Move your mouse up/down to steer your cyan paddle. First to 7 points takes the tournament crown!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-pink-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>START CYBER MATCH</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
