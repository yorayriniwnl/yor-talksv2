import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, GitBranch
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12kappaRewirer() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loopSpanKilobases, setLoopSpanKilobases] = useState(85); // 85 kb long-range enhancer-promoter chromatin loop
  const [rewiringEfficiency, setRewiringEfficiency] = useState(24); // 24% -> 99.9%
  const [isRewiringEnhancers, setIsRewiringEnhancers] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12kappaRewiring = () => {
    uiaudio.warp();
    setIsRewiringEnhancers(true);

    setTimeout(() => {
      setIsRewiringEnhancers(false);
      setRewiringEfficiency(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setRewiringEfficiency(24);
    setIsRewiringEnhancers(false);
  };

  // CRISPR-Cas12kappa (Type V-Kappa, 68-aa) Enhancer Re-Wirer Canvas
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

      const isRewired = rewiringEfficiency > 50;

      if (!isRewired) {
        // Linear Chromatin without Loop (Enhancer far from Promoter)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, cy); ctx.lineTo(620, cy);
        ctx.stroke();

        // Enhancer at 160 (Yellow)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(160, cy, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000'; ctx.font = 'bold 7px monospace'; ctx.fillText('ENH', 152, cy + 2.5);

        // Promoter at 520 (Green)
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(520, cy, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000'; ctx.font = 'bold 7px monospace'; ctx.fillText('PROM', 510, cy + 2.5);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('ENHANCER DISCONNECTED (NO TRANSCRIPTION)', 230, cy - 40);
      } else {
        // Folded 3D Chromatin Loop (Enhancer loops directly onto Promoter!)
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 40, 160, 90, 0, 0, Math.PI);
        ctx.stroke();

        // Flanking DNA arms
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, cy); ctx.lineTo(cx - 160, cy);
        ctx.moveTo(cx + 160, cy); ctx.lineTo(620, cy);
        ctx.stroke();

        // Re-Wired Loop Base Junction (Enhancer + Promoter in Direct Contact!)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(cx - 14, cy - 40, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000'; ctx.font = 'bold 6px monospace'; ctx.fillText('ENH', cx - 21, cy - 38);

        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(cx + 14, cy - 40, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000'; ctx.font = 'bold 6px monospace'; ctx.fillText('PROM', cx + 6, cy - 38);

        // 68-aa Cas12kappa Dimer bridging the loop
        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(cx, cy - 40, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000'; ctx.font = 'bold 6px monospace'; ctx.fillText('Cas12κ', cx - 11, cy - 38);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`3D CHROMATIN LOOP RE-WIRED (+${loopSpanKilobases}kb ACTIVATION)`, 210, cy - 145);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12κ (Type V-Kappa, 68-aa): LOOP SPAN = ${loopSpanKilobases} kb | RE-WIRING EFFICIENCY = ${rewiringEfficiency}% (DOUDNA & BING REN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [loopSpanKilobases, rewiringEfficiency, isRewiringEnhancers]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-pink-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <GitBranch className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12κ // 68-aa ENHANCER RE-WIRER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & BING REN (UCSD & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-70-aa historic record micro-effector & 3D chromatin loop engineering for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12kappaRewiring}
            disabled={isRewiringEnhancers || rewiringEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isRewiringEnhancers ? 'RE-WIRING CHROMATIN LOOP...' : 'RE-WIRE ENHANCER LOOP'}</span>
          </button>

          {rewiringEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 68-aa (SUB-70-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">LOOP: {loopSpanKilobases} kb</span>
              <span className="text-emerald-400 font-bold">RE-WIRING: {rewiringEfficiency}%</span>
            </div>
            <div>STATUS: {rewiringEfficiency > 50 ? '3D ENHANCER-PROMOTER SYNAPSE CONVERGED' : 'CHROMATIN LOOP DISCONNECTED'}</div>
          </div>
        </div>

        {/* Cas12kappa Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ENHANCER RE-WIRER
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>68-aa Sub-70-aa Record:</strong> Cas12κ is the smallest known programmable CRISPR effector (68 amino acids), acting as an artificial chromatin loop architect!</div>
            <div>• <strong>Programmable 3D Synapse:</strong> Dimerizes distal super-enhancers directly onto silent target promoters across 85 kilobase genomic spans to ignite powerful transcription cascades!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
