import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Lock, Unlock
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CrisproffStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [epigeneticState, setEpigeneticState] = useState<'Active_Unmethylated' | 'Silenced_CRISPRoff'>('Active_Unmethylated');
  const [cpgMethylationPercent, setCpgMethylationPercent] = useState(4); // 4% basal -> 98% silenced
  const [isRemodeling, setIsRemodeling] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCrisproffSilencing = () => {
    uiaudio.warp();
    setIsRemodeling(true);

    setTimeout(() => {
      setIsRemodeling(false);
      setEpigeneticState('Silenced_CRISPRoff');
      setCpgMethylationPercent(98);
      uiaudio.success();
    }, 850);
  };

  const triggerCrispronReactivation = () => {
    uiaudio.warp();
    setIsRemodeling(true);

    setTimeout(() => {
      setIsRemodeling(false);
      setEpigeneticState('Active_Unmethylated');
      setCpgMethylationPercent(4);
      uiaudio.success();
    }, 850);
  };

  // CRISPRoff Epigenetic CpG Methylation & Heterochromatin Canvas
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

      // Dark Nuclear Matrix Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // DNA Double Helix Backbone (Center Horizontal Strand)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(canvas.width - 80, cy);
      ctx.stroke();

      // CpG Island Promoter Cytosines (8 Sites along DNA)
      for (let i = 0; i < 8; i++) {
        const x = 120 + i * 65;
        const isMethylated = epigeneticState === 'Silenced_CRISPRoff';

        // Cytosine Base Node
        ctx.fillStyle = isMethylated ? '#ef4444' : '#22c55e';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isMethylated ? 12 : 4;
        ctx.beginPath();
        ctx.arc(x, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 5-Methylcytosine (-CH3) Flag Marker if Silenced
        if (isMethylated) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, cy); ctx.lineTo(x, cy - 35);
          ctx.stroke();

          ctx.fillStyle = '#ef4444';
          ctx.fillRect(x - 12, cy - 45, 24, 12);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('meCpG', x - 11, cy - 36);
        }

        // Histone Octamer Beads (H3K9me3 closed heterochromatin or open euchromatin)
        const histY = cy + 45;
        ctx.fillStyle = isMethylated ? '#475569' : '#06b6d4';
        ctx.beginPath();
        ctx.arc(x, histY, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (epigeneticState === 'Silenced_CRISPRoff') {
        ctx.fillText('CRISPRoff: DENSE 5-METHYLCYTOSINE (98%) + CONDENSED HETEROCHROMATIN (HERITABLE SILENCING)', 60, cy + 115);
      } else {
        ctx.fillText('CRISPRon: DEMETHYLATED CpG ISLAND + OPEN EUCHROMATIN (ACTIVE TRANSCRIPTION)', 90, cy + 115);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [epigeneticState, cpgMethylationPercent]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Lock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-indigo-300 to-cyan-400">
                CRISPROFF // PROGRAMMABLE EPIGENETIC SILENCING & REACTIVATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                WEISSMAN LAB (MIT / WHITEHEAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              dCas9-Dnmt3A/Dnmt3L CpG methylation & heritable chromatin memory for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          {epigeneticState === 'Active_Unmethylated' ? (
            <button
              onClick={triggerCrisproffSilencing}
              disabled={isRemodeling}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-red-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>{isRemodeling ? 'DEPOSITING CpG METHYLATION...' : 'EXECUTE CRISPROFF (SILENCE GENE)'}</span>
            </button>
          ) : (
            <button
              onClick={triggerCrispronReactivation}
              disabled={isRemodeling}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
            >
              <Unlock className="w-4 h-4" />
              <span>{isRemodeling ? 'DEMETHYLATING CpG ISLAND...' : 'EXECUTE CRISPRON (REACTIVATE)'}</span>
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
              <span className="text-pink-400 font-bold">STATE: {epigeneticState}</span>
              <span className="text-cyan-400 font-bold">CpG METHYLATION: {cpgMethylationPercent}%</span>
            </div>
            <div>STATUS: {epigeneticState === 'Silenced_CRISPRoff' ? 'HERITABLE EPIGENETIC SILENCING (50+ DIVISIONS)' : 'EXPRESSING'}</div>
          </div>
        </div>

        {/* Epigenetics Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            EPIGENETIC MEMORY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No DNA Cleavage:</strong> Unlike Cas9 nucleases which cause double-strand breaks, CRISPRoff writes persistent epigenetic memory marks without altering the underlying DNA sequence!</div>
            <div>• <strong>Multi-Generational Inheritance:</strong> Endogenous DNMT1 maintains the deposited CpG methylation pattern through hundreds of mitotic cell divisions!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
