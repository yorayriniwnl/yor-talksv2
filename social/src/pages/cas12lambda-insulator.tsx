import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Shield, Split
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12lambdaInsulator() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tadBoundarySizeKilobases, setTadBoundarySizeKilobases] = useState(120); // 120 kb TAD insulation domain
  const [insulationScorePercent, setInsulationScorePercent] = useState(25); // 25% -> 99.9%
  const [isInsulatingTad, setIsInsulatingTad] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12lambdaInsulation = () => {
    uiaudio.warp();
    setIsInsulatingTad(true);

    setTimeout(() => {
      setIsInsulatingTad(false);
      setInsulationScorePercent(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setInsulationScorePercent(25);
    setIsInsulatingTad(false);
  };

  // CRISPR-Cas12lambda (Type V-Lambda, 58-aa) TAD Insulator Canvas
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

      const isInsulated = insulationScorePercent > 50;

      // Hi-C Heatmap Triangle Representation at Top
      // TAD A (Left: 120 to 240) & TAD B (Right: 240 to 360)
      if (isInsulated) {
        // Distinct Insulated TAD A Triangle (Cyan)
        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.beginPath();
        ctx.moveTo(120, cy - 30); ctx.lineTo(180, cy - 90); ctx.lineTo(240, cy - 30);
        ctx.closePath();
        ctx.fill();

        // Distinct Insulated TAD B Triangle (Pink)
        ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
        ctx.beginPath();
        ctx.moveTo(240, cy - 30); ctx.lineTo(300, cy - 90); ctx.lineTo(360, cy - 30);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('TAD A (INSULATED)', 135, cy - 100);
        ctx.fillText('TAD B (INSULATED)', 255, cy - 100);
      } else {
        // Bleeding Enhancer Leakage across boundary
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.beginPath();
        ctx.moveTo(120, cy - 30); ctx.lineTo(240, cy - 110); ctx.lineTo(360, cy - 30);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('LEAKING ENHANCER-PROMOTER CROSSTALK', 140, cy - 115);
      }

      // Linear Chromatin Fiber (80 to 620, cy + 30)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy + 30); ctx.lineTo(620, cy + 30);
      ctx.stroke();

      // Cas12lambda 58-aa CTCF-Mimetic Insulator Barrier at x=240, cy+30
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isInsulatingTad ? 24 : 8;
      ctx.beginPath();
      ctx.arc(240, cy + 30, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 6.5px monospace';
      ctx.fillText('Cas12λ', 227, cy + 32.5);

      if (isInsulated) {
        // Vertical CTCF Topological Boundary Barrier Line
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(240, cy - 120); ctx.lineTo(240, cy + 70);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('TAD BOUNDARY BARRIER (COHESIN BLOCKED)', 330, cy + 15);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12λ (Type V-Lambda, 58-aa): TAD DOMAIN = ${tadBoundarySizeKilobases} kb | INSULATION = ${insulationScorePercent}% (DOUDNA & LIEBERMAN AIDEN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tadBoundarySizeKilobases, insulationScorePercent, isInsulatingTad]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Split className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12λ // 58-aa TAD INSULATOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & EREZ LIEBERMAN AIDEN (BAYOR & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-60-aa historic record micro-effector & synthetic CTCF topological boundary for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12lambdaInsulation}
            disabled={isInsulatingTad || insulationScorePercent > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isInsulatingTad ? 'ESTABLISHING TAD BOUNDARY...' : 'ESTABLISH TAD BOUNDARY'}</span>
          </button>

          {insulationScorePercent > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 58-aa (SUB-60-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">TAD DOMAIN: {tadBoundarySizeKilobases} kb</span>
              <span className="text-emerald-400 font-bold">INSULATION: {insulationScorePercent}%</span>
            </div>
            <div>STATUS: {insulationScorePercent > 50 ? 'COHESIN LOOP EXTRUSION ARRESTED AT BORDER' : 'INTER-DOMAIN CROSSTALK DETECTED'}</div>
          </div>
        </div>

        {/* Cas12lambda Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TAD INSULATOR
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>58-aa Sub-60-aa Historic Record:</strong> Cas12λ is the world's smallest known CRISPR effector (58 amino acids), acting as a synthetic CTCF boundary protein!</div>
            <div>• <strong>Cohesin Loop Arrest:</strong> Halts progressive cohesin loop extrusion at designated genomic coordinates, isolating synthetic Topologically Associating Domains!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
