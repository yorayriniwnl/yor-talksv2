import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, Split
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12uSplice() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [skippedExonNumber, setSkippedExonNumber] = useState(51); // Exon 51 (Duchenne Muscular Dystrophy)
  const [exonSkippingEfficiency, setExonSkippingEfficiency] = useState(30); // 30% -> 99.1%
  const [isSpliceSwitching, setIsSpliceSwitching] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12uExonSkipping = () => {
    uiaudio.warp();
    setIsSpliceSwitching(true);

    setTimeout(() => {
      setIsSpliceSwitching(false);
      setExonSkippingEfficiency(99.1);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setExonSkippingEfficiency(30);
    setIsSpliceSwitching(false);
  };

  // CRISPR-Cas12u (Type V-U, 310-aa) Pre-mRNA Spliceosome Redirection Canvas
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

      // Pre-mRNA Transcript Backbone (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // Exon 50 (Green Normal Exon)
      ctx.fillStyle = '#10b981';
      ctx.fillRect(100, cy - 58, 90, 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('EXON 50', 122, cy - 36);

      // Exon 51 (Mutant Target Exon Being Skipped)
      const isSkipped = exonSkippingEfficiency > 50;
      ctx.fillStyle = isSkipped ? 'rgba(239, 68, 68, 0.25)' : '#ef4444';
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillRect(270, cy - 58, 120, 36);
      ctx.strokeRect(270, cy - 58, 120, 36);

      ctx.fillStyle = isSkipped ? '#94a3b8' : '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(
        isSkipped ? `[EXON ${skippedExonNumber} SKIPPED]` : `MUTANT EXON ${skippedExonNumber}`,
        282,
        cy - 36
      );

      // Exon 52 (Green Normal Exon)
      ctx.fillStyle = '#10b981';
      ctx.fillRect(470, cy - 58, 90, 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('EXON 52', 492, cy - 36);

      // Splice Spliceosome Looping Splicing Arch (Overhead Arc)
      ctx.strokeStyle = isSkipped ? '#22c55e' : '#64748b';
      ctx.lineWidth = 3;
      ctx.setLineDash(isSkipped ? [] : [6, 6]);
      ctx.beginPath();
      ctx.moveTo(190, cy - 58);
      ctx.bezierCurveTo(280, cy - 130, 380, cy - 130, 470, cy - 58);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ultra-Compact Cas12u Micro-Monomer (310-aa) at Splice Acceptor (330, cy + 30)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isSpliceSwitching ? 24 : 8;
      ctx.beginPath();
      ctx.arc(330, cy + 30, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Cas12u', 312, cy + 33);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12u (Type V-U, 310-aa): TARGET EXON = ${skippedExonNumber} | EXON SKIPPING EFFICIENCY = ${exonSkippingEfficiency}% (DOUDNA & DAVID LIU)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [skippedExonNumber, exonSkippingEfficiency, isSpliceSwitching]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Split className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12U // 310-aa EXON SKIPPING SUITE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA & DAVID LIU (UC BERKELEY & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              World smallest CRISPR effector (310-aa) for non-cleaving pre-mRNA splice switching for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12uExonSkipping}
            disabled={isSpliceSwitching || exonSkippingEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSpliceSwitching ? 'REDIRECTING SPLICEOSOME...' : 'EXECUTE EXON SKIPPING'}</span>
          </button>

          {exonSkippingEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 310-aa (SMALLEST MICRO-EFFECTOR)</span>
              <span className="text-cyan-400 font-bold">TARGET: EXON {skippedExonNumber}</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {exonSkippingEfficiency}%</span>
            </div>
            <div>STATUS: {exonSkippingEfficiency > 50 ? 'READING FRAME RESTORED (DYSTROPHIN POSITIVE)' : 'FRAMESHIFT MUTATION'}</div>
          </div>
        </div>

        {/* Cas12u Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SPLICE EDITOR PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hyper-Miniature 310-aa Domain:</strong> Smallest known Type V-U nuclease easily packages alongside multi-crRNA guides inside standard AAV serotypes!</div>
            <div>• <strong>Transcript-Level Splice Redirection:</strong> Sterically blocks pre-mRNA splice acceptor sites without cutting DNA, eliminating permanent genomic off-target mutations!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
