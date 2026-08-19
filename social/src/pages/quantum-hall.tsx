import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function QuantumHall() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [magneticFieldTesla, setMagneticFieldTesla] = useState(12.5); // 12.5 T
  const [fillingFactorNu, setFillingFactorNu] = useState('1'); // nu = 1, 2, 3, 1/3, 2/5
  const [hallResistanceOhms, setHallResistanceOhms] = useState(25812.8); // R_K / 1 = 25812.807 ohms

  const animFrameRef = useRef<number | null>(null);
  const electronsRef = useRef<{ x: number; y: number; edge: 'top' | 'bottom' | 'bulk'; vx: number }[]>([]);

  // 2DEG Hall Bar & Chiral Edge States Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Initialize 2DEG Electrons (Chiral Top vs Bottom Edge States)
    if (electronsRef.current.length === 0) {
      for (let i = 0; i < 40; i++) {
        const isTop = i < 18;
        const isBottom = i >= 18 && i < 36;
        electronsRef.current.push({
          x: Math.random() * (canvas.width - 160) + 80,
          y: isTop ? 140 : (isBottom ? 340 : 240),
          edge: isTop ? 'top' : (isBottom ? 'bottom' : 'bulk'),
          vx: isTop ? 3.5 : (isBottom ? -3.5 : 0),
        });
      }
    }

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // GaAs/AlGaAs Hall Bar Mesa Structure (Center Slab)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.fillRect(80, 130, canvas.width - 160, 220);
      ctx.strokeRect(80, 130, canvas.width - 160, 220);

      // Voltage Probes (Hall V_xy contacts)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 20, 110, 40, 20); // Top contact
      ctx.fillRect(cx - 20, 350, 40, 20); // Bottom contact

      // Chiral Edge Channels (Top = Rightwards in Cyan, Bottom = Leftwards in Magenta)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, 140); ctx.lineTo(canvas.width - 80, 140);
      ctx.stroke();

      ctx.strokeStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(canvas.width - 80, 340); ctx.lineTo(80, 340);
      ctx.stroke();

      // Draw & Propagate Chiral Electrons (No Backscattering Protected by Topology)
      electronsRef.current.forEach((e) => {
        e.x += e.vx;

        if (e.edge === 'top' && e.x > canvas.width - 90) e.x = 90;
        if (e.edge === 'bottom' && e.x < 90) e.x = canvas.width - 90;

        // Cyclotron Orbits in Bulk
        if (e.edge === 'bulk') {
          const cycR = 12;
          const px = e.x + Math.cos(time * 6) * cycR;
          const py = e.y + Math.sin(time * 6) * cycR;

          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = e.edge === 'top' ? '#06b6d4' : '#ec4899';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(e.x, e.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Quantized Hall Resistance Display
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`QUANTIZED HALL RESISTANCE: R_H = h / (${fillingFactorNu}·e²) = ${hallResistanceOhms.toFixed(1)} Ω`, 90, cy + 150);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [magneticFieldTesla, fillingFactorNu, hallResistanceOhms]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                QUANTUM HALL EFFECT // 2DEG LANDAU LEVELS & CHIRAL EDGES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                R_K = h/e² = 25,812.807 Ω (NOBEL 1985/1998)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Topological Chern numbers & dissipationless chiral edge transport for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">VON KLITZING CONSTANT</div>
            <div className="text-xl font-bold text-cyan-400">25,812.8 <span className="text-xs">OHMS</span></div>
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
              <span className="text-cyan-400 font-bold">FILLING ν: {fillingFactorNu}</span>
              <span className="text-pink-400 font-bold">B-FIELD: {magneticFieldTesla} Tesla</span>
              <span className="text-amber-400 font-bold">R_xx: 0.000 Ω (DISSIPATIONLESS)</span>
            </div>
            <div>STATUS: TOPOLOGICALLY PROTECTED CHIRAL EDGE CURRENT</div>
          </div>
        </div>

        {/* Hall Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            LANDAU FILLING FACTORS
          </h3>

          <div className="space-y-2">
            {[
              { nu: '1', r: 25812.8, name: 'Integer Plateau ν = 1 (Chern C = 1)' },
              { nu: '2', r: 12906.4, name: 'Integer Plateau ν = 2 (Chern C = 2)' },
              { nu: '3', r: 8604.3, name: 'Integer Plateau ν = 3 (Chern C = 3)' },
              { nu: '1/3', r: 77438.4, name: 'Fractional FQHE ν = 1/3 (Laughlin Anyons)' },
            ].map((plateau) => (
              <button
                key={plateau.nu}
                onClick={() => {
                  setFillingFactorNu(plateau.nu);
                  setHallResistanceOhms(plateau.r);
                  uiaudio.click();
                }}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  fillingFactorNu === plateau.nu ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">{plateau.name}</div>
                <div className="text-[10px] text-zinc-400">R_H = {plateau.r.toFixed(1)} Ω</div>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Integer Quantum Hall (IQHE):</strong> Hall conductance is quantized in exact integer multiples of e²/h to 1 part in 10⁹, defining the global electrical resistance standard!</div>
            <div>• <strong>Zero Backscattering:</strong> Forward and backward moving electrons are physically separated on opposite edges of the crystal, eliminating electrical resistance!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
