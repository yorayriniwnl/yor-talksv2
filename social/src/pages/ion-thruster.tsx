import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Rocket, Play, Pause, RotateCcw, 
  Wind, ShieldCheck, Activity, Sliders, Flame
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function IonThruster() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dischargeVoltageV, setDischargeVoltageV] = useState(300); // 300 Volts
  const [specificImpulseSec, setSpecificImpulseSec] = useState(3200); // 3,200 s Isp
  const [xenonFlowSccm, setXenonFlowSccm] = useState(15.4);
  const [thrustMilliNewtons, setThrustMilliNewtons] = useState(120);

  const animFrameRef = useRef<number | null>(null);
  const ionsRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Ion Beam Physics Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Hall Thruster Annular Ceramic Channel (Left)
      ctx.fillStyle = '#334155';
      ctx.fillRect(80, cy - 80, 100, 160);

      // Magnetic Pole Coils (Center & Outer)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(60, cy - 100, 120, 20);
      ctx.fillRect(60, cy + 80, 120, 20);
      ctx.fillRect(100, cy - 20, 80, 40); // Center magnetic pole

      // Spawn Blue Xenon Plasma Ions (Xe+)
      if (Math.random() > 0.3) {
        ionsRef.current.push({
          x: 180,
          y: cy + (Math.random() - 0.5) * 120,
          vx: Math.random() * 8 + 12,
          vy: (Math.random() - 0.5) * 2,
          life: 100,
        });
      }

      // Update & Draw Accelerated Ion Beam
      ionsRef.current.forEach((ion) => {
        ion.x += ion.vx;
        ion.y += ion.vy;
        ion.life -= 1.5;

        if (ion.life > 0) {
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(ion.x, ion.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Filter dead ions
      ionsRef.current = ionsRef.current.filter(i => i.life > 0 && i.x < canvas.width);

      // Glowing Exhaust Plasma Cone
      const plumeGrad = ctx.createLinearGradient(180, cy, canvas.width, cy);
      plumeGrad.addColorStop(0, 'rgba(56, 189, 248, 0.6)');
      plumeGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.25)');
      plumeGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = plumeGrad;
      ctx.beginPath();
      ctx.moveTo(180, cy - 70);
      ctx.lineTo(canvas.width, cy - 130);
      ctx.lineTo(canvas.width, cy + 130);
      ctx.lineTo(180, cy + 70);
      ctx.closePath();
      ctx.fill();

      // Cathode Neutralizer (Top Right of Nozzle)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(170, cy - 105, 20, 10);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dischargeVoltageV]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Zap className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-teal-400">
                ION THRUSTER // HALL EFFECT PLASMA PROPULSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SPECIFIC IMPULSE 3,200S
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Xenon electrostatic acceleration & hollow cathode electron neutralization for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Isp */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE (Isp)</div>
            <div className="text-xl font-bold text-cyan-400">{specificImpulseSec} <span className="text-xs">SECONDS</span></div>
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
              <span className="text-cyan-400 font-bold">DISCHARGE VOLTAGE: {dischargeVoltageV} V</span>
              <span className="text-teal-400 font-bold">THRUST: {thrustMilliNewtons} mN</span>
            </div>
            <div>STATUS: CONTINUOUS PLASMA EXHAUST FIRING</div>
          </div>
        </div>

        {/* Thruster Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DISCHARGE CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Discharge Voltage:</span>
              <span className="text-cyan-400 font-bold">{dischargeVoltageV} V</span>
            </div>
            <input
              type="range"
              min={150}
              max={600}
              step={10}
              value={dischargeVoltageV}
              onChange={(e) => setDischargeVoltageV(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">HALL EFFECT:</span>
            <div>• Radial magnetic field traps electrons, creating a strong axial electric field that accelerates Xe+ ions to &gt;30 km/s!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
