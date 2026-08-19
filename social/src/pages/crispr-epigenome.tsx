import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CrisprEpigenome() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fusionType, setFusionType] = useState<'DNMT3A' | 'TET1'>('DNMT3A');
  const [targetGene, setTargetGene] = useState<'HER2_Oncogene' | 'BRCA1_Suppressor'>('HER2_Oncogene');
  const [isEditing, setIsEditing] = useState(false);
  const [methylated, setMethylated] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerEpigeneticEdit = () => {
    uiaudio.warp();
    setIsEditing(true);

    setTimeout(() => {
      setIsEditing(false);
      setMethylated(fusionType === 'DNMT3A');
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setMethylated(false);
    setIsEditing(false);
  };

  // Targeted Epigenetic Methylation / Demethylation Canvas
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

      // Dark Epigenetic Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // DNA Target Gene Promoter Strand
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(40, cy); ctx.lineTo(canvas.width - 40, cy);
      ctx.stroke();

      // dCas9-DNMT3A/TET1 Fusion Complex Binding (Center 370, cy)
      ctx.fillStyle = fusionType === 'DNMT3A' ? '#ec4899' : '#10b981';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = isEditing ? 20 : 8;
      ctx.beginPath();
      ctx.arc(cx, cy - 35, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(fusionType === 'DNMT3A' ? 'dCas9-DNMT3A' : 'dCas9-TET1', cx - 35, cy - 65);

      // gRNA Targeting Scaffold
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy - 20); ctx.lineTo(cx, cy); ctx.lineTo(cx + 20, cy - 20);
      ctx.stroke();

      // Target CpG Island Sites (Methylated vs Demethylated Flags)
      for (let i = 0; i < 6; i++) {
        const cpgX = cx - 90 + i * 36;
        const has5mC = methylated;

        ctx.fillStyle = has5mC ? '#ec4899' : '#22c55e';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(cpgX, cy + 24, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = has5mC ? '#ec4899' : '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cpgX, cy); ctx.lineTo(cpgX, cy + 24);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (methylated) {
        ctx.fillText('CpG ISLAND HYPERMETHYLATED (5mC): TARGET ONCOGENE PERMANENTLY SILENCED', 110, cy + 110);
      } else {
        ctx.fillText('UNMETHYLATED PROMOTER: ACTIVE TRANSCRIPTION (CHROMATIN OPEN)', 140, cy + 110);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [fusionType, isEditing, methylated]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Dna className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                CRISPR EPIGENOME EDITING // dCas9-DNMT3A / TET1 TARGETING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                ZERO DOUBLE-STRAND BREAKS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Targeted CpG locus methylation silencing & TET1 demethylation reactivation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerEpigeneticEdit}
            disabled={isEditing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-amber-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEditing ? 'REPROGRAMMING CpG METHYLATION PATTERN...' : `EXECUTE ${fusionType} EPIGENETIC EDIT`}</span>
          </button>

          {methylated && (
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
              <span className="text-pink-400 font-bold">FUSION: dCas9-{fusionType}</span>
              <span className="text-cyan-400 font-bold">TARGET: {targetGene}</span>
            </div>
            <div>STATUS: {methylated ? 'EPIGENETIC REPRESSION LOCKED (HERITABLE)' : 'ACTIVE CHROMATIN'}</div>
          </div>
        </div>

        {/* Epigenetic Selection (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            EPIGENETIC MODIFIERS
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => setFusionType('DNMT3A')}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                fusionType === 'DNMT3A' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">dCas9-DNMT3A (Methyltransferase)</div>
              <div className="text-[10px] text-zinc-400">Installs 5mC Methylation // Silencing</div>
            </button>

            <button
              onClick={() => setFusionType('TET1')}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                fusionType === 'TET1' ? "bg-emerald-500/20 border-emerald-400 text-emerald-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">dCas9-TET1 (Dioxygenase)</div>
              <div className="text-[10px] text-zinc-400">Demethylates 5mC → 5hmC // Activation</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No Genomic InDels:</strong> Epigenome editing alters gene expression states without cutting DNA, eliminating the risk of chromosomal translocations or off-target mutations!</div>
            <div>• <strong>Heritable Memory:</strong> Target DNA methylation installed by dCas9-DNMT3A is faithfully copied by maintenance methyltransferase DNMT1 across multiple cell divisions!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
