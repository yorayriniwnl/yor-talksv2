import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Play, RotateCcw, Zap, 
  Sparkles, Award, Volume2, ShieldCheck, Flame, Compass, Target, Crosshair, Navigation, Skull
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function VaderTrenchDuel() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'pursuit' | 'shot_down' | 'vader_deflected'>('idle');
  const [score, setScore] = useState(0);
  const [shields, setShields] = useState(5);
  const [vaderHealth, setVaderHealth] = useState(100);
  const [highScore, setHighScore] = useState(195000);

  const crosshairPos = useRef({ x: 370, y: 240 });
  const vaderPos = useRef({ x: 370, y: 220, z: 250 });
  const animFrameRef = useRef<number | null>(null);

  const fireRearQuadLaser = () => {
    if (gameState !== 'pursuit') return;
    uiaudio.warp();
    const c = crosshairPos.current;
    const v = vaderPos.current;

    // Check hit on Vader's TIE Advanced x1
    if (Math.hypot(c.x - v.x, c.y - v.y) < 45) {
      uiaudio.success();
      setVaderHealth((vh) => {
        const next = Math.max(0, vh - 20);
        if (next === 0) {
          setGameState('vader_deflected');
          uiaudio.success();
          setHighScore(h => Math.max(h, score + 150000));
        }
        return next;
      });
      setScore(sc => sc + 18000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'pursuit') return;
      const c = crosshairPos.current;
      const step = 14;

      if (e.code === 'KeyW' || e.code === 'ArrowUp') c.y = Math.max(100, c.y - step);
      if (e.code === 'KeyS' || e.code === 'ArrowDown') c.y = Math.min(380, c.y + step);
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') c.x = Math.max(150, c.x - step);
      if (e.code === 'KeyD' || e.code === 'ArrowRight') c.x = Math.min(590, c.x + step);

      if (e.code === 'Space') fireRearQuadLaser();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const startGame = () => {
    uiaudio.warp();
    setGameState('pursuit');
    setScore(0);
    setShields(5);
    setVaderHealth(100);
    crosshairPos.current = { x: 370, y: 240 };
    vaderPos.current = { x: 370, y: 220, z: 250 };
  };

  // Darth Vader TIE Advanced x1 Trench Pursuit Duel Loop
  useEffect(() => {
    if (gameState !== 'pursuit') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;

    const loop = () => {
      frame++;
      setScore(sc => sc + 35);
      const v = vaderPos.current;
      const c = crosshairPos.current;

      // Vader AI Evasive Weave inside Trench
      v.x = 370 + Math.sin(frame * 0.06) * 110;
      v.y = 220 + Math.cos(frame * 0.08) * 45;

      // Vader Green Laser Cannon Flak Burst
      if (frame % 70 === 0) {
        setShields(sh => {
          if (sh <= 1) {
            setGameState('shot_down');
            uiaudio.error();
            return 0;
          }
          uiaudio.error();
          return sh - 1;
        });
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Space Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Death Star Trench Perspective Walls (Gray Wireframes)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;

      // Left Trench Wall
      ctx.beginPath();
      ctx.moveTo(100, 0); ctx.lineTo(100, canvas.height);
      ctx.moveTo(100, cy); ctx.lineTo(0, canvas.height);
      ctx.stroke();

      // Right Trench Wall
      ctx.beginPath();
      ctx.moveTo(canvas.width - 100, 0); ctx.lineTo(canvas.width - 100, canvas.height);
      ctx.moveTo(canvas.width - 100, cy); ctx.lineTo(canvas.width, canvas.height);
      ctx.stroke();

      // Trench Floor Grid Ribs
      for (let r = 0; r < 5; r++) {
        const ry = cy + 40 + r * 45;
        ctx.beginPath();
        ctx.moveTo(100, ry); ctx.lineTo(canvas.width - 100, ry);
        ctx.stroke();
      }

      // Draw Darth Vader's TIE Advanced x1 (Bent Solar Panels)
      ctx.fillStyle = '#ef4444';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 18;

      // Central Spherical Cockpit
      ctx.beginPath();
      ctx.arc(v.x, v.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Left Curved Bent Solar Wing
      ctx.beginPath();
      ctx.moveTo(v.x - 30, v.y - 25);
      ctx.lineTo(v.x - 50, v.y - 15);
      ctx.lineTo(v.x - 50, v.y + 15);
      ctx.lineTo(v.x - 30, v.y + 25);
      ctx.stroke();

      // Right Curved Bent Solar Wing
      ctx.beginPath();
      ctx.moveTo(v.x + 30, v.y - 25);
      ctx.lineTo(v.x + 50, v.y - 15);
      ctx.lineTo(v.x + 50, v.y + 15);
      ctx.lineTo(v.x + 30, v.y + 25);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Rear Defense Targeting Reticle (Cyan Crosshair)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 22, 0, Math.PI * 2);
      ctx.moveTo(c.x - 30, c.y); ctx.lineTo(c.x + 30, c.y);
      ctx.moveTo(c.x, c.y - 30); ctx.lineTo(c.x, c.y + 30);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, shields, vaderHealth]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-red-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(239,68,68,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-zinc-900 flex items-center justify-center shadow-lg shadow-red-500/30 border border-red-400/40">
            <Skull className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-300 to-cyan-400">
              VADER TRENCH DUEL // TIE ADVANCED X1 PURSUIT
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rear quad laser defense against the Dark Lord for {currentUser?.name}
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

        {gameState === 'pursuit' && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 flex items-center space-x-4">
              <div>
                <span className="text-zinc-400">VADER HP: </span>
                <span className="font-bold text-red-400">{vaderHealth}%</span>
              </div>
              <div>
                <span className="text-zinc-400">SHIELDS: </span>
                <span className="font-bold text-cyan-300">{shields} / 5</span>
              </div>
              <div>
                <span className="text-zinc-400">SCORE: </span>
                <span className="font-bold text-pink-400">{score.toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-red-400 font-bold">
              [WASD / ARROWS] AIM RETICLE, [SPACE] FIRE REAR DEFENSE
            </div>
          </div>
        )}

        <AnimatePresence>
          {gameState !== 'pursuit' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-red-400 via-amber-400 to-cyan-400">
                  {gameState === 'vader_deflected' ? 'VADER\'S TIE ADVANCED SPUN OUT INTO SPACE!' : (gameState === 'shot_down' ? 'THE FORCE IS TOO STRONG WITH HIM!' : 'DARTH VADER TRENCH PURSUIT')}
                </h2>
                <p className="text-sm text-zinc-400 max-w-md font-mono">
                  Darth Vader is in the trench behind you in his custom TIE Advanced x1! Lock your rear defense cannons and deflect him!
                </p>
              </div>

              <button
                onClick={startGame}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-red-600 via-amber-600 to-cyan-500 font-black tracking-wider text-white shadow-xl hover:brightness-110 flex items-center space-x-3 transition-all"
              >
                <Play className="w-5 h-5 fill-white" />
                <span>ENGAGE VADER IN TRENCH</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
