import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12mMultiplex() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [baseEditMode, setBaseEditMode] = useState<'C_to_T_Deamination' | 'A_to_G_Deamination' | 'Dual_CBE_ABE_Multiplex'>('Dual_CBE_ABE_Multiplex');
  const [multiplexPurityRatio, setMultiplexPurityRatio] = useState(24); // 24% -> 98.4%
  const [isBaseEditing, setIsBaseEditing] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerMultiplexBaseEdit = () => {
    uiaudio.warp();
    setIsBaseEditing(true);

    setTimeout(() => {
      setIsBaseEditing(false);
      setMultiplexPurityRatio(98.6);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setMultiplexPurityRatio(24);
    setIsBaseEditing(false);
  };

  // CRISPR-Cas12m (380-aa) Dual Base Editing & Demethylation Canvas
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

      // Target Metabolic Gene Locus (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // Dual Transition Loci: Locus 1 (C->T) & Locus 2 (A->G)
      const loci = [
        { name: multiplexPurityRatio > 50 ? 'T (EDITED)' : 'C (CYTOSINE)', x: 230, color: multiplexPurityRatio > 50 ? '#22c55e' : '#ef4444' },
        { name: multiplexPurityRatio > 50 ? 'G (EDITED)' : 'A (ADENINE)', x: 510, color: multiplexPurityRatio > 50 ? '#22c55e' : '#ef4444' }
      ];

      loci.forEach((l) => {
        ctx.fillStyle = l.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fillRect(l.x - 55, cy - 62, 110, 38);
        ctx.strokeRect(l.x - 55, cy - 62, 110, 38);

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(l.name, l.x - 42, cy - 38);
      });

      // Hyper-Compact Cas12m Monomer (380-aa) at Locus 1 & 2 (cy + 35)
      [230, 510].forEach((lx) => {
        ctx.fillStyle = '#ec4899';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = isBaseEditing ? 22 : 6;
        ctx.beginPath();
        ctx.arc(lx, cy + 35, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('Cas12m', lx - 18, cy + 39);
      });

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12m (380-aa): MODE = ${baseEditMode} | DUAL TRANSITION PURITY = ${multiplexPurityRatio}% | INDEL-FREE (NO-DSB)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [baseEditMode, multiplexPurityRatio, isBaseEditing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Feather className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
                CRISPR-CAS12M // 380-aa MULTIPLEX BASE EDITING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                DAVID LIU & FENG ZHANG (BROAD & HARVARD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Simultaneous C-to-T & A-to-G transition editing & epigenetic multiplexing for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMultiplexBaseEdit}
            disabled={isBaseEditing || multiplexPurityRatio > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBaseEditing ? 'DEAMINATING DUAL LOCI...' : 'EXECUTE MULTIPLEX BASE EDIT'}</span>
          </button>

          {multiplexPurityRatio > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 380-aa (SMALLEST KNOWN)</span>
              <span className="text-cyan-400 font-bold">MODE: {baseEditMode}</span>
              <span className="text-emerald-400 font-bold">PURITY: {multiplexPurityRatio}%</span>
            </div>
            <div>STATUS: {multiplexPurityRatio > 50 ? 'CLEAN TRANSITION - ZERO INDELS' : 'STANDBY'}</div>
          </div>
        </div>

        {/* Cas12m Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            BASE EDITING PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Micro-Sized RNA-Guided Effector:</strong> At only 380 amino acids, Cas12m is over 70% smaller than SpCas9, leaving massive capacity for tandem deaminase and epigenetic domains!</div>
            <div>• <strong>Tandem Dual-Base Transitions:</strong> Mediates simultaneous C-to-T and A-to-G transition editing with single-nucleotide precision without causing chromosomal translocations!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
