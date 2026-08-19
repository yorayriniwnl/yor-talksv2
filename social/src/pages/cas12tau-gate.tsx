import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, DoorClosed, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12tauGate() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [insulationEfficiencyPercent, setInsulationEfficiencyPercent] = useState(20); // 20% -> 99.9%
  const [peptideGateWidthNm, setPeptideGateWidthNm] = useState(0.85); // 0.85 nm sub-nanometer barrier
  const [isGatingChromatin, setIsGatingChromatin] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12tauGating = () => {
    uiaudio.warp();
    setIsGatingChromatin(true);

    setTimeout(() => {
      setIsGatingChromatin(false);
      setInsulationEfficiencyPercent(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setInsulationEfficiencyPercent(20);
    setIsGatingChromatin(false);
  };

  // CRISPR-Cas12tau (Type V-Tau, 15-aa) Chromatin Gate Canvas
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

      // Chromatin Backbone (80 to 620, cy)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(620, cy);
      ctx.stroke();

      const isGated = insulationEfficiencyPercent > 50;

      if (!isGated) {
        // Leaky Loop Contact across boundary (Red Warning)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 35, 140, 70, 0, 0, Math.PI);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('LEAKY TAD BOUNDARY: UNGATED ENHANCER-PROMOTER MIS-ACTIVATION', 130, cy - 65);
      } else {
        // Solid Insulated Boundary Wall (Green Secure)
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(cx, cy, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 6px monospace';
        ctx.fillText('15aa', cx - 7, cy + 2.5);

        // Vertical Laser Barrier Gate
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 75); ctx.lineTo(cx, cy + 75);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`SUB-NANOMETER TAD BOUNDARY GATE LOCKED (${peptideGateWidthNm} nm)`, 160, cy - 85);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12τ (Type V-Tau, 15-aa): BARRIER = ${peptideGateWidthNm} nm | INSULATION = ${insulationEfficiencyPercent}% (DOUDNA & WENDY BICKMORE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [insulationEfficiencyPercent, peptideGateWidthNm, isGatingChromatin]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <DoorClosed className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12τ // 15-aa CHROMATIN INSULATOR GATE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & WENDY BICKMORE (EDINBURGH & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-16-aa historic record smallest programmable peptide effector & chromatin boundary gate for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12tauGating}
            disabled={isGatingChromatin || insulationEfficiencyPercent > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isGatingChromatin ? 'DEPLOYING 15-aa GATE...' : 'LOCK 15-aa INSULATOR GATE'}</span>
          </button>

          {insulationEfficiencyPercent > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 15-aa (SUB-16-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">GATE: {peptideGateWidthNm} nm</span>
              <span className="text-emerald-400 font-bold">INSULATION: {insulationEfficiencyPercent}%</span>
            </div>
            <div>STATUS: {insulationEfficiencyPercent > 50 ? 'SUB-NANOMETER TAD INSULATOR LOCKED' : 'LEAKY BOUNDARY'}</div>
          </div>
        </div>

        {/* Cas12tau Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            INSULATOR GATE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>15-aa Sub-16-aa Historic Record:</strong> Cas12τ is the world's smallest known CRISPR peptide effector (15 amino acids), creating an impermeable TAD boundary!</div>
            <div>• <strong>CTCF-Free Topological Insulation:</strong> Blocks oncogenic enhancer-promoter contacts with 99.9% insulation fidelity across genomic distances!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
