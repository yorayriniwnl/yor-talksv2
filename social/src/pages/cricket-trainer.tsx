import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Play, RotateCcw, Trophy, Zap, 
  Sparkles, Award, Compass, Volume2, ShieldCheck, Flame
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type ShotTiming = 'EARLY' | 'PERFECT (SWEET SPOT)' | 'LATE' | 'MISSED';

export default function CricketTrainer() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [runs, setRuns] = useState(0);
  const [ballsFaced, setBallsFaced] = useState(0);
  const [sixes, setSixes] = useState(0);
  const [fours, setFours] = useState(0);
  const [lastTiming, setLastTiming] = useState<ShotTiming | null>(null);
  const [ballState, setBallState] = useState<'ready' | 'bowling' | 'hit'>('ready');

  const ballPosRef = useRef({ x: 350, y: 120, z: 0, speed: 0.025 });
  const animFrameRef = useRef<number | null>(null);

  const startBowling = () => {
    uiaudio.warp();
    setBallState('bowling');
    setLastTiming(null);
    ballPosRef.current = { x: 350, y: 140, z: 0, speed: 0.02 };
  };

  const handleSwingBat = () => {
    if (ballState !== 'bowling') return;

    const b = ballPosRef.current;
    setBallsFaced(bf => bf + 1);

    // Timing evaluation based on z-depth
    if (b.z > 0.78 && b.z < 0.92) {
      // Sweet spot
      uiaudio.success();
      setLastTiming('PERFECT (SWEET SPOT)');
      setRuns(r => r + 6);
      setSixes(s => s + 1);
      setBallState('hit');
    } else if (b.z >= 0.65 && b.z <= 0.78) {
      // Early
      uiaudio.hover();
      setLastTiming('EARLY');
      setRuns(r => r + 4);
      setFours(f => f + 1);
      setBallState('hit');
    } else if (b.z >= 0.92 && b.z <= 1.05) {
      // Late
      uiaudio.hover();
      setLastTiming('LATE');
      setRuns(r => r + 2);
      setBallState('hit');
    } else {
      // Missed
      uiaudio.error();
      setLastTiming('MISSED');
      setBallState('ready');
    }
  };

  // 3D Batting Perspective Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Stadium Night Sky
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Stadium Floodlights Glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(100, 60, 50, 0, Math.PI * 2);
      ctx.arc(canvas.width - 100, 60, 50, 0, Math.PI * 2);
      ctx.fill();

      // Pitch Perspective
      ctx.fillStyle = '#14532d';
      ctx.beginPath();
      ctx.moveTo(100, canvas.height);
      ctx.lineTo(canvas.width - 100, canvas.height);
      ctx.lineTo(canvas.width / 2 + 50, 140);
      ctx.lineTo(canvas.width / 2 - 50, 140);
      ctx.closePath();
      ctx.fill();

      // Crease line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(140, canvas.height - 50);
      ctx.lineTo(canvas.width - 140, canvas.height - 50);
      ctx.stroke();

      // Draw Incoming Red Cricket Ball
      if (ballState === 'bowling') {
        const b = ballPosRef.current;
        b.z += b.speed;

        // Perspective scaling
        const ballSize = 4 + b.z * 24;
        const ballY = 140 + b.z * (canvas.height - 180);

        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(b.x, ballY, Math.max(3, ballSize), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (b.z >= 1.1) {
          setBallState('ready');
          setLastTiming('MISSED');
        }
      }

      // Draw English Willow Bat at Bottom Right
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.save();
      ctx.translate(canvas.width / 2 + 80, canvas.height - 70);
      ctx.rotate(-0.35);
      ctx.fillRect(-12, -80, 24, 90);
      ctx.restore();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [ballState]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Target className="w-8 h-8 text-black animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400">
              CRICKET VR // 3D BATTING TIMING TRAINER
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              First-person perspective 150 KM/H fast-bowling reaction simulator for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Match Stats */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">TOTAL RUNS</div>
            <div className="text-xl font-black text-amber-400">{runs} <span className="text-xs text-zinc-400">({ballsFaced}B)</span></div>
          </div>
        </div>
      </div>

      {/* 3D Batting Canvas Stage */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={700}
          height={480}
          onClick={handleSwingBat}
          className="w-full h-auto block cursor-pointer"
        />

        {/* In-Game Timing Popup */}
        {lastTiming && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-zinc-950/90 backdrop-blur-md px-6 py-2.5 rounded-xl border border-white/10 font-mono text-sm font-black animate-bounce shadow-xl">
            <span className={cn(lastTiming.includes('PERFECT') ? "text-emerald-400" : (lastTiming === 'MISSED' ? "text-red-400" : "text-amber-400"))}>
              {lastTiming}
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-xs">
          <button
            onClick={startBowling}
            disabled={ballState === 'bowling'}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center space-x-2"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>BOWL 150 KM/H YORKER</span>
          </button>

          <button
            onClick={handleSwingBat}
            disabled={ballState !== 'bowling'}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-black shadow-lg hover:brightness-110 disabled:opacity-50 transition-all flex items-center space-x-2"
          >
            <Zap className="w-4 h-4" />
            <span>SWING BAT (CLICK CANVAS)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
