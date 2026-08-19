import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function GeneDrive() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [transmissionRate, setTransmissionRate] = useState(98.6); // 98.6% Super-Mendelian drive inheritance
  const [generations, setGenerations] = useState(6); // 6 generations to population fixation
  const [isDrivePropagated, setIsDrivePropagated] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerGeneDrivePropagation = () => {
    uiaudio.warp();
    setIsDrivePropagated(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setIsDrivePropagated(false);
  };

  // CRISPR Gene Drive Chromosome Cleavage & HDR Copying Canvas
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

      // Homologous Chromosome Pair 1 (Top Strand - Engineered Drive Allele in Cyan)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(60, cy - 60); ctx.lineTo(canvas.width - 60, cy - 60);
      ctx.stroke();

      // Cas9 + gRNA + Payload Cassette in Drive Chromosome (Gold Center Block)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 50, cy - 72, 100, 24);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('CRISPR-DRIVE', cx - 38, cy - 56);

      // Homologous Chromosome Pair 2 (Bottom Strand - Wild-Type Target in Red/Green)
      ctx.strokeStyle = isDrivePropagated ? '#06b6d4' : '#ef4444';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(60, cy + 60); ctx.lineTo(canvas.width - 60, cy + 60);
      ctx.stroke();

      if (isDrivePropagated) {
        // Homology-Directed Repair (HDR) Copied Drive Cassette to Homolog!
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.fillRect(cx - 50, cy + 48, 100, 24);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('HDR COPIED', cx - 32, cy + 64);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('SUPER-MENDELIAN HOMOZYGOUS CONVERSION (98.6% TRANSMISSION)', cx - 180, cy + 130);
      } else {
        // Wild-Type Target Cleavage Site (Scissors Cut)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy - 35); ctx.lineTo(cx, cy + 45);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('WILD-TYPE HOMOLOG (PRE-CLEAVAGE)', cx - 110, cy + 100);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDrivePropagated]);

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
                CRISPR GENE DRIVE // SUPER-MENDELIAN INHERITANCE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                HOMOLOGY-DIRECTED REPAIR (HDR)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Cas9 homing endonuclease & rapid population-wide genetic replacement for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerGeneDrivePropagation}
            disabled={isDrivePropagated}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDrivePropagated ? 'GENE DRIVE PROPAGATED ACROSS POPULATION' : 'TRIGGER CAS9 HOMOLOGOUS HDR HOMING'}</span>
          </button>

          {isDrivePropagated && (
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
              <span className="text-emerald-400 font-bold">TRANSMISSION: {transmissionRate}% (Mendelian = 50%)</span>
              <span className="text-cyan-400 font-bold">GENERATIONS: {generations}</span>
            </div>
            <div>STATUS: {isDrivePropagated ? '100% POPULATION ALLELIC FIXATION' : 'HETEROZYGOUS EMBRYO'}</div>
          </div>
        </div>

        {/* Drive Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            DRIVE ARCHITECTURE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Breaking Mendelian Rules:</strong> Instead of standard 50% inheritance, CRISPR gene drives cut the wild-type chromosome, forcing the cell to use the drive allele as a repair template, achieving nearly 100% inheritance!</div>
            <div>• <strong>Eradicating Malaria:</strong> Drives designed to spread female sterility genes can crash target mosquito populations (Anopheles gambiae) in just 10–15 generations!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
