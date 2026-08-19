import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, Layers, Award
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MinimalCell() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [totalGenes, setTotalGenes] = useState(473); // 473 essential genes (JCVI-syn3.0)
  const [genomeBasePairs, setGenomeBasePairs] = useState(531560); // 531,560 bp
  const [unknownFunctionGenes, setUnknownFunctionGenes] = useState(149); // 149 essential genes of unknown function
  const [divisionDoublingMin, setDivisionDoublingMin] = useState(180); // 3 hours

  const animFrameRef = useRef<number | null>(null);

  // Minimal Cell Membrane & Circular Genome Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Cellular Matrix
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Spherical Lipid Bilayer Membrane (400nm minimal sphere)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 170, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Circular Synthetic Chromosome Ring (Center DNA ring 531kbp)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.stroke();

      // Essential Functional Gene Blocks on Chromosome (Colors by function)
      // 1. Genetic Info (Red, 240 genes)
      // 2. Metabolism (Yellow, 84 genes)
      // 3. Membrane (Cyan, 81 genes)
      // 4. Unknown function (Purple, 149 genes)
      const geneBlocks = [
        { color: '#ef4444', count: 240, label: 'Genetic Info' },
        { color: '#f59e0b', count: 84, label: 'Metabolism' },
        { color: '#06b6d4', count: 81, label: 'Cell Membrane' },
        { color: '#a855f7', count: 149, label: 'Unknown Function' },
      ];

      let curAngle = 0;
      geneBlocks.forEach((block) => {
        const span = (block.count / totalGenes) * Math.PI * 2;
        ctx.strokeStyle = block.color;
        ctx.lineWidth = 7;
        ctx.shadowColor = block.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cx, cy, 80, curAngle, curAngle + span);
        ctx.stroke();
        ctx.shadowBlur = 0;
        curAngle += span;
      });

      // Metabolite & Ribosome Diffusing Particles inside cytoplasm
      for (let i = 0; i < 20; i++) {
        const ang = (i / 20) * Math.PI * 2 + time * 0.5;
        const rad = 110 + 35 * Math.sin(time + i);
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;

        ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [totalGenes]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Dna className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                JCVI-syn3.0 // MINIMAL SYNTHETIC GENOME CELL
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                473 ESSENTIAL GENES
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Craig Venter 531 kbp synthetic organism & essential life metabolic core for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">GENOME SIZE</div>
            <div className="text-xl font-bold text-emerald-400">531,560 <span className="text-xs">BASE PAIRS</span></div>
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
              <span className="text-emerald-400 font-bold">TOTAL GENES: {totalGenes}</span>
              <span className="text-purple-400 font-bold">UNKNOWN FUNCTION: {unknownFunctionGenes} (31%)</span>
            </div>
            <div>STATUS: AUTONOMOUS VIABLE REPLICATION (180 MIN)</div>
          </div>
        </div>

        {/* Genome Breakdown (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ESSENTIAL GENOMICS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hutchison & Venter Science 2016:</strong> Smaller genome than any autonomously replicating cell found in nature.</div>
            <div>• <strong>Biological Mystery:</strong> 149 essential genes (31% of the entire genome) have completely unknown biological functions, yet the cell cannot survive without them!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
