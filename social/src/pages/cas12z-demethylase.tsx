import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, Stamp, Sun
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12zDemethylase() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [demethylatedCpgCount, setDemethylatedCpgCount] = useState(8); // 8 CpG sites
  const [demethylationEfficiency, setDemethylationEfficiency] = useState(24); // 24% -> 99.7%
  const [isDemethylating, setIsDemethylating] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12zDemethylation = () => {
    uiaudio.warp();
    setIsDemethylating(true);

    setTimeout(() => {
      setIsDemethylating(false);
      setDemethylationEfficiency(99.7);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setDemethylationEfficiency(24);
    setIsDemethylating(false);
  };

  // CRISPR-Cas12z (Type V-Z, 230-aa) Epigenetic Demethylation Canvas
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

      // Host Epigenetic Promoter DNA Strand (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // CpG Island Epigenetic Demethylation Window
      const numCpG = demethylatedCpgCount;
      const isDemethylated = demethylationEfficiency > 50;

      for (let i = 0; i < numCpG; i++) {
        const bx = 120 + i * 65;

        // Base Box
        ctx.fillStyle = isDemethylated ? '#22c55e' : '#ec4899';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(bx - 18, cy - 58, 36, 36);
        ctx.strokeRect(bx - 18, cy - 58, 36, 36);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(isDemethylated ? 'CpG' : '5mC', bx - 10, cy - 36);

        // Demethylation Oxidation Tag (5hmC / Active)
        if (isDemethylated) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(bx, cy - 70, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.font = 'bold 6px monospace';
          ctx.fillText('OH', bx - 4, cy - 68);
        }
      }

      // Ultra-Miniature Cas12z-TET1 Effector (230-aa) at Target (340, cy + 35)
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isDemethylating ? 24 : 8;
      ctx.beginPath();
      ctx.arc(340, cy + 35, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Cas12z', 324, cy + 38);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12z (Type V-Z, 230-aa): CpG SITES = ${demethylatedCpgCount} | DEMETHYLATION EFFICIENCY = ${demethylationEfficiency}% (DOUDNA & STANLEY QI)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [demethylatedCpgCount, demethylationEfficiency, isDemethylating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Sun className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-amber-400">
                CRISPR-CAS12Z // 230-aa EPIGENETIC DEMETHYLASE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA & STANLEY QI (UC BERKELEY & STANFORD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Record-breaking 230-aa micro-effector & TET1 CpG demethylation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12zDemethylation}
            disabled={isDemethylating || demethylationEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDemethylating ? 'OXIDIZING 5mC BASES...' : 'REACTIVATE VIA DEMETHYLATION'}</span>
          </button>

          {demethylationEfficiency > 50 && (
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
              <span className="text-cyan-400 font-bold">SIZE: 230-aa (ALL-TIME RECORD MINIATURIZATION)</span>
              <span className="text-pink-400 font-bold">CpG SITES: {demethylatedCpgCount}</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {demethylationEfficiency}%</span>
            </div>
            <div>STATUS: {demethylationEfficiency > 50 ? 'TARGETED 5mC TO 5hmC ACTIVATION COMPLETE' : 'PRE-DEMETHYLATION COMPLEX READY'}</div>
          </div>
        </div>

        {/* Cas12z Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            DEMETHYLASE PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>230-aa Micro-Effector:</strong> Cas12z establishes the absolute record for the smallest known CRISPR endonuclease (230-aa), allowing complete multi-domain epigenetic TET1 activators to fit into a single AAV!</div>
            <div>• <strong>Active Epigenetic Reactivation:</strong> Iteratively oxidizes silenced 5mC into 5hmC, turning silenced tumor suppressors and therapeutic genes back on without any DNA cleavage!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
