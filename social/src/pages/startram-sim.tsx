import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Navigation
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function StartramSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [launchVelocityKms, setLaunchVelocityKms] = useState(8.0); // 8.0 km/s (orbital breakout velocity)
  const [tubeLengthKm, setTubeLengthKm] = useState(130); // 130 km evacuated vacuum tube
  const [gForce, setGForce] = useState(25.0); // 25 g acceleration
  const [isLaunching, setIsLaunching] = useState(false);
  const [capsulePos, setCapsulePos] = useState(0); // 0 to 100%

  const animFrameRef = useRef<number | null>(null);

  const triggerMaglevLaunch = () => {
    uiaudio.warp();
    setIsLaunching(true);
    setCapsulePos(0);

    const interval = setInterval(() => {
      setCapsulePos(p => {
        if (p >= 100) {
          clearInterval(interval);
          setIsLaunching(false);
          uiaudio.success();
          return 100;
        }
        return p + 5;
      });
    }, 50);
  };

  const handleReset = () => {
    uiaudio.click();
    setCapsulePos(0);
    setIsLaunching(false);
  };

  // Superconducting Maglev Orbital Launch Tube Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Atmosphere Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Mountain Curved Ascent Profile (Left sea level to Right 20 km high mountain peak)
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      ctx.lineTo(0, canvas.height - 40);
      ctx.quadraticCurveTo(cx, canvas.height - 50, canvas.width, 100);
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      ctx.fill();

      // Evacuated Superconducting Maglev Launch Tube (Curving upwards)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(40, canvas.height - 60);
      ctx.quadraticCurveTo(cx, canvas.height - 70, canvas.width - 40, 80);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // MHD Plasma Window Vacuum Seal at Tube Exit (Right 700, 80)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(canvas.width - 40, 80, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Compute Capsule Position along bezier curve
      const t = capsulePos / 100;
      const p0 = { x: 40, y: canvas.height - 60 };
      const p1 = { x: cx, y: canvas.height - 70 };
      const p2 = { x: canvas.width - 40, y: 80 };

      const capX = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
      const capY = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;

      // Draw Maglev Spacecraft Capsule
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(capX, capY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `STARTRAM GEN-2 VELOCITY: ${(launchVelocityKms * (capsulePos / 100)).toFixed(1)} km/s (ORBITAL INSERTION)`,
        100,
        canvas.height - 20
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [launchVelocityKms, capsulePos]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Navigation className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                STARTRAM // SUPERCONDUCTING MAGLEV ORBITAL LAUNCH TUBE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                8.0 KM/S ZERO-PROPELLANT LAUNCH
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              130 km evacuated maglev track & MHD plasma window atmospheric breakout for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMaglevLaunch}
            disabled={isLaunching || capsulePos >= 100}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isLaunching ? 'MAGLEV ACCELERATING 25g...' : 'TRIGGER 8 KM/S LAUNCH'}</span>
          </button>

          {capsulePos > 0 && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={740}
            height={480}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-cyan-400 font-bold">ACCELERATION: {gForce} g</span>
              <span className="text-pink-400 font-bold">TRACK: {tubeLengthKm} km</span>
              <span className="text-amber-400 font-bold">PAYLOAD: 40 TONS</span>
            </div>
            <div>STATUS: {capsulePos >= 100 ? 'SUCCESSFUL LEO ORBITAL INSERTION' : 'READY ON MAGLEV CATAPULT'}</div>
          </div>
        </div>

        {/* Startram Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            LAUNCH SPECIFICATIONS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Evacuated Maglev Tube:</strong> Superconducting magnets levitate and accelerate the vehicle in near-total vacuum (&lt; 1 Pa), eliminating air resistance during acceleration!</div>
            <div>• <strong>MHD Plasma Window:</strong> A magnetohydrodynamic plasma arc seals the exit nozzle against external 1-atm air pressure until the spacecraft bursts through at 8 km/s!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
