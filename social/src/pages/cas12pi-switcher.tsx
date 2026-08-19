import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, ToggleLeft, ToggleRight, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12piSwitcher() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tadBoundaryState, setTadBoundaryState] = useState<'open' | 'closed'>('open');
  const [switchingFidelityPercent, setSwitchingFidelityPercent] = useState(99.9);
  const [isTogglingBoundary, setIsTogglingBoundary] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const toggleBoundaryState = () => {
    uiaudio.warp();
    setIsTogglingBoundary(true);

    setTimeout(() => {
      setIsTogglingBoundary(false);
      setTadBoundaryState(s => s === 'open' ? 'closed' : 'open');
      uiaudio.success();
    }, 450);
  };

  // CRISPR-Cas12pi (Type V-Pi, 28-aa) TAD Boundary Switcher Canvas
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

      if (tadBoundaryState === 'open') {
        // Boundary OPEN: Enhancer connects freely to downstream oncogene (Red Warning)
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 35, 140, 70, 0, 0, Math.PI);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText('TAD BOUNDARY OPEN: SUPER-ENHANCER ACTIVATING ONCOGENE', 150, cy - 65);
      } else {
        // Boundary CLOSED: Cas12pi 28-aa effector acts as an impenetrable wall (Green Secure)
        ctx.fillStyle = '#22c55e';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 6.5px monospace';
        ctx.fillText('28aa', cx - 9, cy + 2.5);

        // Vertical Boundary Shield Wall
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 70); ctx.lineTo(cx, cy + 70);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('TAD BOUNDARY CLOSED: ONCOGENE INSULATED & SILENCED', 160, cy - 80);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12π (Type V-Pi, 28-aa): BOUNDARY = ${tadBoundaryState.toUpperCase()} | SWITCHING FIDELITY = ${switchingFidelityPercent}% (DOUDNA & WENDY BICKMORE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tadBoundaryState, switchingFidelityPercent, isTogglingBoundary]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12π // 28-aa TAD BOUNDARY SWITCHER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA, DAVID LIU & WENDY BICKMORE (EDINBURGH & BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-30-aa historic record micro-effector & inducible 3D chromatin boundary switch for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleBoundaryState}
            disabled={isTogglingBoundary}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTogglingBoundary ? 'SWITCHING TAD BOUNDARY...' : `TOGGLE BOUNDARY: [${tadBoundaryState.toUpperCase()}]`}</span>
          </button>
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
              <span className="text-pink-400 font-bold">SIZE: 28-aa (SUB-30-aa RECORD)</span>
              <span className="text-cyan-400 font-bold">STATE: {tadBoundaryState.toUpperCase()}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {switchingFidelityPercent}%</span>
            </div>
            <div>STATUS: {tadBoundaryState === 'closed' ? 'ONCOGENIC ENHANCER INSULATED' : 'ENHANCER-PROMOTER CONTACT ACTIVE'}</div>
          </div>
        </div>

        {/* Cas12pi Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TAD SWITCHER
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>28-aa Sub-30-aa Historic Record:</strong> Cas12π is the world's smallest known programmable protein effector (28 amino acids), acting as an inducible TAD boundary switcher!</div>
            <div>• <strong>Real-Time Chromatin Rewiring:</strong> Toggles topologically associating domain boundaries on demand, dynamically blocking or restoring super-enhancer loops!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
