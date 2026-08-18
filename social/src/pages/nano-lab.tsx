import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, ShieldCheck, RefreshCw, Scissors, Layers, Sliders, Info
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type BasePair = 'A' | 'T' | 'C' | 'G';

interface Nucleotide {
  id: number;
  base: BasePair;
  pair: BasePair;
  y: number;
  health: number;
  mutated?: boolean;
}

const COMPLEMENTS: { [key in BasePair]: BasePair } = {
  A: 'T',
  T: 'A',
  C: 'G',
  G: 'C',
};

const BASE_COLORS: { [key in BasePair]: string } = {
  A: '#ef4444', // Red
  T: '#3b82f6', // Blue
  C: '#10b981', // Green
  G: '#eab308', // Yellow
};

export default function NanoLab() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [sequence, setSequence] = useState<Nucleotide[]>(() => {
    const initial: BasePair[] = ['A', 'T', 'G', 'C', 'C', 'G', 'A', 'T', 'T', 'A', 'G', 'C', 'A', 'T', 'C', 'G'];
    return initial.map((b, i) => ({
      id: i,
      base: b,
      pair: COMPLEMENTS[b],
      y: i * 32,
      health: 100,
      mutated: i === 6,
    }));
  });

  const [isRotating, setIsRotating] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [cas9Active, setCas9Active] = useState(false);
  const [cleavedIndex, setCleavedIndex] = useState<number | null>(null);
  const [thermalTempK, setThermalTempK] = useState(310); // 37°C in Kelvin
  const [bindingAffinity, setBindingAffinity] = useState(94.2);

  const animFrameRef = useRef<number | null>(null);

  // DNA 3D Double-Helix Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isRotating) {
        angle += 0.02 * rotationSpeed;
      }

      const centerX = canvas.width / 2;
      const strandRadius = 110;

      // Draw Background Grid
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Double Helix Strands & Hydrogen Bonds
      sequence.forEach((nuc, idx) => {
        const theta = angle + (idx * 0.4);
        const x1 = centerX + Math.sin(theta) * strandRadius;
        const x2 = centerX - Math.sin(theta) * strandRadius;
        const y = 50 + (idx * 28);
        const z1 = Math.cos(theta); // Depth factor (-1 to 1)
        const z2 = -Math.cos(theta);

        // CRISPR-Cas9 Target Overlay indicator
        const isTarget = cas9Active && idx === 6;

        if (isTarget) {
          ctx.save();
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(centerX, y, strandRadius + 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(236, 72, 153, 0.1)';
          ctx.fill();
          ctx.restore();
        }

        // Hydrogen Bond Line
        ctx.strokeStyle = nuc.mutated ? '#f43f5e' : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = nuc.mutated ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();

        // Node 1 (Strand Alpha)
        const size1 = 10 + z1 * 3;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x1, y, Math.max(4, size1), 0, Math.PI * 2);
        ctx.fillStyle = BASE_COLORS[nuc.base];
        ctx.shadowColor = BASE_COLORS[nuc.base];
        ctx.shadowBlur = 10;
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nuc.base, x1, y);
        ctx.restore();

        // Node 2 (Strand Beta)
        const size2 = 10 + z2 * 3;
        ctx.save();
        ctx.beginPath();
        ctx.arc(x2, y, Math.max(4, size2), 0, Math.PI * 2);
        ctx.fillStyle = BASE_COLORS[nuc.pair];
        ctx.shadowColor = BASE_COLORS[nuc.pair];
        ctx.shadowBlur = 10;
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nuc.pair, x2, y);
        ctx.restore();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sequence, isRotating, rotationSpeed, cas9Active]);

  const handleTriggerCrispr = () => {
    uiaudio.warp();
    setCas9Active(true);

    setTimeout(() => {
      uiaudio.success();
      setSequence(prev => prev.map((n, i) => i === 6 ? { ...n, mutated: false, health: 100 } : n));
      setBindingAffinity(99.8);
      setCleavedIndex(6);
    }, 1500);
  };

  const handleReset = () => {
    uiaudio.click();
    setCas9Active(false);
    setCleavedIndex(null);
    setBindingAffinity(94.2);
    setSequence(prev => prev.map((n, i) => i === 6 ? { ...n, mutated: true } : n));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-teal-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-400/40">
            <Dna className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-400">
                NANO LAB // QUANTUM CRISPR & DNA HELIX
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                CAS9 RNA EDIT
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Real-time 3D double helix molecular physics and nucleotide cleavage simulator for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Telemetry HUD */}
        <div className="flex items-center space-x-4 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">BINDING AFFINITY</div>
            <div className="text-lg font-bold text-teal-300">{bindingAffinity}% ΔG</div>
          </div>
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CORE TEMP</div>
            <div className="text-lg font-bold text-cyan-300">{thermalTempK} K (37°C)</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={720}
            height={540}
            className="w-full h-auto block"
          />

          {/* Quick HUD Overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-red-400 font-bold">A (ADENINE)</span>
              <span className="text-blue-400 font-bold">T (THYMINE)</span>
              <span className="text-green-400 font-bold">C (CYTOSINE)</span>
              <span className="text-yellow-400 font-bold">G (GUANINE)</span>
            </div>
            <div>STATUS: {cas9Active ? 'CAS9 CLEAVAGE IN PROGRESS' : 'HELICAL STABILIZATION ACTIVE'}</div>
          </div>
        </div>

        {/* Nucleotide Sequence & CRISPR Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SEQUENCE CONTROLS
            </h3>
          </div>

          {/* Rotation speed */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Helix Spin Velocity:</span>
              <span className="text-teal-400 font-bold">{rotationSpeed}x</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={3}
              step={0.1}
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          {/* Target Base Pair 7 Mutation status */}
          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-bold">NODE #7: G-C MISPAIR</span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-bold uppercase", sequence[6]?.mutated ? "bg-red-500/20 text-red-400" : "bg-teal-500/20 text-teal-300")}>
                {sequence[6]?.mutated ? 'MUTATION DETECTED' : 'CORRECTED'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Target sequence gRNA (sgRNA-Bharat) guide sequence ready for targeted double-stranded break.
            </p>
          </div>

          {/* CRISPR Execution Action */}
          <button
            onClick={handleTriggerCrispr}
            disabled={cas9Active && !sequence[6]?.mutated}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-600 text-black font-bold tracking-wider text-xs shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center justify-center space-x-2 transition-all"
          >
            <Scissors className="w-4 h-4" />
            <span>DEPLOY CRISPR-CAS9 NANO-EDIT</span>
          </button>

          <button
            onClick={handleReset}
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESET HELICAL SEQUENCE</span>
          </button>
        </div>
      </div>
    </div>
  );
}
