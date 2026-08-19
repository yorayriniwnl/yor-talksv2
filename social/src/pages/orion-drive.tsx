import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function OrionDrive() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pulseYieldKt, setPulseYieldKt] = useState(0.15); // 0.15 kiloton shaped nuclear charge
  const [pulseFrequencyHz, setPulseFrequencyHz] = useState(1.0); // 1 detonation per second
  const [specificImpulseSec, setSpecificImpulseSec] = useState(10000); // 10,000 s Isp
  const [shipThrustKn, setShipThrustKn] = useState(45000); // 45,000 kN (massive thrust)
  const [isDetonating, setIsDetonating] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const shockPistonY = useRef(0);

  const triggerNuclearPulse = () => {
    uiaudio.warp();
    setIsDetonating(true);
    shockPistonY.current = -25; // Shock absorber compression

    setTimeout(() => {
      shockPistonY.current = 0;
      setIsDetonating(false);
      uiaudio.success();
    }, 900);
  };

  // Project Orion Nuclear Pulse Pusher Plate Canvas
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

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Massive Spacecraft Hull (Upper Steel Structure)
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 70, 60, 140, 150);

      // Two-Stage Pneumatic & Spring Shock Absorbers (Connecting hull to pusher plate)
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      // Left Shock Strut
      ctx.moveTo(cx - 50, 210); ctx.lineTo(cx - 50, 270 + shockPistonY.current);
      // Right Shock Strut
      ctx.moveTo(cx + 50, 210); ctx.lineTo(cx + 50, 270 + shockPistonY.current);
      ctx.stroke();

      // Massive 1,000-Ton Ablative Pusher Plate (Heavy Steel Disk with Oil Coating)
      const plateY = 270 + shockPistonY.current;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx, plateY, 130, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Nuclear Shaped-Charge Plasma Vaporization Detonation Plume (Below Plate)
      if (isDetonating) {
        const boomY = plateY + 90;

        // Blinding Nuclear Fireball (White-Orange-Cyan)
        const boomGrad = ctx.createRadialGradient(cx, boomY, 5, cx, boomY, 140);
        boomGrad.addColorStop(0, '#ffffff');
        boomGrad.addColorStop(0.3, '#f59e0b');
        boomGrad.addColorStop(0.7, '#ef4444');
        boomGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

        ctx.fillStyle = boomGrad;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(cx, boomY, 130, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // High-Velocity Tungsten Plasma Jets striking Pusher Plate
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        for (let i = -4; i <= 4; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * 20, boomY);
          ctx.lineTo(cx + i * 25, plateY + 15);
          ctx.stroke();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDetonating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                PROJECT ORION // NUCLEAR PULSE KINETIC DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                10,000S Isp & 45,000 kN THRUST
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Shaped-charge nuclear plasma detonations & two-stage shock pusher plate for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerNuclearPulse}
            disabled={isDetonating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDetonating ? 'NUCLEAR PLASMA IMPULSE WAVE...' : 'FIRE PULSE UNIT (0.15 KT)'}</span>
          </button>
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
              <span className="text-amber-400 font-bold">CHARGE YIELD: {pulseYieldKt} kt TNT</span>
              <span className="text-cyan-400 font-bold">Isp: {specificImpulseSec} s</span>
              <span className="text-rose-400 font-bold">THRUST: {(shipThrustKn / 1000).toFixed(0)} MN</span>
            </div>
            <div>STATUS: {isDetonating ? 'SHOCK ABSORBER ENERGY DISSIPATION' : 'PUSHER READY FOR IMPULSE'}</div>
          </div>
        </div>

        {/* Propulsion Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ORION ARCHITECTURE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Freeman Dyson Design:</strong> Only propulsion system physically capable of launching 8,000,000-ton interstellar arks to Alpha Centauri within human lifespans.</div>
            <div>• <strong>Ablative Oil Film:</strong> Spraying graphite/oil onto the steel pusher plate between pulses prevents thermal erosion from 100,000 K plasma!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
