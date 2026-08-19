import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Crosshair
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PolywellWarpVanguard() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [wellVoltageKilovolts, setWellVoltageKilovolts] = useState(100); // 100 kV potential well
  const [electronCurrentAmperes, setElectronCurrentAmperes] = useState(500); // 500 A electron drive
  const [specificImpulseSec, setSpecificImpulseSec] = useState(400000); // 400,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(9000); // 9,000 kN vanguard thrust

  const animFrameRef = useRef<number | null>(null);
  const vanguardPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Polywell High-Beta Cusp Magnetic Electrostatic Confinement Canvas
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

      // 6 Orthogonal Magnetic Cusp Coils (Left: 80 to 240)
      const numCoils = 4;
      for (let c = 0; c < numCoils; c++) {
        const angle = (c / numCoils) * Math.PI * 2 + time * 0.4;
        const coilX = 160 + Math.cos(angle) * 55;
        const coilY = cy + Math.sin(angle) * 55;

        // Coil Ring
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(coilX, coilY, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Magnetic Field Cusp Stream
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(coilX, coilY); ctx.lineTo(160, cy);
        ctx.stroke();
      }

      // Deep Negative Potential Well Electron Core (at 160, cy)
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(160, cy, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('-100kV', 145, cy + 3);

      // Magnetic Aerospike Expansion Divertor (230 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(230, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(230, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // Relativistic Aneutronic Alpha Fusion Exhaust Plumes
      if (Math.random() < 0.8) {
        vanguardPlasmaJetsRef.current.push({
          x: 230,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 34 + (wellVoltageKilovolts / 100) * 10,
        });
      }

      vanguardPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      vanguardPlasmaJetsRef.current = vanguardPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `POLYWELL WARP VANGUARD: WELL VOLTAGE = ${wellVoltageKilovolts} kV | ELECTRON CURRENT = ${electronCurrentAmperes} A | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [wellVoltageKilovolts, electronCurrentAmperes, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
                POLYWELL WARP VANGUARD // 400,000s Isp FUSION DRIVE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                BUSSARD & KRALL (EMC2 FUSION)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              100 kV electrostatic potential well & aneutronic p-11B vanguard starship for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">VANGUARD THRUST</div>
            <div className="text-xl font-bold text-cyan-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-cyan-400 font-bold">POTENTIAL WELL: {wellVoltageKilovolts} kV</span>
              <span className="text-pink-400 font-bold">ELECTRON CURRENT: {electronCurrentAmperes} A</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: HIGH-BETA CUSP ELECTRON TRAPPING NOMINAL</div>
          </div>
        </div>

        {/* Polywell Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              WELL VOLTAGE (kV)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Potential Well Depth:</span>
              <span className="text-cyan-400 font-bold">{wellVoltageKilovolts} kV</span>
            </div>
            <input
              type="range"
              min={50}
              max={200}
              step={10}
              value={wellVoltageKilovolts}
              onChange={(e) => {
                const val = Number(e.target.value);
                setWellVoltageKilovolts(val);
                setThrustKiloNewtons(Math.floor(val * 90));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Virtual Cathode Well:</strong> Trapped high-energy electrons create a deep negative electrostatic potential well, radially accelerating fuel ions without physical grid collisions!</div>
            <div>• <strong>Aneutronic Polywell Propulsion:</strong> Clean proton-boron fusion products exhaust through magnetic divertor channels at 400,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
