import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, GitCommit
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12sBaseEditor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [dualBaseEditingEfficiency, setDualBaseEditingEfficiency] = useState(28); // 28% -> 99.4%
  const [targetNucleotideWindow, setTargetNucleotideWindow] = useState('C-to-T & A-to-G');
  const [isEditing, setIsEditing] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12sDualEdit = () => {
    uiaudio.warp();
    setIsEditing(true);

    setTimeout(() => {
      setIsEditing(false);
      setDualBaseEditingEfficiency(99.4);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setDualBaseEditingEfficiency(28);
    setIsEditing(false);
  };

  // CRISPR-Cas12s (Type V-S, 350-aa) Dual-Base Editor Canvas
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

      // Target Genomic DNA Strand (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // Nucleotide Base Sequence (8 bases)
      const bases = ['A', 'C', 'G', 'T', 'C', 'A', 'G', 'T'];
      bases.forEach((b, i) => {
        const bx = 160 + i * 55;
        const isTarget = (i === 1 || i === 5); // Bases undergoing editing
        const isConverted = dualBaseEditingEfficiency > 50;

        ctx.fillStyle = isTarget ? (isConverted ? '#22c55e' : '#ef4444') : '#334155';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.fillRect(bx - 18, cy - 58, 36, 36);
        ctx.strokeRect(bx - 18, cy - 58, 36, 36);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        let displayBase = b;
        if (isTarget && isConverted) {
          displayBase = (b === 'C' ? 'T' : 'G');
        }
        ctx.fillText(displayBase, bx - 4, cy - 35);
      });

      // Hyper-Compact Cas12s Monomer (350-aa) at Editing Window (320, cy + 35)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isEditing ? 24 : 8;
      ctx.beginPath();
      ctx.arc(350, cy + 35, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Cas12s', 332, cy + 38);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12s (Type V-S, 350-aa): DUAL EDIT WINDOW = ${targetNucleotideWindow} | EDITING EFFICIENCY = ${dualBaseEditingEfficiency}% (DAVID LIU & DOUDNA)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dualBaseEditingEfficiency, targetNucleotideWindow, isEditing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <GitCommit className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12S // 350-aa DUAL BASE EDITOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DAVID LIU & DOUDNA (BROAD & UC BERKELEY)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Smallest known Type V nuclease & single-AAV dual C-to-T / A-to-G base transition for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12sDualEdit}
            disabled={isEditing || dualBaseEditingEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEditing ? 'DEAMINATING BASES...' : 'TRIGGER DUAL BASE TRANSITION'}</span>
          </button>

          {dualBaseEditingEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 350-aa (SMALLEST CAS EFFECTOR)</span>
              <span className="text-cyan-400 font-bold">WINDOW: {targetNucleotideWindow}</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {dualBaseEditingEfficiency}%</span>
            </div>
            <div>STATUS: {dualBaseEditingEfficiency > 50 ? 'SIMULTANEOUS C-TO-T & A-TO-G CONVERTED' : 'WILDTYPE NUCLEOTIDES'}</div>
          </div>
        </div>

        {/* Cas12s Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            BASE EDITOR PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Miniature 350-aa Monomeric Architecture:</strong> The ultra-compact size fits easily into a single standard AAV vector alongside engineered TadA-8e and cytidine deaminase enzymes!</div>
            <div>• <strong>No Double-Strand Breaks:</strong> Catalytically nick-free base editing completely prevents translocations, large indels, and p53 apoptotic activation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
