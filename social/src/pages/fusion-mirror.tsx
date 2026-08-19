import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FusionMirror() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mirrorRatioR, setMirrorRatioR] = useState(3.5); // Mirror ratio R = B_max / B_min
  const [plasmaTempKev, setPlasmaTempKev] = useState(45); // 45 keV D-T plasma
  const [specificImpulseSec, setSpecificImpulseSec] = useState(100000); // 100,000 s Isp
  const [thrustN, setThrustN] = useState(85.0); // 85 N thrust

  const animFrameRef = useRef<number | null>(null);
  const ionsRef = useRef<{ x: number; y: number; vx: number; vy: number; trapped: boolean }[]>([]);

  // Open Magnetic Mirror Plasma Confinement & Ambipolar Exhaust Canvas
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

      // Dark Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Superconducting Mirror Coils: Left Throat (140) & Right Throat (440)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(140, cy - 70, 16, 140);
      ctx.fillRect(440, cy - 70, 16, 140);

      // Central Solenoid Confinement Vessel (140 to 440)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(140, cy - 50, 300, 100);

      // Magnetic Mirror Field Lines (Hourglass Shape)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Upper magnetic line
      ctx.moveTo(100, cy - 30); ctx.quadraticCurveTo(140, cy - 65, 290, cy - 40); ctx.quadraticCurveTo(440, cy - 65, 480, cy - 30);
      // Lower magnetic line
      ctx.moveTo(100, cy + 30); ctx.quadraticCurveTo(140, cy + 65, 290, cy + 40); ctx.quadraticCurveTo(440, cy + 65, 480, cy + 30);
      ctx.stroke();

      // Magnetic Expansion Nozzle Exhaust at Right (440 to 600)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(440, cy - 70); ctx.quadraticCurveTo(520, cy - 90, 620, cy - 120);
      ctx.moveTo(440, cy + 70); ctx.quadraticCurveTo(520, cy + 90, 620, cy + 120);
      ctx.stroke();

      // Central Fusion Core Glow (Magenta/Gold Plasma)
      const coreGrad = ctx.createRadialGradient(290, cy, 5, 290, cy, 45);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, '#ec4899');
      coreGrad.addColorStop(0.8, '#8b5cf6');
      coreGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(290, cy, 45, 0, Math.PI * 2);
      ctx.fill();

      // Spawn Fusion Alpha & Deuteron Ions
      if (Math.random() < 0.35) {
        ionsRef.current.push({
          x: 290,
          y: cy + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 4,
          trapped: Math.random() < 0.7, // Trapped in magnetic bottle vs in loss cone
        });
      }

      // Update & Render Plasma Ions
      ionsRef.current.forEach((ion) => {
        ion.x += ion.vx;
        ion.y += ion.vy;

        if (ion.trapped) {
          // Bounce back at magnetic mirror throat (150 or 430)
          if (ion.x < 160 || ion.x > 420) ion.vx *= -1;
          if (ion.y < cy - 35 || ion.y > cy + 35) ion.vy *= -1;
        } else {
          // Escapes through loss cone as relativistic exhaust beam
          ion.vx = Math.abs(ion.vx) + 2.5;
        }

        ctx.fillStyle = ion.trapped ? '#38bdf8' : '#f59e0b';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(ion.x, ion.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ionsRef.current = ionsRef.current.filter(ion => ion.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mirrorRatioR, plasmaTempKev]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                MAGNETIC MIRROR FUSION // DIRECT AMBIPOLAR PLASMA DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Isp = 100,000s (OPEN CONFINEMENT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Tandem magnetic mirror confinement & magnetic expansion nozzle exhaust for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">EXHAUST VELOCITY</div>
            <div className="text-xl font-bold text-cyan-400">1,000 <span className="text-xs">KM/S</span></div>
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
              <span className="text-cyan-400 font-bold">MIRROR RATIO R: {mirrorRatioR}</span>
              <span className="text-pink-400 font-bold">TEMPERATURE: {plasmaTempKev} keV</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustN} N</span>
            </div>
            <div>STATUS: DIRECT CHARGED PARTICLE AMBIPOLAR CONVERSION</div>
          </div>
        </div>

        {/* Mirror Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              MIRROR RATIO
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Mirror Ratio (R):</span>
              <span className="text-cyan-400 font-bold">{mirrorRatioR}</span>
            </div>
            <input
              type="range"
              min={2.0}
              max={6.0}
              step={0.1}
              value={mirrorRatioR}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMirrorRatioR(val);
                setThrustN(+(val * 24).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Linear Geometry Advantage:</strong> Unlike closed tokamaks, open magnetic mirrors naturally direct high-energy charged fusion products out of one end as a rocket exhaust!</div>
            <div>• <strong>Ambipolar Potential:</strong> Electrostatic end-plugs trap lower energy ions while venting multi-MeV alpha particles directly through a magnetic nozzle at 100,000s Isp!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
