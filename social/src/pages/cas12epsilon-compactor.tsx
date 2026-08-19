import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, Minimize2, Orbit
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12epsilonCompactor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [compactedLoopKilobases, setCompactedLoopKilobases] = useState(50); // 50 kb topological chromatin loop
  const [compactionEfficiency, setCompactionEfficiency] = useState(26); // 26% -> 99.9%
  const [isCompactingLoop, setIsCompactingLoop] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12epsilonCompaction = () => {
    uiaudio.warp();
    setIsCompactingLoop(true);

    setTimeout(() => {
      setIsCompactingLoop(false);
      setCompactionEfficiency(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setCompactionEfficiency(26);
    setIsCompactingLoop(false);
  };

  // CRISPR-Cas12epsilon (Type V-Epsilon, 135-aa) Chromosome Condensation Canvas
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

      // Flanking Chromatin Strands (80 to 240, 460 to 620)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy + 50); ctx.lineTo(240, cy + 50);
      ctx.moveTo(460, cy + 50); ctx.lineTo(620, cy + 50);
      ctx.stroke();

      // Compacted Topological Chromatin Loop (Center: 350, cy)
      const isCompacted = compactionEfficiency > 50;
      const loopRadius = isCompacted ? 45 : 75;

      ctx.strokeStyle = isCompacted ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(350, cy - (isCompacted ? 10 : 30), loopRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = isCompacted ? '#22c55e' : '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(
        isCompacted ? `+${compactedLoopKilobases}kb COMPACTED TOPOLOGICAL LOOP` : `UNORGANIZED 50kb CHROMATIN DOMAIN`,
        245,
        cy - (isCompacted ? 65 : 115)
      );

      // Ultra-Miniature Cas12epsilon Dimer (135-aa) at Loop Base (350, cy + 45)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isCompactingLoop ? 24 : 8;
      ctx.beginPath();
      ctx.arc(342, cy + 45, 10, 0, Math.PI * 2);
      ctx.arc(358, cy + 45, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Cas12ε', 334, cy + 48);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12ε (Type V-Epsilon, 135-aa): LOOP SIZE = +${compactedLoopKilobases} kb | COMPACTION EFFICIENCY = ${compactionEfficiency}% (DOUDNA & SAVAGE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [compactedLoopKilobases, compactionEfficiency, isCompactingLoop]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-pink-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Minimize2 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12ε // 135-aa CHROMOSOME COMPACTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA & DAVID SAVAGE (UC BERKELEY)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-140-aa historic world record micro-effector & 50 kb chromatin condensation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12epsilonCompaction}
            disabled={isCompactingLoop || compactionEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCompactingLoop ? 'CONDENSING 50 kb LOOP...' : 'COMPACT CHROMATIN LOOP'}</span>
          </button>

          {compactionEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 135-aa (SUB-140-aa HISTORIC RECORD)</span>
              <span className="text-cyan-400 font-bold">LOOP: +{compactedLoopKilobases} kb</span>
              <span className="text-emerald-400 font-bold">COMPACTION: {compactionEfficiency}%</span>
            </div>
            <div>STATUS: {compactionEfficiency > 50 ? 'CHROMOSOME TOPOLOGICAL DOMAIN CONDENSED' : 'PROGRAMMABLE CONDENSIN COMPLEX READY'}</div>
          </div>
        </div>

        {/* Cas12epsilon Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CHROMOSOME COMPACTOR
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>135-aa Micro-Condensin:</strong> Cas12ε establishes the ultimate record for miniature CRISPR effectors (135-aa), acting as a dimeric DNA clamp without double-strand breaks!</div>
            <div>• <strong>Higher-Order Chromatin Architecture:</strong> Extrudes and stabilizes 50 kb chromatin loops to regulate transcription factories and package megabase synthetic chromosomes in micro-nuclei!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
