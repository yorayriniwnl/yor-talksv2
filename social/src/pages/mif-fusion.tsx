import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Zap, Play, Pause, RotateCcw, 
  ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MifFusion() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [laserEnergyKj, setLaserEnergyKj] = useState(2.5); // 2.5 kJ Z-Beamlet laser
  const [seedFieldTesla, setSeedFieldTesla] = useState(25); // 25 T seed magnetic field
  const [neutronYield, setNeutronYield] = useState('1.1e16');
  const [isImploding, setIsImploding] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const linerRadiusRef = useRef(140);

  const triggerMaglifShot = () => {
    uiaudio.warp();
    setIsImploding(true);
    linerRadiusRef.current = 140;

    const interval = setInterval(() => {
      linerRadiusRef.current -= 8;
      if (linerRadiusRef.current <= 12) {
        clearInterval(interval);
        uiaudio.success();
        setTimeout(() => {
          setIsImploding(false);
          linerRadiusRef.current = 140;
        }, 1200);
      }
    }, 40);
  };

  // MagLIF Magnetized Liner Inertial Fusion Canvas
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

      // Dark Chamber
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Axial Seed Magnetic Field Lines (Vertical Cyan Lines)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1.5;
      for (let x = cx - 180; x <= cx + 180; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 40); ctx.lineTo(x, canvas.height - 40);
        ctx.stroke();
      }

      // Imploding Cylindrical Beryllium Metal Liner (Solid Gray/Cyan Ring)
      const r = linerRadiusRef.current;
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(cx, cy, r + 15, 0, Math.PI * 2);
      ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
      ctx.fill();

      // Pre-heated Magnetized Deuterium-Tritium Fuel Core (Laser Heated Plasma Glow)
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#f59e0b');
      coreGrad.addColorStop(0.7, '#ec4899');
      coreGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');

      ctx.fillStyle = coreGrad;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isImploding ? 30 : 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.95, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Laser Pre-heat Beam entering from top
      if (isImploding && r > 80) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(cx, 0); ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isImploding]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                MAGNETO-INERTIAL FUSION // MagLIF PULSED LINER REACTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                SANDIA NATIONAL LABS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Laser pre-heating, B_z flux freezing & beryllium liner pulsed compression for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMaglifShot}
            disabled={isImploding}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isImploding ? 'MAGLIF 20 MA PULSED IMPLOSION...' : 'TRIGGER MagLIF FUSION SHOT'}</span>
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
              <span className="text-amber-400 font-bold">LASER ENERGY: {laserEnergyKj} kJ</span>
              <span className="text-cyan-400 font-bold">SEED FIELD: {seedFieldTesla} T</span>
            </div>
            <div>STATUS: {isImploding ? 'BERYLLIUM LINER STAGNATION' : 'MAGNETIZED TARGET CHARGED'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            MagLIF 3-STAGE PROCESS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>1. Magnetization:</strong> 25 T seed magnetic field suppresses radial electron thermal conduction.</div>
            <div>• <strong>2. Laser Pre-heat:</strong> Multi-kJ laser heats fuel to ~100 eV before compression.</div>
            <div>• <strong>3. Magnetic Implosion:</strong> 20 MA current crushes liner, compressing seed field to &gt;1,000 T and fuel to thermonuclear ignition!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
