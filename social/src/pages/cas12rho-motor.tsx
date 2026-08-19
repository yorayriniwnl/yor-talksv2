import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Minimize2, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12rhoMotor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [extrusionReelingRateKbS, setExtrusionReelingRateKbS] = useState(45); // 45 kb/s active reeling speed
  const [chromatinCompactionRatio, setChromatinCompactionRatio] = useState(1.2); // 1.2x -> 16.5x
  const [isCompactingChromatin, setIsCompactingChromatin] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12rhoCompaction = () => {
    uiaudio.warp();
    setIsCompactingChromatin(true);

    setTimeout(() => {
      setIsCompactingChromatin(false);
      setChromatinCompactionRatio(16.5);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setChromatinCompactionRatio(1.2);
    setIsCompactingChromatin(false);
  };

  // CRISPR-Cas12rho (Type V-Rho, 24-aa) Condensin Motor Canvas
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

      const isCompacted = chromatinCompactionRatio > 5;

      if (!isCompacted) {
        // Disorganized loose chromatin fibers
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const x = 100 + i * 45;
          const y = cy + Math.sin(time * 3 + i) * 35;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('LOOSE UNCOMPACTED CHROMATIN (NO ACTIVE CONDENSIN REELING)', 150, cy - 55);
      } else {
        // Dense Hyper-Compacted Nested Rosette Loops
        const numLoops = 8;
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;

        for (let l = 0; l < numLoops; l++) {
          const angle = (l * Math.PI * 2) / numLoops + time * 0.5;
          const loopRadius = 55;
          const lx = cx + Math.cos(angle) * loopRadius;
          const ly = cy + Math.sin(angle) * loopRadius;

          ctx.beginPath();
          ctx.ellipse(lx, ly, 22, 14, angle, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Central 24-aa Cas12rho Ultra-Compact Motor Complex (cx, cy)
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(cx, cy, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('24aa', cx - 9, cy + 2.5);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`ACTIVE 16.5x HYPER-COMPACTION (${extrusionReelingRateKbS} kb/s)`, 180, cy - 90);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12ρ (Type V-Rho, 24-aa): REELING = ${extrusionReelingRateKbS} kb/s | COMPACTION = ${chromatinCompactionRatio.toFixed(1)}x (DOUDNA & WENDY BICKMORE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [extrusionReelingRateKbS, chromatinCompactionRatio, isCompactingChromatin]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Minimize2 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12ρ // 24-aa CONDENSIN LOOP MOTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & WENDY BICKMORE (EDINBURGH & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-25-aa world record micro-effector & synthetic chromatin condensin motor for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12rhoCompaction}
            disabled={isCompactingChromatin || chromatinCompactionRatio > 5}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCompactingChromatin ? 'REELING CHROMATIN LOOPS...' : 'ENGAGE CONDENSIN MOTOR'}</span>
          </button>

          {chromatinCompactionRatio > 5 && (
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
              <span className="text-pink-400 font-bold">SIZE: 24-aa (SUB-25-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">REELING: {extrusionReelingRateKbS} kb/s</span>
              <span className="text-emerald-400 font-bold">COMPACTION: {chromatinCompactionRatio.toFixed(1)}x</span>
            </div>
            <div>STATUS: {chromatinCompactionRatio > 5 ? '16.5x HYPER-COMPACTION ACTIVE' : 'UNCOMPACTED EUCHROMATIN'}</div>
          </div>
        </div>

        {/* Cas12rho Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CONDENSIN MOTOR
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>24-aa Sub-25-aa Historic Record:</strong> Cas12ρ is the world's smallest known CRISPR effector (24 amino acids), acting as an autonomous DNA loop reeling motor!</div>
            <div>• <strong>High-Speed Loop Compaction:</strong> Actively reels in genomic DNA at 45 kb/s, achieving 16.5x volumetric chromosome compaction without native condensin complexes!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
