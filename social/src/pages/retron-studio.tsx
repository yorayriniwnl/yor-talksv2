import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RetronStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [msDnaDonorCopies, setMsDnaDonorCopies] = useState(1400); // 1,400 msDNA copies per cell
  const [recombineeringRate, setRecombineeringRate] = useState(68.4); // 68.4% HDR rate
  const [isSynthesized, setIsSynthesized] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerRetronSynthesis = () => {
    uiaudio.warp();
    setIsSynthesized(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setIsSynthesized(false);
  };

  // Bacterial Retron msDNA Synthesis & Recombineering Canvas
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

      // Dark Cellular Cytoplasm Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Bacterial Host Genomic DNA (Cyan Line at bottom)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, cy + 90); ctx.lineTo(canvas.width - 60, cy + 90);
      ctx.stroke();

      // Retron Operon mRNA (msr-msd hairpin RNA template in Top Left)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(100, cy - 80);
      ctx.quadraticCurveTo(cx - 100, cy - 130, cx - 40, cy - 80);
      ctx.stroke();

      // Retron Reverse Transcriptase (RT-Ta) Protein Complex (Magenta Globe)
      ctx.fillStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(cx - 40, cy - 40, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 2'-5' Phosphodiester Branched msDNA (Single-Stranded Donor in Emerald)
      if (isSynthesized) {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 15;

        // Branched msDNA Loop
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy - 40);
        ctx.quadraticCurveTo(cx + 80, cy - 60, cx + 120, cy + 30);
        ctx.lineTo(cx + 40, cy + 90);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // CRISPR/Lambda-Red Recombination Node at Genome Locus
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx + 40, cy + 90, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('CONTINUOUS IN VIVO RECOMBINEERING', cx + 60, cy + 80);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isSynthesized]);

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
                CRISPR-RETRON // CONTINUOUS IN VIVO msDNA DONOR SYNTHESIS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                NO EXOGENOUS OLIGOS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Bacterial reverse transcriptase 2'-5' branched ssDNA generation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerRetronSynthesis}
            disabled={isSynthesized}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSynthesized ? 'CONTINUOUS msDNA DONORS PRODUCED (1,400/CELL)' : 'EXPRESS RETRON RT OPERON'}</span>
          </button>

          {isSynthesized && (
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
              <span className="text-emerald-400 font-bold">msDNA COPIES: {msDnaDonorCopies} / cell</span>
              <span className="text-cyan-400 font-bold">RECOMBINEERING: {recombineeringRate}% HDR</span>
            </div>
            <div>STATUS: {isSynthesized ? 'CONTINUOUS MUTAGENESIS RECOMBINEERING' : 'RETRON PLASMID READY'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            RETRON BIOTECH
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Natural ssDNA Factories:</strong> Retrons naturally produce thousands of multicopy single-stranded DNA (msDNA) molecules inside living bacteria.</div>
            <div>• <strong>High-Throughput Evolution:</strong> By encoding donor repair sequences into the retron RNA, cells autonomously synthesize their own repair templates, enabling continuous directed evolution!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
