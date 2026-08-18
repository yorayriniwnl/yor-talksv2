import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Crosshair, Play, RotateCcw, Trophy, Zap, 
  Sparkles, Award, Flame, Volume2, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function TankArena() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [angleDeg, setAngleDeg] = useState(45);
  const [power, setPower] = useState(65);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [windMs, setWindMs] = useState(2.4);
  const [isShellInFlight, setIsShellInFlight] = useState(false);

  const shellRef = useRef<Shell | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const fireShell = () => {
    if (isShellInFlight || enemyHp <= 0) return;
    uiaudio.warp();
    setIsShellInFlight(true);

    const rad = (angleDeg * Math.PI) / 180;
    const pVelocity = (power / 100) * 18;

    shellRef.current = {
      x: 120,
      y: 380,
      vx: Math.cos(rad) * pVelocity,
      vy: -Math.sin(rad) * pVelocity,
    };
  };

  // Artillery Ballistic Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Neon Arena Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Destructible Ground Floor
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 400, canvas.width, canvas.height - 400);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 400); ctx.lineTo(canvas.width, 400);
      ctx.stroke();

      // Draw Player Tank (Left)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fillRect(100, 380, 40, 20);

      // Player Turret Barrel
      const rad = (angleDeg * Math.PI) / 180;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(120, 380);
      ctx.lineTo(120 + Math.cos(rad) * 28, 380 - Math.sin(rad) * 28);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Enemy Tank (Right)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillRect(600, 380, 40, 20);
      ctx.shadowBlur = 0;

      // Update & Draw Ballistic Shell
      if (shellRef.current) {
        const s = shellRef.current;
        s.vy += 0.28; // Gravity
        s.vx += windMs * 0.005; // Wind drift

        s.x += s.vx;
        s.y += s.vy;

        // Draw Shell Glowing Projectile
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Hit Detection on Enemy
        if (s.x > 590 && s.x < 650 && s.y > 370 && s.y < 410) {
          uiaudio.success();
          setEnemyHp(hp => Math.max(0, hp - 35));
          shellRef.current = null;
          setIsShellInFlight(false);
        } else if (s.y >= 400 || s.x > canvas.width) {
          // Ground Hit
          uiaudio.click();
          shellRef.current = null;
          setIsShellInFlight(false);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [angleDeg, power, windMs]);

  const handleReset = () => {
    uiaudio.warp();
    setPlayerHp(100);
    setEnemyHp(100);
    setWindMs(Math.floor((Math.random() - 0.5) * 8));
    shellRef.current = null;
    setIsShellInFlight(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Crosshair className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
              TANK ARENA // 2D BALLISTIC ARTILLERY
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Parabolic projectile trajectory & wind deviation artillery duel for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Action / Reset */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={handleReset}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Reset Match"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
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

        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
          <div className="bg-zinc-950/80 backdrop-blur-md p-3.5 rounded-xl border border-white/10 space-y-1">
            <div className="text-[10px] text-zinc-400">PLAYER SHIELD</div>
            <div className="text-xl font-bold text-cyan-400">{playerHp} HP</div>
          </div>

          <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-center space-y-1">
            <div className="text-[10px] text-zinc-400">WIND VECTOR</div>
            <div className="text-sm font-bold text-amber-400">{windMs > 0 ? `→ +${windMs}` : `← ${windMs}`} M/S</div>
          </div>

          <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-right space-y-1">
            <div className="text-[10px] text-zinc-400">ENEMY SHIELD</div>
            <div className="text-xl font-bold text-red-400">{enemyHp} HP</div>
          </div>
        </div>

        {/* Controls Footer */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-xs bg-zinc-950/90 backdrop-blur-md p-4 rounded-xl border border-white/10">
          <div className="flex items-center space-x-6">
            <div className="space-y-1">
              <span className="text-zinc-400">ELEVATION ANGLE: {angleDeg}°</span>
              <input
                type="range"
                min={10}
                max={85}
                value={angleDeg}
                onChange={(e) => setAngleDeg(Number(e.target.value))}
                className="w-32 accent-cyan-500 cursor-pointer block"
              />
            </div>

            <div className="space-y-1">
              <span className="text-zinc-400">PROPELLANT POWER: {power}%</span>
              <input
                type="range"
                min={20}
                max={100}
                value={power}
                onChange={(e) => setPower(Number(e.target.value))}
                className="w-32 accent-pink-500 cursor-pointer block"
              />
            </div>
          </div>

          <button
            onClick={fireShell}
            disabled={isShellInFlight || enemyHp <= 0}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>FIRE PLASMA SHELL</span>
          </button>
        </div>
      </div>
    </div>
  );
}
