import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Atom, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ZpinchSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [peakCurrentMa, setPeakCurrentMa] = useState(22.4); // 22.4 Mega-amperes
  const [pinched, setPinched] = useState(false);
  const [neutronYield, setNeutronYield] = useState('3.8e15');
  const [coreTempKev, setCoreTempKev] = useState(14.2); // keV

  const animFrameRef = useRef<number | null>(null);
  const pinchRadius = useRef(140);

  const triggerZpinchShot = () => {
    uiaudio.warp();
    setPinched(true);
    pinchRadius.current = 140;

    const interval = setInterval(() => {
      pinchRadius.current -= 12;
      if (pinchRadius.current <= 12) {
        clearInterval(interval);
        uiaudio.success();
        setTimeout(() => {
          setPinched(false);
          pinchRadius.current = 140;
        }, 1500);
      }
    }, 40);
  };

  // Z-Pinch Lorentz Implosion Canvas
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

      // Outer Return Current Cans / Anode Posts (Circle of dots)
      ctx.fillStyle = '#475569';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const px = cx + Math.cos(a) * 190;
        const py = cy + Math.sin(a) * 190;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Imploding Cylindrical Plasma Wire Array (J_z x B_theta Lorentz pinch)
      const r = pinchRadius.current;
      const plasmaGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r + 15);
      plasmaGrad.addColorStop(0, '#ffffff');
      plasmaGrad.addColorStop(0.3, '#06b6d4');
      plasmaGrad.addColorStop(0.7, '#ec4899');
      plasmaGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');

      ctx.fillStyle = plasmaGrad;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = pinched ? 30 : 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Thermonuclear Neutron Flash upon Stagnation
      if (r <= 15) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 40;
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pinched]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Zap className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
                Z-PINCH // 22 MEGA-AMPERE PULSED FUSION MACHINE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                LORENTZ J_z × B_θ COMPRESSION
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Bennett pinch equilibrium & thermonuclear neutron flash for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerZpinchShot}
            disabled={pinched}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{pinched ? 'PULSED POWER DISCHARGING...' : 'DISCHARGE 22 MA FUSION SHOT'}</span>
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
              <span className="text-purple-400 font-bold">PEAK CURRENT: {peakCurrentMa} MA</span>
              <span className="text-cyan-400 font-bold">NEUTRON YIELD: {neutronYield} / SHOT</span>
            </div>
            <div>STATUS: {pinched ? 'MAGNETIC STAGNATION & COMPRESSION' : 'MARX GENERATOR CHARGED'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            Z-PINCH PHYSICS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Pulsed Power:</strong> Discharges 22 million amperes in 100 nanoseconds through a tungsten wire array.</div>
            <div>• <strong>Bennett Equilibrium:</strong> Enormous self-induced magnetic fields crush the plasma to 2 billion degrees Kelvin.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
