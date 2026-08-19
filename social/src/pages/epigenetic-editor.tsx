import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Dna
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function EpigeneticEditor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mode, setMode] = useState<'TET1_Eraser' | 'DNMT3A_Writer'>('TET1_Eraser');
  const [cpgCount, setCpgCount] = useState(8); // 8 CpG sites in promoter island
  const [reprogrammed, setReprogrammed] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerEpigeneticEdit = () => {
    uiaudio.warp();
    setReprogrammed(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setReprogrammed(false);
  };

  // Epigenetic Editor Complex & Methylation State Canvas
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

      // Target Gene Promoter CpG Island DNA
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, cy + 20); ctx.lineTo(canvas.width - 60, cy + 20);
      ctx.stroke();

      // dCas9 (Dead Cas9) Targeting Scaffold in Emerald
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx - 40, cy - 10, 70, 50, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Fused Epigenetic Effector Domain (TET1 Demethylase in Cyan OR DNMT3A Methyltransferase in Rose)
      ctx.fillStyle = mode === 'TET1_Eraser' ? 'rgba(6, 182, 212, 0.45)' : 'rgba(244, 63, 94, 0.45)';
      ctx.strokeStyle = mode === 'TET1_Eraser' ? '#06b6d4' : '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = mode === 'TET1_Eraser' ? '#06b6d4' : '#f43f5e';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(cx + 60, cy - 20, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // CpG Island Methylation Flags (Lollipops along DNA)
      for (let i = 0; i < cpgCount; i++) {
        const lx = cx - 180 + i * 45;
        const ly = cy + 20;

        // In TET1 mode: initially methylated (red), becomes demethylated (green)
        // In DNMT3A mode: initially unmethylated (green), becomes methylated (red)
        let isMethylated = false;
        if (mode === 'TET1_Eraser') {
          isMethylated = !reprogrammed;
        } else {
          isMethylated = reprogrammed;
        }

        // Lollipop Stick
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - 35);
        ctx.stroke();

        // Lollipop Head (Red = 5mC Silenced, Green = C Active)
        ctx.fillStyle = isMethylated ? '#ef4444' : '#22c55e';
        ctx.shadowColor = isMethylated ? '#ef4444' : '#22c55e';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(lx, ly - 35, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [reprogrammed, mode, cpgCount]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Scissors className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                EPIGENETIC EDITOR // dCas9-TET1 & DNMT3A CpG REPROGRAMMING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ZERO DNA SEQUENCE ALTERATIONS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              5-methylcytosine demethylation (ON) & de novo methylation (OFF) for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerEpigeneticEdit}
            disabled={reprogrammed}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{reprogrammed ? 'EPIGENETIC STATE STABLY CONVERTED' : (mode === 'TET1_Eraser' ? 'ERASE CpG METHYLATION (ACTIVATE)' : 'INSTALL CpG METHYLATION (SILENCE)')}</span>
          </button>

          {reprogrammed && (
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
              <span className="text-emerald-400 font-bold">EFFECTOR: {mode === 'TET1_Eraser' ? 'dCas9-TET1 (Demethylase)' : 'dCas9-DNMT3A (Methyltransferase)'}</span>
              <span className="text-cyan-400 font-bold">CpG ISLAND: {cpgCount} Sites</span>
            </div>
            <div>STATUS: {reprogrammed ? 'GENE EXPRESSION STABLY ALTERED' : 'EPIGENOMIC LOCUS BOUND'}</div>
          </div>
        </div>

        {/* Epigenetic Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            EPIGENETIC TOOLKIT
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setMode('TET1_Eraser');
                setReprogrammed(false);
              }}
              className={cn("w-full p-3 rounded-xl border text-left transition-all", mode === 'TET1_Eraser' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
            >
              <div className="font-bold">dCas9-TET1 (Eraser)</div>
              <div className="text-[10px] text-zinc-400">Demethylates 5mC → C (Turns Genes ON)</div>
            </button>

            <button
              onClick={() => {
                setMode('DNMT3A_Writer');
                setReprogrammed(false);
              }}
              className={cn("w-full p-3 rounded-xl border text-left transition-all", mode === 'DNMT3A_Writer' ? "bg-rose-500/20 border-rose-400 text-rose-200" : "bg-zinc-950 border-white/5 text-zinc-400")}
            >
              <div className="font-bold">dCas9-DNMT3A (Writer)</div>
              <div className="text-[10px] text-zinc-400">De novo 5mC Methylation (Turns Genes OFF)</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Heritable Memory:</strong> Epigenetic marks are faithfully copied during cell division without mutating a single base pair of DNA!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
