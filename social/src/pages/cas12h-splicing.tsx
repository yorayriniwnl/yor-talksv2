import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, GitFork, RefreshCw
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12hSplicing() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dualGuideMode, setDualGuideMode] = useState<'crRNA_tracrRNA_Hybrid' | 'Single_Engineered_sgRNA'>('crRNA_tracrRNA_Hybrid');
  const [splicingInclusionRatio, setSplicingInclusionRatio] = useState(18); // 18% -> 94.5%
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [targetExonNumber, setTargetExonNumber] = useState(4); // Exon 4 inclusion

  const animFrameRef = useRef<number | null>(null);

  const triggerSplicingRedirection = () => {
    uiaudio.warp();
    setIsRedirecting(true);

    setTimeout(() => {
      setIsRedirecting(false);
      setSplicingInclusionRatio(94.8);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setSplicingInclusionRatio(18);
    setIsRedirecting(false);
  };

  // CRISPR-Cas12h Dual-RNA Splicing Modulation Canvas
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

      // Pre-mRNA Transcript Exons & Introns (Top: 80 to 660, cy - 65)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy - 65); ctx.lineTo(canvas.width - 80, cy - 65);
      ctx.stroke();

      // Exon 3, Exon 4 (Target), Exon 5
      const exons = [
        { name: 'Exon 3', x: 140, included: true, color: '#38bdf8' },
        { name: 'Exon 4', x: 370, included: splicingInclusionRatio > 50, color: splicingInclusionRatio > 50 ? '#22c55e' : '#64748b' },
        { name: 'Exon 5', x: 600, included: true, color: '#38bdf8' }
      ];

      exons.forEach((ex) => {
        ctx.fillStyle = ex.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(ex.x - 45, cy - 85, 90, 40);
        ctx.strokeRect(ex.x - 45, cy - 85, 90, 40);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(ex.name, ex.x - 22, cy - 60);
      });

      // Hyper-Compact Cas12h Dual-RNA Effector (Center at 370, cy + 35)
      ctx.fillStyle = '#a855f7';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isRedirecting ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy + 35, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cas12h', 350, cy + 38);

      // Connecting Dual crRNA / tracrRNA Arms
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(370, cy + 11); ctx.lineTo(370, cy - 45);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12h SPLICING: ${dualGuideMode} | EXON 4 INCLUSION = ${splicingInclusionRatio}% | THERAPEUTIC ISOFORM ACTIVE`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dualGuideMode, splicingInclusionRatio, targetExonNumber, isRedirecting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <GitFork className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                CRISPR-CAS12H // DUAL-RNA NUCLEASE & ALTERNATIVE SPLICING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                KOONIN & FENG ZHANG (NCBI & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Dual crRNA/tracrRNA guidance & therapeutic pre-mRNA splicing redirection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerSplicingRedirection}
            disabled={isRedirecting || splicingInclusionRatio > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isRedirecting ? 'REDIRECTING SPLICOSOME...' : 'REDIRECT ALTERNATIVE SPLICING'}</span>
          </button>

          {splicingInclusionRatio > 50 && (
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
              <span className="text-purple-400 font-bold">GUIDE: {dualGuideMode}</span>
              <span className="text-cyan-400 font-bold">TARGET: Exon {targetExonNumber}</span>
              <span className="text-emerald-400 font-bold">INCLUSION: {splicingInclusionRatio}%</span>
            </div>
            <div>STATUS: {splicingInclusionRatio > 50 ? 'FULL-LENGTH ISOFORM EXPRESSED' : 'EXON SKIPPED'}</div>
          </div>
        </div>

        {/* Cas12h Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SPLICING MODULATION
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dual-RNA Architecture:</strong> Unlike single-guide Cas12a, Cas12h naturally uses both crRNA and tracrRNA, enabling distinct regulatory control over RNA binding vs DNA cleavage!</div>
            <div>• <strong>Spliceosome Steric Hindrance:</strong> Targeting dCas12h to intronic splice silencer/enhancer elements modulates exon inclusion without altering genomic sequences!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
