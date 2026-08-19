import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FissionFragment() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dustRadiusMicrons, setDustRadiusMicrons] = useState(2.0); // 2 micron UO2 fuel dust particles
  const [specificImpulseSec, setSpecificImpulseSec] = useState(1000000); // 1,000,000 s Isp
  const [thrustNewtons, setThrustNewtons] = useState(850); // 850 N continuous thrust
  const [exhaustVelocityKms, setExhaustVelocityKms] = useState(12000); // 12,000 km/s (0.04c)

  const animFrameRef = useRef<number | null>(null);
  const fragmentsRef = useRef<{ x: number; y: number; vx: number; vy: number; mass: string }[]>([]);

  // Dusty-Plasma Fission Fragment Magnetic Collimator Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Superconducting Solenoid Magnetic Guide Coils (Left 60 to 320)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      for (let x = 80; x <= 300; x += 40) {
        ctx.strokeRect(x, cy - 80, 16, 25);
        ctx.strokeRect(x, cy + 55, 16, 25);
      }

      // Magnetic Divergent Nozzle Guide Field (300 to 480)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(300, cy - 80); ctx.lineTo(480, cy - 140);
      ctx.moveTo(300, cy + 80); ctx.lineTo(480, cy + 140);
      ctx.stroke();

      // Levitated Sub-Micron UO2 Radioactive Fuel Dust Bed (Center cylinder 100 to 280)
      for (let i = 0; i < 24; i++) {
        const dx = 120 + (i % 6) * 28;
        const dy = cy - 30 + Math.floor(i / 6) * 20;

        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(dx + Math.sin(time * 2 + i) * 3, dy + Math.cos(time * 2 + i) * 3, dustRadiusMicrons * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Spawn Directly Escaped Fission Fragments (Ba-141 / Kr-92 hypervelocity ions)
      if (Math.random() < 0.6) {
        fragmentsRef.current.push({
          x: 180,
          y: cy + (Math.random() - 0.5) * 40,
          vx: Math.random() * 6 + 18,
          vy: (Math.random() - 0.5) * 2.5,
          mass: Math.random() < 0.5 ? 'Kr-92' : 'Ba-141',
        });
      }

      // Draw & Propagate Fission Fragments
      fragmentsRef.current.forEach((frag) => {
        frag.x += frag.vx;
        frag.y += frag.vy;

        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(frag.x, frag.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      fragmentsRef.current = fragmentsRef.current.filter(f => f.x < canvas.width);

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DIRECT FISSION FRAGMENT EXHAUST: v_e = ${exhaustVelocityKms.toLocaleString()} km/s (0.04c) | I_sp = ${specificImpulseSec.toLocaleString()} s`,
        90,
        cy + 160
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dustRadiusMicrons, specificImpulseSec, exhaustVelocityKms]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                FISSION FRAGMENT ROCKET // DUSTY-PLASMA COLLIMATOR (FFRE)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                1,000,000s Isp (NASA NIAC / CHAPLINE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Direct electrostatic magnetic expulsion of multi-MeV nuclear fission ions for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-pink-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-pink-400 font-bold">DUST GRAIN: {dustRadiusMicrons} µm</span>
              <span className="text-cyan-400 font-bold">EXHAUST: {exhaustVelocityKms.toLocaleString()} km/s</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustNewtons} N</span>
            </div>
            <div>STATUS: ZERO SOLID BULK THERMAL LOSSES</div>
          </div>
        </div>

        {/* FFRE Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DUST GRAIN SIZE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>UO₂ Grain Radius:</span>
              <span className="text-pink-400 font-bold">{dustRadiusMicrons} µm</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10.0}
              step={0.5}
              value={dustRadiusMicrons}
              onChange={(e) => {
                const val = Number(e.target.value);
                setDustRadiusMicrons(val);
                // Smaller grains allow higher fragment escape fraction
                const escapeFrac = Math.max(0.2, 1.0 - val * 0.08);
                setSpecificImpulseSec(Math.round(1000000 * escapeFrac));
                setExhaustVelocityKms(Math.round(12000 * escapeFrac));
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Micro-Grain Fission Escape:</strong> Because UO₂ fuel particles are smaller than the fission fragment stopping distance (~5 µm), fission fragments escape the solid dust directly into space!</div>
            <div>• <strong>Magnetic Collimation:</strong> Superconducting magnetic coils bend the positively charged Ba/Kr fragments into a collimated unidirectional exhaust beam!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
