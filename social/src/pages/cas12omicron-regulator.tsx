import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Cpu, ToggleLeft, ToggleRight
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12omicronRegulator() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [loopGatingRateHz, setLoopGatingRateHz] = useState(12); // 12 Hz loop extrusion gating frequency
  const [promoterContactScorePercent, setPromoterContactScorePercent] = useState(20); // 20% -> 99.9%
  const [isGatingEnhancerLoops, setIsGatingEnhancerLoops] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12omicronGating = () => {
    uiaudio.warp();
    setIsGatingEnhancerLoops(true);

    setTimeout(() => {
      setIsGatingEnhancerLoops(false);
      setPromoterContactScorePercent(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setPromoterContactScorePercent(20);
    setIsGatingEnhancerLoops(false);
  };

  // CRISPR-Cas12omicron (Type V-Omicron, 34-aa) Loop Regulator Canvas
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

      const isGated = promoterContactScorePercent > 50;

      if (!isGated) {
        // Disconnected Random Linear Chromatin
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(80, cy); ctx.lineTo(620, cy);
        ctx.stroke();

        // Distant Enhancer (Left at 160) & Promoter (Right at 540)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(160, cy, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(540, cy, 8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('DISCONNECTED ENHANCER-PROMOTER (GENE SILENT, NO LOOP CONTACT)', 140, cy - 40);
      } else {
        // Dynamic Gated Loop bringing Enhancer directly to Promoter!
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 40, 130, 75, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 34-aa Cas12omicron Dynamic Gating Core Complex at bottom apex (cx, cy + 35)
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy + 35, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 6.5px monospace';
        ctx.fillText('Cas12ο', cx - 11, cy + 37.5);

        // Enhancer (Amber) and Promoter (Green) touching at the gate!
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(cx - 16, cy + 35, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.arc(cx + 16, cy + 35, 6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`ENHANCER-PROMOTER ACTIVE CONTACT (${loopGatingRateHz} Hz GATING)`, 190, cy - 130);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12ο (Type V-Omicron, 34-aa): GATING RATE = ${loopGatingRateHz} Hz | CONTACT SCORE = ${promoterContactScorePercent}% (DOUDNA & ANA POMBO)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [loopGatingRateHz, promoterContactScorePercent, isGatingEnhancerLoops]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Cpu className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12ο // 34-aa CHROMATIN LOOP REGULATOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & ANA POMBO (MDC BERLIN & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-35-aa historic record micro-effector & synthetic CTCF-free loop extrusion gating for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12omicronGating}
            disabled={isGatingEnhancerLoops || promoterContactScorePercent > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isGatingEnhancerLoops ? 'GATING LOOP CONTACTS...' : 'GATE ENHANCER LOOP'}</span>
          </button>

          {promoterContactScorePercent > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 34-aa (SUB-35-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">GATING: {loopGatingRateHz} Hz</span>
              <span className="text-emerald-400 font-bold">CONTACT: {promoterContactScorePercent}%</span>
            </div>
            <div>STATUS: {promoterContactScorePercent > 50 ? 'DYNAMIC 3D CHROMATIN LOOP ENGAGED' : 'CHROMATIN DISCONNECTED'}</div>
          </div>
        </div>

        {/* Cas12omicron Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            LOOP REGULATOR
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>34-aa Sub-35-aa Historic Record:</strong> Cas12ο is the world's smallest known CRISPR effector (34 amino acids), acting as an artificial loop extrusion switch!</div>
            <div>• <strong>CTCF-Independent Gating:</strong> Dynamically opens and closes enhancer-promoter chromatin loops in living cells without requiring native CTCF binding sequences!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
