import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Disc3
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12iotaRemodeler() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [nucleosomeSlideBasepairs, setNucleosomeSlideBasepairs] = useState(147); // 147 bp nucleosome repositioning
  const [remodelingEfficiency, setRemodelingEfficiency] = useState(25); // 25% -> 99.9%
  const [isRemodelingChromatin, setIsRemodelingChromatin] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12iotaRemodeling = () => {
    uiaudio.warp();
    setIsRemodelingChromatin(true);

    setTimeout(() => {
      setIsRemodelingChromatin(false);
      setRemodelingEfficiency(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setRemodelingEfficiency(25);
    setIsRemodelingChromatin(false);
  };

  // CRISPR-Cas12iota (Type V-Iota, 78-aa) Chromatin Remodeler Canvas
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

      const isRemodeled = remodelingEfficiency > 50;

      // DNA Strand (80 to 620, cy)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(620, cy);
      ctx.stroke();

      // Promoter TATA Box at 240
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(230, cy - 10, 30, 20);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('PROMOTER', 231, cy + 2.5);

      // Histone Octamer (+1 Nucleosome Core Particle)
      // When unremodeled: blocks promoter at 245
      // When remodeled: slid to 390, exposing promoter!
      const nucX = isRemodeled ? 390 : 245;

      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(nucX, cy, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('+1 NUC', nucX - 14, cy + 3);

      // Cas12iota Sub-80-aa Micro-Effector (78-aa) at Target Locus
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isRemodelingChromatin ? 24 : 8;
      ctx.beginPath();
      ctx.arc(nucX - 35, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 6.5px monospace';
      ctx.fillText('Cas12ι', nucX - 44, cy + 2.5);

      if (isRemodeled) {
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText(`+1 NUCLEOSOME SLID +${nucleosomeSlideBasepairs}bp (PROMOTER ACTIVATED)`, 190, cy - 50);
      } else {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('PROMOTER OCCLUDED BY HISTONE OCTAMER (SILENCED)', 170, cy - 50);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12ι (Type V-Iota, 78-aa): SLIDE DISTANCE = ${nucleosomeSlideBasepairs} bp | EFFICIENCY = ${remodelingEfficiency}% (DOUDNA & CRABTREE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nucleosomeSlideBasepairs, remodelingEfficiency, isRemodelingChromatin]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Disc3 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-amber-300 to-pink-400">
                CRISPR-CAS12ι // 78-aa CHROMATIN REMODELER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & GERALD CRABTREE (STANFORD & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-80-aa historic record micro-effector & SWI/SNF nucleosome repositioning for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12iotaRemodeling}
            disabled={isRemodelingChromatin || remodelingEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isRemodelingChromatin ? 'SLIDING +1 NUCLEOSOME...' : 'SLIDE NUCLEOSOME'}</span>
          </button>

          {remodelingEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 78-aa (SUB-80-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">SLIDE: +{nucleosomeSlideBasepairs} bp</span>
              <span className="text-emerald-400 font-bold">REMODELING: {remodelingEfficiency}%</span>
            </div>
            <div>STATUS: {remodelingEfficiency > 50 ? 'SYNTHETIC PROMOTER ACCESSIBILITY RESTORED' : 'PROMOTER OCCLUSION DETECTED'}</div>
          </div>
        </div>

        {/* Cas12iota Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CHROMATIN REMODELER
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>78-aa Sub-80-aa Record:</strong> Cas12ι sets the world record as the smallest known programmable CRISPR effector (78 amino acids), acting as an ATP-independent chromatin remodeler!</div>
            <div>• <strong>Precision Epigenetic Repositioning:</strong> Slides +1 nucleosomes 147 base pairs downstream, uncovering occluded TATA boxes and initiating robust gene expression without DNA double-strand breaks!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
