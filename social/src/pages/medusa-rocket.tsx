import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Umbrella
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MedusaRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [canopyDiameterMeters, setCanopyDiameterMeters] = useState(500); // 500m spinnaker parachute canopy
  const [specificImpulseSec, setSpecificImpulseSec] = useState(60000); // 60,000 s Isp
  const [pulseYieldKiloton, setPulseYieldKiloton] = useState(5.0); // 5.0 kt nuclear shape charge
  const [tetherTensionMegaNewtons, setTetherTensionMegaNewtons] = useState(85); // 85 MN tether pull

  const animFrameRef = useRef<number | null>(null);
  const detonationsRef = useRef<{ x: number; y: number; r: number; opacity: number }[]>([]);

  // Medusa Project Nuclear Spinnaker Canopy Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Deep Interplanetary Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Main Spacecraft Payload / Winch Hub (Right side at 600, cy)
      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.fillRect(580, cy - 25, 60, 50);
      ctx.strokeRect(580, cy - 25, 60, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('WINCH HUB', 585, cy + 5);

      // Long Kevlar / Carbon Nanotube Tethers (from 580 to Canopy at 160)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(580, cy - 20); ctx.lineTo(160, cy - 140);
      ctx.moveTo(580, cy + 20); ctx.lineTo(160, cy + 140);
      ctx.stroke();

      // Giant Parachute Spinnaker Canopy Ahead of Ship (Curved Crescent at 160)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(180, cy, 145, Math.PI * 0.55, Math.PI * 1.45);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Nuclear Shaped-Charge Detonation Ahead of Canopy (at 300, cy)
      if (Math.random() < 0.15) {
        detonationsRef.current.push({
          x: 300,
          y: cy,
          r: 5,
          opacity: 1.0,
        });
      }

      // Draw Detonation Plasma Cloud Expanding into Canopy
      detonationsRef.current.forEach((d) => {
        d.r += 4.5;
        d.opacity -= 0.035;

        ctx.strokeStyle = `rgba(236, 72, 153, ${d.opacity})`;
        ctx.fillStyle = `rgba(245, 158, 11, ${d.opacity * 0.45})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      detonationsRef.current = detonationsRef.current.filter(d => d.opacity > 0);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PROJECT MEDUSA: 500m CANOPY PARACHUTE PULSE DRIVE (I_sp = ${specificImpulseSec.toLocaleString()} s | TENSION = ${tetherTensionMegaNewtons} MN)`,
        80,
        cy + 175
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [canopyDiameterMeters, specificImpulseSec, tetherTensionMegaNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-amber-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Umbrella className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-amber-300 to-pink-400">
                PROJECT MEDUSA // NUCLEAR PULSE PARACHUTE DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                60,000s Isp (FREEMAN DYSON / SOLEM - NASA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Forward spinnaker canopy tethered nuclear shockwave propulsion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-cyan-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
          </div>
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
              <span className="text-cyan-400 font-bold">CANOPY: {canopyDiameterMeters} m</span>
              <span className="text-pink-400 font-bold">YIELD: {pulseYieldKiloton} kt</span>
              <span className="text-amber-400 font-bold">PULL: {tetherTensionMegaNewtons} MN</span>
            </div>
            <div>STATUS: TETHER WINCH GENERATING CONTINUOUS MULTI-G ACCEL</div>
          </div>
        </div>

        {/* Medusa Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CANOPY DIAMETER
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Parachute Spinnaker:</span>
              <span className="text-cyan-400 font-bold">{canopyDiameterMeters} m</span>
            </div>
            <input
              type="range"
              min={200}
              max={1000}
              step={50}
              value={canopyDiameterMeters}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCanopyDiameterMeters(val);
                setSpecificImpulseSec(Math.round(val * 120));
                setTetherTensionMegaNewtons(Math.round(val * 0.17));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Tension-Only Structure:</strong> Unlike Project Orion's massive solid pusher plate, Medusa uses lightweight flexible tethers under pure tension, saving thousands of tons of dead weight!</div>
            <div>• <strong>Winch Shock Absorber:</strong> A generator winch gradually reels out tether during the blast, converting sudden shockwaves into smooth continuous acceleration!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
