import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, GitMerge
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Sy14Fusion() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [chromosomeCount, setChromosomeCount] = useState(16); // 16 -> 8 -> 4 -> 2 -> 1 (SY14 super-chromosome)
  const [fusing, setFusing] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerChromosomeFusion = () => {
    uiaudio.warp();
    setFusing(true);

    const interval = setInterval(() => {
      setChromosomeCount(c => {
        if (c <= 1) {
          clearInterval(interval);
          setFusing(false);
          uiaudio.success();
          return 1;
        }
        return Math.floor(c / 2);
      });
    }, 400);
  };

  const handleReset = () => {
    uiaudio.click();
    setChromosomeCount(16);
    setFusing(false);
  };

  // 16 to 1 Chromosome Telomere-to-Telomere Fusion Canvas
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

      // Dark Nucleus Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Yeast Nuclear Envelope Membrane
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 190, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Chromosomes in Nucleus
      for (let i = 0; i < chromosomeCount; i++) {
        const angle = (i / chromosomeCount) * Math.PI * 2 + time * 0.2;
        const rad = 110;
        const chX = cx + Math.cos(angle) * rad;
        const chY = cy + Math.sin(angle) * rad;

        // Chromosome length scales as they fuse together
        const chLength = (16 / chromosomeCount) * 14;

        ctx.strokeStyle = chromosomeCount === 1 ? '#ec4899' : '#06b6d4';
        ctx.lineWidth = 6;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = fusing ? 18 : 6;
        ctx.beginPath();
        ctx.moveTo(chX - chLength, chY);
        ctx.lineTo(chX + chLength, chY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Centromere (Single Active Centromere CEN)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(chX, chY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (chromosomeCount === 1) {
        ctx.fillText('SINGLE SUPER-CHROMOSOME SY14: 12.5 Mb INTEGRATED YEAST GENOME (VIABLE)', 100, cy + 160);
      } else {
        ctx.fillText(`NATURAL / INTERMEDIATE STATE: ${chromosomeCount} DISTINCT CHROMOSOMES`, 160, cy + 160);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [chromosomeCount, fusing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <GitMerge className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-indigo-300 to-cyan-400">
                SYNTHETIC CHROMOSOME FUSION // SY14 SUPER-CHROMOSOME
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                16 TO 1 EUKARYOTE FUSION (CAS / BOEKE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              CRISPR-guided telomere fusion & centromere elimination for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerChromosomeFusion}
            disabled={fusing || chromosomeCount <= 1}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{fusing ? 'FUSING CHROMOSOMES 16 → 1...' : 'COMMENCE 16-TO-1 CRISPR FUSION'}</span>
          </button>

          {chromosomeCount < 16 && (
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
              <span className="text-pink-400 font-bold">CHROMOSOMES: {chromosomeCount} / 16</span>
              <span className="text-cyan-400 font-bold">DELETED CENTROMERES: {16 - chromosomeCount}</span>
            </div>
            <div>STATUS: {chromosomeCount === 1 ? 'FUNCTIONAL SINGLE-CHROMOSOME YEAST VIABLE' : 'PARTIALLY FUSED'}</div>
          </div>
        </div>

        {/* Sy14 Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            GENOME PLASTICITY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Telomere-Centromere Deletion:</strong> Successive end-to-end fusion requires deleting intervening telomeres and all centromeres except one to avoid dicentric chromosome breakage!</div>
            <div>• <strong>Identical Gene Expression:</strong> Despite reorganizing 3D chromosomal architecture from 16 units into 1, the yeast transcriptome and growth phenotype remain remarkably normal!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
