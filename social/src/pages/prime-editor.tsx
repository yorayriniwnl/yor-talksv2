import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, Layers, Dna
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PrimeEditor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [targetSequence, setTargetSequence] = useState('ATTCG-G-AAT');
  const [editedSequence, setEditedSequence] = useState('ATTCG-C-AAT'); // Single base conversion G->C
  const [editingEfficiencyPct, setEditingEfficiencyPct] = useState(68.4);
  const [primeFlapSynthesized, setPrimeFlapSynthesized] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerPrimeSynthesis = () => {
    uiaudio.warp();
    setPrimeFlapSynthesized(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setPrimeFlapSynthesized(false);
  };

  // Prime Editing Cas9-Nickase RT Canvas
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

      // Target Double-Stranded DNA
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Upper strand
      ctx.moveTo(60, cy - 30);
      ctx.lineTo(canvas.width - 60, cy - 30);
      // Lower strand
      ctx.moveTo(60, cy + 30);
      ctx.lineTo(canvas.width - 60, cy + 30);
      ctx.stroke();

      // Cas9 H840A Nickase + M-MLV Reverse Transcriptase Protein Fusion Complex (Green / Emerald)
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx - 30, cy, 140, 90, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Reverse Transcriptase Domain (Cyan lobe)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.strokeStyle = '#06b6d4';
      ctx.beginPath();
      ctx.ellipse(cx + 80, cy - 10, 70, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // pegRNA (Prime Editing Guide RNA) loop in Magenta
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(cx - 110, cy - 30);
      ctx.quadraticCurveTo(cx - 50, cy - 90, cx + 50, cy - 20);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Synthesized 3' Edited DNA Flap (Yellow)
      if (primeFlapSynthesized) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(cx + 20, cy + 30);
        ctx.lineTo(cx + 120, cy + 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [primeFlapSynthesized]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Scissors className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                PRIME EDITING // SEARCH-AND-REPLACE GENOME EDITING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                NO DOUBLE-STRAND BREAKS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Cas9 nickase & engineered reverse transcriptase template extension for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerPrimeSynthesis}
            disabled={primeFlapSynthesized}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{primeFlapSynthesized ? 'EDITED 3-FLAP INTEGRATED' : 'SYNTHESIZE EDITED FLAP (RT)'}</span>
          </button>

          {primeFlapSynthesized && (
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
              <span className="text-emerald-400 font-bold">MUTATION: G → C TRANSVERSION</span>
              <span className="text-cyan-400 font-bold">EFFICIENCY: {editingEfficiencyPct}%</span>
            </div>
            <div>STATUS: {primeFlapSynthesized ? 'PE3 RESOLUTION COMPLETE' : 'PRIMER-BINDING HYBRIDIZED'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PRIME EDITING 3 (PE3)
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>David Liu 2019:</strong> Directly writes new genetic information into a specified DNA site without double-stranded breaks or donor DNA templates.</div>
            <div>• Can perform all 12 base-to-base conversions, insertions, and targeted deletions.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
