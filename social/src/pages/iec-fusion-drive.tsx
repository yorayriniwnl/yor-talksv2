import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function IecFusionDrive() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [virtualCathodeVoltageKv, setVirtualCathodeVoltageKv] = useState(100); // 100 kV deep electrostatic potential well
  const [specificImpulseSec, setSpecificImpulseSec] = useState(150000); // 150,000 s Isp
  const [thrustMegaNewtons, setThrustMegaNewtons] = useState(1.5); // 1.5 MN thrust
  const [relativisticBeta, setRelativisticBeta] = useState(0.38); // 0.38c cruise

  const animFrameRef = useRef<number | null>(null);
  const helium3StreamRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Polywell Inertial Electrostatic Confinement (IEC) Canvas
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

      // Polywell 6-Coil Magnetic Cusp Polyhedral Casing (Center at 260, cy)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.strokeRect(180, cy - 80, 160, 160);

      // Magnetic Coil Corner Rings
      const corners = [
        { x: 180, y: cy - 80 }, { x: 340, y: cy - 80 },
        { x: 180, y: cy + 80 }, { x: 340, y: cy + 80 }
      ];

      corners.forEach(c => {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 10, 0, Math.PI * 2);
        ctx.fill();
      });

      // Central Virtual Cathode Electron Cloud Well (Deep Potential Core at 260, cy)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(260, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`-${virtualCathodeVoltageKv}kV`, 245, cy + 3);

      // Superconducting Magnetic Expansion Nozzle (340 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(340, cy - 30); ctx.lineTo(520, cy - 80);
      ctx.moveTo(340, cy + 30); ctx.lineTo(520, cy + 80);
      ctx.stroke();

      // D-3He High-Velocity Charged Ion Exhaust Stream
      if (Math.random() < 0.45) {
        helium3StreamRef.current.push({
          x: 340,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 18 + (virtualCathodeVoltageKv / 100) * 8,
        });
      }

      helium3StreamRef.current.forEach((h) => {
        h.x += h.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      helium3StreamRef.current = helium3StreamRef.current.filter(h => h.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `POLYWELL IEC FUSION: V_well = -${virtualCathodeVoltageKv} kV (I_sp = ${specificImpulseSec.toLocaleString()} s | F = ${thrustMegaNewtons} MN | v = ${relativisticBeta}c)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [virtualCathodeVoltageKv, specificImpulseSec, thrustMegaNewtons, relativisticBeta]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Compass className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                POLYWELL IEC // DIRECT-DRIVE INERTIAL ELECTROSTATIC STARSHIP
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                150,000s Isp (ROBERT BUSSARD & MILEY - EMC2)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              100 kV virtual electrostatic cathode well & aneutronic D-3He thrust for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">RELATIVISTIC CRUISE</div>
            <div className="text-xl font-bold text-cyan-400">{relativisticBeta} <span className="text-xs">c</span></div>
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
              <span className="text-cyan-400 font-bold">POTENTIAL: -{virtualCathodeVoltageKv} kV</span>
              <span className="text-pink-400 font-bold">I_sp: {specificImpulseSec.toLocaleString()} s</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustMegaNewtons} MN</span>
            </div>
            <div>STATUS: CONTINUOUS RECIRCULATING ION CONFINEMENT</div>
          </div>
        </div>

        {/* IEC Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CATHODE WELL POTENTIAL
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Well Voltage:</span>
              <span className="text-cyan-400 font-bold">-{virtualCathodeVoltageKv} kV</span>
            </div>
            <input
              type="range"
              min={50}
              max={250}
              step={10}
              value={virtualCathodeVoltageKv}
              onChange={(e) => {
                const val = Number(e.target.value);
                setVirtualCathodeVoltageKv(val);
                setThrustMegaNewtons(+(val * 0.015).toFixed(2));
                setRelativisticBeta(+(0.2 + val * 0.0018).toFixed(2));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Virtual Cathode Formation:</strong> Injecting high-current electrons into a magnetic cusp box forms a deep negative potential well that accelerates positively charged ions inward!</div>
            <div>• <strong>Gridless Recirculation:</strong> Unlike Farnsworth fusors which lose energy to physical grid wire collisions, the Polywell magnetically shields its coils, achieving ultra-high gain!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
