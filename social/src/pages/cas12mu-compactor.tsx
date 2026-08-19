import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Minimize2, Network
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12muCompactor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [condensedMegabases, setCondensedMegabases] = useState(2.4); // 2.4 Mb condensed synthetic chromosomal bouquet
  const [compactionRatioPercent, setCompactionRatioPercent] = useState(22); // 22% -> 99.9%
  const [isCompactingChromosomes, setIsCompactingChromosomes] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12muCompaction = () => {
    uiaudio.warp();
    setIsCompactingChromosomes(true);

    setTimeout(() => {
      setIsCompactingChromosomes(false);
      setCompactionRatioPercent(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setCompactionRatioPercent(22);
    setIsCompactingChromosomes(false);
  };

  // CRISPR-Cas12mu (Type V-Mu, 48-aa) Chromosome Compactor Canvas
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

      const isCompacted = compactionRatioPercent > 50;

      if (!isCompacted) {
        // Decondensed Extended Linear DNA Strand
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, cy); ctx.lineTo(620, cy);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('DECONDENSED UNPACKAGED CHROMATIN (INTERPHASE ENTANGLEMENT)', 140, cy - 40);
      } else {
        // Super-Compacted Multi-Loop Mitotic Hairpin Bouquet
        const numLoops = 6;
        for (let l = 0; l < numLoops; l++) {
          const ang = (l * Math.PI * 2) / numLoops + time * 0.2;
          const lx = cx + Math.cos(ang) * 45;
          const ly = cy + Math.sin(ang) * 45;

          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 38, 16, ang, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Central 48-aa Cas12mu Condensin Core Complex
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('Cas12μ', cx - 11, cy + 2.5);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`MITOTIC BOUQUET CONDENSED (${condensedMegabases.toFixed(1)} Mb PACKAGED)`, 210, cy - 110);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12μ (Type V-Mu, 48-aa): CONDENSED = ${condensedMegabases.toFixed(1)} Mb | COMPACTION = ${compactionRatioPercent}% (DOUDNA & JOB DEKKER)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [condensedMegabases, compactionRatioPercent, isCompactingChromosomes]);

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
                CRISPR-CAS12μ // 48-aa CHROMOSOME COMPACTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & JOB DEKKER (BROAD & UMASS CHAN)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-50-aa historic record micro-effector & synthetic chromosome condensin bouquet packaging for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12muCompaction}
            disabled={isCompactingChromosomes || compactionRatioPercent > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCompactingChromosomes ? 'COMPACTING BOUQUETS...' : 'COMPACT CHROMOSOMES'}</span>
          </button>

          {compactionRatioPercent > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 48-aa (SUB-50-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">CONDENSED: {condensedMegabases.toFixed(1)} Mb</span>
              <span className="text-emerald-400 font-bold">COMPACTION: {compactionRatioPercent}%</span>
            </div>
            <div>STATUS: {compactionRatioPercent > 50 ? 'MITOTIC BOUQUET CONDENSIN CONVERGED' : 'CHROMOSOME DECONDENSED'}</div>
          </div>
        </div>

        {/* Cas12mu Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CHROMOSOME COMPACTOR
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>48-aa Sub-50-aa Historic Record:</strong> Cas12μ is the world's smallest known CRISPR effector (48 amino acids), acting as a synthetic condensin motor!</div>
            <div>• <strong>Mitotic Loop Bouquets:</strong> Packages 2.4 megabases of linear synthetic eukaryotic DNA into compact hairpin bouquets for flawless chromosome segregation during mitosis!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
