import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Zap, Play, RotateCcw, Activity, 
  Sliders, ShieldCheck, CheckCircle2, Award, Dna
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CrisprActivator() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [expressionFoldChange, setExpressionFoldChange] = useState(120); // 120x overexpression
  const [promoterDistanceBp, setPromoterDistanceBp] = useState(-150); // -150 bp upstream of TSS
  const [isActivated, setIsActivated] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerActivation = () => {
    uiaudio.warp();
    setIsActivated(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setIsActivated(false);
  };

  // dCas9-VPR Transcriptional Activator Canvas
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

      // Target Genomic Promoter DNA (Double Helix Line)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, cy); ctx.lineTo(canvas.width - 60, cy);
      ctx.stroke();

      // Transcription Start Site (TSS) Flag at cx + 120
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + 120, cy);
      ctx.lineTo(cx + 120, cy - 50);
      ctx.lineTo(cx + 160, cy - 50);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = '10px monospace';
      ctx.fillText('+1 TSS', cx + 125, cy - 55);

      // Dead Cas9 (dCas9 D10A/H840A) Protein Complex (Emerald)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx - 60, cy, 75, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Tripartite VPR Domain (VP64 - p65 - Rta) fused to C-terminus (Magenta/Purple Lobes)
      const vprColors = ['#ec4899', '#d946ef', '#a855f7'];
      const vprNames = ['VP64', 'p65', 'Rta'];

      for (let i = 0; i < 3; i++) {
        const vx = cx - 90 + i * 35;
        const vy = cy - 65;

        ctx.fillStyle = vprColors[i];
        ctx.shadowColor = vprColors[i];
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(vx, vy, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = '8px monospace';
        ctx.fillText(vprNames[i], vx - 10, vy + 3);
      }

      // Recruited RNA Polymerase II Complex upon Activation (Cyan Giant Sphere)
      if (isActivated) {
        ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx + 120, cy, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // mRNA Transcript Stream (Yellow Wavy Line)
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = cx + 160; x < canvas.width - 40; x += 8) {
          const my = cy - 20 + Math.sin(x * 0.1 + time * 4) * 8;
          if (x === cx + 160) ctx.moveTo(x, my);
          else ctx.lineTo(x, my);
        }
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isActivated]);

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
                CRISPR ACTIVATOR // dCas9-VPR TRANSCRIPTIONAL ON-SWITCH
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                NO GENOMIC CLEAVAGE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Targeted RNA Polymerase II recruitment & epigenetic gene activation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerActivation}
            disabled={isActivated}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isActivated ? 'TRANSCRIPTION RUNNING (120×)' : 'RECRUIT RNA POLYMERASE II'}</span>
          </button>

          {isActivated && (
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
              <span className="text-emerald-400 font-bold">TARGET: {promoterDistanceBp} bp of TSS</span>
              <span className="text-cyan-400 font-bold">FOLD CHANGE: {expressionFoldChange}× OVEREXPRESSION</span>
            </div>
            <div>STATUS: {isActivated ? 'HIGH-RATE mRNA ELONGATION' : 'dCas9-VPR BOUND TO PROMOTER'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CRISPRa ARCHITECTURE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>dCas9 Mutants:</strong> D10A & H840A mutations abolish RuvC and HNH nuclease cleavage without impairing DNA target binding.</div>
            <div>• <strong>VPR Domain:</strong> Fuses VP64, p65 (NF-κB), and Rta to recruit chromatin remodeling histone acetyltransferases.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
