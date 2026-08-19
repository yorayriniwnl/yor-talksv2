import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, Stamp
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12wMethylome() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [targetCpgIslandsCount, setTargetCpgIslandsCount] = useState(8); // 8 CpG dinucleotide sites
  const [methylationEfficiency, setMethylationEfficiency] = useState(24); // 24% -> 99.4%
  const [isMethylating, setIsMethylating] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12wMethylation = () => {
    uiaudio.warp();
    setIsMethylating(true);

    setTimeout(() => {
      setIsMethylating(false);
      setMethylationEfficiency(99.4);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setMethylationEfficiency(24);
    setIsMethylating(false);
  };

  // CRISPR-Cas12w (Type V-W, 275-aa) Targeted 5mC Epigenetic Methylation Canvas
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

      // Dark Cellular Nucleus Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Host Genomic DNA Promoter Strand (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // CpG Island Dinucleotide Markers
      const numCpG = targetCpgIslandsCount;
      const isMethylated = methylationEfficiency > 50;

      for (let i = 0; i < numCpG; i++) {
        const cpx = 120 + i * 65;

        // DNA Base Node
        ctx.fillStyle = isMethylated ? '#a855f7' : '#334155';
        ctx.strokeStyle = isMethylated ? '#ec4899' : '#64748b';
        ctx.lineWidth = 2;
        ctx.fillRect(cpx - 16, cy - 58, 32, 36);
        ctx.strokeRect(cpx - 16, cy - 58, 32, 36);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('CpG', cpx - 10, cy - 36);

        // 5mC Methyl Flag Badge (Top)
        if (isMethylated) {
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(cpx, cy - 70, 7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7px monospace';
          ctx.fillText('Me', cpx - 4, cy - 68);
        }
      }

      // Ultra-Miniature Cas12w-DNMT3A Monomer (275-aa) at Promoter (340, cy + 35)
      ctx.fillStyle = '#a855f7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isMethylating ? 24 : 8;
      ctx.beginPath();
      ctx.arc(340, cy + 35, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Cas12w', 322, cy + 38);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12w (Type V-W, 275-aa): CpG SITES = ${targetCpgIslandsCount} | 5mC METHYLATION EFFICIENCY = ${methylationEfficiency}% (DOUDNA & STANLEY QI)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetCpgIslandsCount, methylationEfficiency, isMethylating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Stamp className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                CRISPR-CAS12W // 275-aa EPIGENETIC METHYLTRANSFERASE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                DOUDNA & STANLEY QI (UC BERKELEY & STANFORD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              World smallest CRISPR nuclease (275-aa) & heritable 5mC oncogenic silencing for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12wMethylation}
            disabled={isMethylating || methylationEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isMethylating ? 'DEPOSITING 5mC MARKS...' : 'METHYLATE CPG ISLANDS'}</span>
          </button>

          {methylationEfficiency > 50 && (
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
              <span className="text-purple-400 font-bold">SIZE: 275-aa (RECORD MINIATURIZATION)</span>
              <span className="text-pink-400 font-bold">CpG SITES: {targetCpgIslandsCount}</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {methylationEfficiency}%</span>
            </div>
            <div>STATUS: {methylationEfficiency > 50 ? 'HERITABLE 5mC PROMOTER SILENCING ACTIVE' : 'UNMETHYLATED ACTIVE PROMOTER'}</div>
          </div>
        </div>

        {/* Cas12w Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            EPIGENOME PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Record 275-aa Architecture:</strong> The ultra-compact Cas12w leaves over 3.5 kb of spare cargo room in AAV capsids for large DNMT3A/3L and KRAB repressor fusions!</div>
            <div>• <strong>Heritable Epigenetic Memory:</strong> Establishes permanent, transmissible 5mC DNA methylation marks that repress target oncogene transcription across cellular generations without DNA cuts!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
