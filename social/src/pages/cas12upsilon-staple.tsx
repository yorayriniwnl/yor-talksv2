import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Pin, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12upsilonStaple() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stapleBindingAffinityFemtomolar, setStapleBindingAffinityFemtomolar] = useState(450); // 450 fM ultra-tight staple
  const [topologicalStapleStability, setTopologicalStapleStability] = useState(15); // 15% -> 99.95%
  const [isStaplingChromatin, setIsStaplingChromatin] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12upsilonStapling = () => {
    uiaudio.warp();
    setIsStaplingChromatin(true);

    setTimeout(() => {
      setIsStaplingChromatin(false);
      setTopologicalStapleStability(99.95);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setTopologicalStapleStability(15);
    setIsStaplingChromatin(false);
  };

  // CRISPR-Cas12upsilon (Type V-Upsilon, 12-aa) Chromatin Staple Canvas
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

      const isStapled = topologicalStapleStability > 50;

      if (!isStapled) {
        // Disorganized, detached looping chromatin (Red Warning)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx - 30, cy - 35, 120, 60, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.ellipse(cx + 30, cy - 35, 120, 60, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('UNSTAPLED CHROMATIN LOOPS: CHROMATIN ANCHOR DISENGAGED', 160, cy - 65);
      } else {
        // Double-Loop Stapled at base (Green Secure)
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.ellipse(cx - 50, cy - 45, 60, 95, -0.2, 0, Math.PI * 2);
        ctx.ellipse(cx + 50, cy - 45, 60, 95, 0.2, 0, Math.PI * 2);
        ctx.stroke();

        // 12-aa Cas12upsilon Single-Dodecamer Staple Node (at cx, cy + 30)
        ctx.fillStyle = '#ec4899';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 24;

        // Staple Pin
        ctx.beginPath();
        ctx.arc(cx, cy + 30, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 6.5px monospace';
        ctx.fillText('12aa', cx - 8, cy + 32.5);

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`12-aa SINGLE-DODECAMER CHROMATIN STAPLE LOCKED (${stapleBindingAffinityFemtomolar} fM)`, 140, cy - 90);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12υ (Type V-Upsilon, 12-aa): AFFINITY = ${stapleBindingAffinityFemtomolar} fM | STABILITY = ${topologicalStapleStability}% (DOUDNA & WENDY BICKMORE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stapleBindingAffinityFemtomolar, topologicalStapleStability, isStaplingChromatin]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-pink-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Pin className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-pink-300 to-sky-400">
                CRISPR-CAS12υ // 12-aa CHROMATIN LOOP STAPLE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & WENDY BICKMORE (EDINBURGH & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-13-aa historic record smallest programmable peptide effector & chromatin loop staple for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12upsilonStapling}
            disabled={isStaplingChromatin || topologicalStapleStability > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isStaplingChromatin ? 'STAPLING CHROMATIN LOOPS...' : 'LOCK 12-aa STAPLE'}</span>
          </button>

          {topologicalStapleStability > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 12-aa (SUB-13-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">AFFINITY: {stapleBindingAffinityFemtomolar} fM</span>
              <span className="text-emerald-400 font-bold">STABILITY: {topologicalStapleStability}%</span>
            </div>
            <div>STATUS: {topologicalStapleStability > 50 ? '12-aa DODECAMER CHROMATIN STAPLE LOCKED' : 'UNSTAPLED'}</div>
          </div>
        </div>

        {/* Cas12upsilon Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CHROMATIN STAPLE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>12-aa Sub-13-aa Historic Record:</strong> Cas12υ is the world's smallest known programmable peptide effector (12 amino acids), forming a single-dodecamer staple!</div>
            <div>• <strong>Femtomolar Anchor Affinity:</strong> Locks loop bases with 450 fM binding strength, preventing loop dissolution over cellular lifespans!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
