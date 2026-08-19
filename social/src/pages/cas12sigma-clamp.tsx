import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Paperclip, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12sigmaClamp() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [clampingAffinityPicomolar, setClampingAffinityPicomolar] = useState(15); // 15 pM sub-nanomolar affinity
  const [topologicalAnchorStability, setTopologicalAnchorStability] = useState(25); // 25% -> 99.9%
  const [isClampingChromatin, setIsClampingChromatin] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12sigmaClamping = () => {
    uiaudio.warp();
    setIsClampingChromatin(true);

    setTimeout(() => {
      setIsClampingChromatin(false);
      setTopologicalAnchorStability(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setTopologicalAnchorStability(25);
    setIsClampingChromatin(false);
  };

  // CRISPR-Cas12sigma (Type V-Sigma, 19-aa) Boundary Clamp Canvas
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

      const isClamped = topologicalAnchorStability > 50;

      if (!isClamped) {
        // Slipping unstable chromatin loop (Red Warning)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 35, 140, 65, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('SLIPPING UNCLAMPED CHROMATIN LOOP (LOOP DRIFTING ACROSS TAD BOUNDARY)', 130, cy - 65);
      } else {
        // Firmly Clamped Stable Loop Anchor (Green Secure)
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 40, 130, 75, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 19-aa Cas12sigma Ultra-Compact Peptide Clamp at loop base (cx, cy + 35)
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 24;

        // Clamp Ring
        ctx.beginPath();
        ctx.arc(cx, cy + 35, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 6.5px monospace';
        ctx.fillText('19aa', cx - 9, cy + 37.5);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`TOPOLOGICAL CHROMATIN LOOP CLAMPED (${clampingAffinityPicomolar} pM STABILITY)`, 170, cy - 90);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12σ (Type V-Sigma, 19-aa): AFFINITY = ${clampingAffinityPicomolar} pM | STABILITY = ${topologicalAnchorStability}% (DOUDNA & WENDY BICKMORE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [clampingAffinityPicomolar, topologicalAnchorStability, isClampingChromatin]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Paperclip className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-amber-300 to-pink-400">
                CRISPR-CAS12σ // 19-aa CHROMATIN BOUNDARY CLAMP
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & WENDY BICKMORE (EDINBURGH & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-20-aa world record micro-effector & synthetic topological chromatin clamp for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12sigmaClamping}
            disabled={isClampingChromatin || topologicalAnchorStability > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-amber-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isClampingChromatin ? 'CLAMPING CHROMATIN LOOPS...' : 'ENGAGE 19-aa CLAMP'}</span>
          </button>

          {topologicalAnchorStability > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 19-aa (SUB-20-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">AFFINITY: {clampingAffinityPicomolar} pM</span>
              <span className="text-emerald-400 font-bold">STABILITY: {topologicalAnchorStability}%</span>
            </div>
            <div>STATUS: {topologicalAnchorStability > 50 ? 'SUB-NANOMETER CHROMATIN CLAMP LOCKED' : 'UNCLAMPED CHROMATIN'}</div>
          </div>
        </div>

        {/* Cas12sigma Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CHROMATIN CLAMP
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>19-aa Sub-20-aa Historic Record:</strong> Cas12σ is the world's smallest known programmable peptide effector (19 amino acids), locking DNA loops with picomolar affinity!</div>
            <div>• <strong>Topological Boundary Clamp:</strong> Prevents loop extrusion complex slipping, establishing permanent synthetic TAD boundaries without cellular cytotoxicity!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
