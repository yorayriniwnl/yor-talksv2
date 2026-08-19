import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, Orbit, Repeat
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12zetaCircularizer() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [chromosomeSizeKilobases, setChromosomeSizeKilobases] = useState(120); // 120 kb synthetic chromosome
  const [circularizationFidelity, setCircularizationFidelity] = useState(24); // 24% -> 99.9%
  const [isCircularizing, setIsCircularizing] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12zetaCircularization = () => {
    uiaudio.warp();
    setIsCircularizing(true);

    setTimeout(() => {
      setIsCircularizing(false);
      setCircularizationFidelity(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setCircularizationFidelity(24);
    setIsCircularizing(false);
  };

  // CRISPR-Cas12zeta (Type V-Zeta, 115-aa) Chromosome Circularization Canvas
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

      // Dark Cellular Genetic Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const isCircular = circularizationFidelity > 50;

      if (!isCircular) {
        // Linear Synthetic Chromosome (80 to 620, cy)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, cy); ctx.lineTo(620, cy);
        ctx.stroke();

        // Exposed Telomeric Ends
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(80, cy, 6, 0, Math.PI * 2);
        ctx.arc(620, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`LINEAR ${chromosomeSizeKilobases}kb SYNTHETIC CHROMOSOME (EXPOSED TELOMERES)`, 150, cy - 25);
      } else {
        // Seamless Circular Minichromosome (Radius 90 at cx, cy)
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(cx, cy, 90, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`CIRCULAR ${chromosomeSizeKilobases}kb MINICHROMOSOME (ENDLESS REPLICATION)`, cx - 160, cy - 105);
      }

      // Ultra-Miniature Cas12zeta Monomer (115-aa) at Ligation Junction
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isCircularizing ? 24 : 8;
      ctx.beginPath();
      ctx.arc(isCircular ? cx : 350, isCircular ? cy - 90 : cy + 30, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Cas12ζ', (isCircular ? cx : 350) - 12, (isCircular ? cy - 90 : cy + 30) + 2.5);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12ζ (Type V-Zeta, 115-aa): CHR SIZE = ${chromosomeSizeKilobases} kb | CIRCULARIZATION = ${circularizationFidelity}% (DOUDNA & PATRICK HSU)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [chromosomeSizeKilobases, circularizationFidelity, isCircularizing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Repeat className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12ζ // 115-aa CHROMOSOME CIRCULARIZER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, FENG ZHANG & PATRICK HSU (ARC & UC BERKELEY)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-120-aa historic record micro-effector & telomeric circularization for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12zetaCircularization}
            disabled={isCircularizing || circularizationFidelity > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCircularizing ? 'CIRCULARIZING 120 kb CHR...' : 'CIRCULARIZE CHROMOSOME'}</span>
          </button>

          {circularizationFidelity > 50 && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
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
              <span className="text-pink-400 font-bold">SIZE: 115-aa (SUB-120-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">CHR: {chromosomeSizeKilobases} kb</span>
              <span className="text-emerald-400 font-bold">CIRCULARIZATION: {circularizationFidelity}%</span>
            </div>
            <div>STATUS: {circularizationFidelity > 50 ? 'ENDLESS ROLLING CIRCLE MINICHROMOSOME FORMED' : 'TELOMERIC JOINING COMPLEX READY'}</div>
          </div>
        </div>

        {/* Cas12zeta Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CHROMOSOME CIRCULARIZER
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>115-aa Micro-Ligase Effector:</strong> Cas12ζ smashes previous protein size limits (115-aa), guiding micro-homology end-joining between chromosomal telomeres with zero sequence degradation!</div>
            <div>• <strong>Rolling-Circle Amplification:</strong> Circularized synthetic minichromosomes achieve 1,000x rolling-circle copy numbers, driving high-yield biomanufacturing without plasmid loss!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
