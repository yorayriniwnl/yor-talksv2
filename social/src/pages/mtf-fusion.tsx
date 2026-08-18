import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Zap, Play, Pause, RotateCcw, 
  ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MtfFusion() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pistonPressureBar, setPistonPressureBar] = useState(850); // 850 Bar acoustic shock
  const [ionTempKev, setIonTempKev] = useState(12.5); // 12.5 keV (~140 Million K)
  const [compressing, setCompressing] = useState(false);
  const [gainQ, setGainQ] = useState(8.4);

  const animFrameRef = useRef<number | null>(null);
  const vortexRadius = useRef(150);

  const triggerMtfCompression = () => {
    uiaudio.warp();
    setCompressing(true);
    vortexRadius.current = 150;

    const interval = setInterval(() => {
      vortexRadius.current -= 9;
      if (vortexRadius.current <= 15) {
        clearInterval(interval);
        uiaudio.success();
        setTimeout(() => {
          setCompressing(false);
          vortexRadius.current = 150;
        }, 1200);
      }
    }, 40);
  };

  // MTF Liquid Metal Vortex & FRC Plasma Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;

    const render = () => {
      angle += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Reactor Vessel
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Pneumatic Steam Pistons Array (14 surrounding pistons)
      ctx.fillStyle = '#334155';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) {
        const px = cx + Math.cos(a) * 200;
        const py = cy + Math.sin(a) * 200;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spinning Liquid Lead-Lithium (Pb-Li) Metal Vortex Wall (Molten Orange/Gold)
      const r = vortexRadius.current;
      const vortexGrad = ctx.createRadialGradient(cx, cy, r, cx, cy, 200);
      vortexGrad.addColorStop(0, '#f59e0b');
      vortexGrad.addColorStop(0.5, '#d97706');
      vortexGrad.addColorStop(1, '#78350f');

      ctx.fillStyle = vortexGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 200, 0, Math.PI * 2);
      ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
      ctx.fill();

      // Field-Reversed Configuration (FRC) Magnetized Plasma Core (Cyan/White)
      const plasmaGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      plasmaGrad.addColorStop(0, '#ffffff');
      plasmaGrad.addColorStop(0.4, '#06b6d4');
      plasmaGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = plasmaGrad;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = compressing ? 25 : 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // FRC Closed Toroidal Magnetic Flux Loops
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.6, r * 0.3, angle, 0, Math.PI * 2);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [compressing]);

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
                MAGNETIZED TARGET FUSION // LIQUID METAL LINER (MTF)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ADIABATIC COMPRESSION Q = {gainQ}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Piston acoustic collapse of Pb-Li molten vortex on FRC magnetized plasmoid for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMtfCompression}
            disabled={compressing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{compressing ? 'PISTONS FIRING ACOUSTIC SHOCK...' : 'TRIGGER ACOUSTIC COMPRESSION'}</span>
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
              <span className="text-amber-400 font-bold">PISTON PRESSURE: {pistonPressureBar} BAR</span>
              <span className="text-cyan-400 font-bold">ION TEMP: {ionTempKev} keV</span>
            </div>
            <div>STATUS: {compressing ? 'ADIABATIC THERMONUCLEAR IGNITION' : 'LIQUID Pb-Li VORTEX STABLE'}</div>
          </div>
        </div>

        {/* MTF Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            MTF ADVANTAGES
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Liquid Metal Wall:</strong> Molten Pb-Li absorbs high-energy 14.1 MeV neutrons, shielding reactor structures from damage.</div>
            <div>• <strong>Tritium Self-Sufficiency:</strong> Neutrons convert Lithium into Tritium fuel (^6Li + n → ^4He + T).</div>
          </div>
        </div>
      </div>
    </div>
  );
}
