import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Lock
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12thetaCapper() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [telomereTloopKilobases, setTelomereTloopKilobases] = useState(15); // 15 kb protective t-loop cap
  const [cappingEfficiency, setCappingEfficiency] = useState(20); // 20% -> 99.9%
  const [isCappingTelomeres, setIsCappingTelomeres] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12thetaCapping = () => {
    uiaudio.warp();
    setIsCappingTelomeres(true);

    setTimeout(() => {
      setIsCappingTelomeres(false);
      setCappingEfficiency(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setCappingEfficiency(20);
    setIsCappingTelomeres(false);
  };

  // CRISPR-Cas12theta (Type V-Theta, 88-aa) Telomere Capper Canvas
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

      const isCapped = cappingEfficiency > 50;

      // Main Chromosome Body (80 to 450, cy)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(450, cy);
      ctx.stroke();

      if (!isCapped) {
        // Uncapped Exposed Double-Strand End (Damage Alert)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(450, cy); ctx.lineTo(580, cy);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(580, cy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('EXPOSED 3\' OVERHANG (SENESCENCE SIGNAL)', 360, cy - 25);
      } else {
        // Folded Protective Telomeric t-Loop Structure
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(510, cy - 25, 35, 0, Math.PI * 2);
        ctx.stroke();

        // Strand invasion into duplex
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(450, cy); ctx.lineTo(480, cy - 15);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`PROTECTED ${telomereTloopKilobases}kb t-LOOP CAP (IMMORTALIZED)`, 350, cy - 70);
      }

      // Ultra-Miniature Cas12theta Monomer (88-aa) at t-Loop Junction
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isCappingTelomeres ? 24 : 8;
      ctx.beginPath();
      ctx.arc(480, cy - (isCapped ? 15 : 0), 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Cas12θ', 467, cy - (isCapped ? 12 : -3));

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12θ (Type V-Theta, 88-aa): t-LOOP CAP = ${telomereTloopKilobases} kb | CAPPING EFFICIENCY = ${cappingEfficiency}% (DOUDNA & FENG ZHANG)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [telomereTloopKilobases, cappingEfficiency, isCappingTelomeres]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Lock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12θ // 88-aa TELOMERE CAPPER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & FENG ZHANG (BROAD & MIT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-90-aa world record micro-effector & synthetic shelterin t-loop capping for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12thetaCapping}
            disabled={isCappingTelomeres || cappingEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCappingTelomeres ? 'ASSEMBLING t-LOOP CAPS...' : 'CAP SYNTHETIC TELOMERES'}</span>
          </button>

          {cappingEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 88-aa (SUB-90-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">t-LOOP: {telomereTloopKilobases} kb</span>
              <span className="text-emerald-400 font-bold">CAPPING: {cappingEfficiency}%</span>
            </div>
            <div>STATUS: {cappingEfficiency > 50 ? 'SHELTERIN MIMETIC t-LOOP STABILIZED' : 'TELOMERE DAMAGE SENSORS DETECTED'}</div>
          </div>
        </div>

        {/* Cas12theta Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TELOMERE CAPPER
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>88-aa Sub-90-aa Historic Record:</strong> Cas12θ sets a new milestone as the smallest known CRISPR effector (88 amino acids), acting as a programmable shelterin/TRF2-mimetic!</div>
            <div>• <strong>Endless Replicative Lifespan:</strong> Folds linear chromosome ends into protective 15 kb t-loops, shielding telomeres from ATM/ATR kinase activation and preventing cellular senescence!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
