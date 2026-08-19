import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, Shuffle, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12deltaScrambler() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [reassignedCodonsCount, setReassignedCodonsCount] = useState(321); // 321 UAG codons reassigned to UAA
  const [viralImmunityPercentage, setViralImmunityPercentage] = useState(25); // 25% -> 100%
  const [isScramblingCodons, setIsScramblingCodons] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12deltaScrambling = () => {
    uiaudio.warp();
    setIsScramblingCodons(true);

    setTimeout(() => {
      setIsScramblingCodons(false);
      setViralImmunityPercentage(100);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setViralImmunityPercentage(25);
    setIsScramblingCodons(false);
  };

  // CRISPR-Cas12delta (Type V-Delta, 155-aa) Codon Scrambling Canvas
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

      // Dark Bacterial Genetic Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Recoded Synthetic Chromosome (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // Recoded Codon Blocks
      const numBlocks = 6;
      const isRecoded = viralImmunityPercentage > 50;

      for (let b = 0; b < numBlocks; b++) {
        const bx = 110 + b * 90;
        ctx.fillStyle = isRecoded ? '#22c55e' : '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(bx, cy - 56, 70, 32);
        ctx.strokeRect(bx, cy - 56, 70, 32);

        ctx.fillStyle = isRecoded ? '#000000' : '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(isRecoded ? 'UAA (RECODED)' : 'UAG (TARGET)', bx + 5, cy - 36);
      }

      // Ultra-Miniature Cas12delta Monomer (155-aa) at Target (350, cy + 35)
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isScramblingCodons ? 24 : 8;
      ctx.beginPath();
      ctx.arc(350, cy + 35, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Cas12δ', 334, cy + 38);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12δ (Type V-Delta, 155-aa): RECODED CODONS = ${reassignedCodonsCount} | VIRAL RESISTANCE = ${viralImmunityPercentage}% (DOUDNA & CHURCH)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [reassignedCodonsCount, viralImmunityPercentage, isScramblingCodons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Shuffle className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-yellow-300 to-amber-400">
                CRISPR-CAS12δ // 155-aa CODON SCRAMBLER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA & GEORGE CHURCH (UC BERKELEY & HARVARD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-160-aa world record micro-effector & 321-codon genome recoding for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12deltaScrambling}
            disabled={isScramblingCodons || viralImmunityPercentage > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isScramblingCodons ? 'RECODING 321 CODONS...' : 'RECODE GENOME CODONS'}</span>
          </button>

          {viralImmunityPercentage > 50 && (
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
              <span className="text-amber-400 font-bold">SIZE: 155-aa (SUB-160-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">RECODED: {reassignedCodonsCount} UAG</span>
              <span className="text-emerald-400 font-bold">VIRAL RESISTANCE: {viralImmunityPercentage}%</span>
            </div>
            <div>STATUS: {viralImmunityPercentage > 50 ? 'MULTI-VIRAL BACTERIOPHAGE IMMUNITY ACHIEVED' : 'GENOME RECODING COMPLEX READY'}</div>
          </div>
        </div>

        {/* Cas12delta Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CODON REASSIGNMENT
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>155-aa Hyper-Compact Monomer:</strong> Cas12δ sets a historic world record (under 160-aa), allowing hundreds of guide RNAs to be packaged into a single minimal vector!</div>
            <div>• <strong>Multi-Phage Immunity:</strong> Reassigns all 321 genomic UAG stop codons to UAA and knocks out release factor 1 (RF1), rendering host cells completely immune to all natural viral translation machinery!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
