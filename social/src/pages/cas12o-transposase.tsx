import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, PackagePlus
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12oTransposase() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [biosyntheticCargoSizeKb, setBiosyntheticCargoSizeKb] = useState(8.5); // 8.5 kb polyketide synthase cluster
  const [transpositionAccuracy, setTranspositionAccuracy] = useState(25); // 25% -> 97.4%
  const [isTransposing, setIsTransposing] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12oTransposition = () => {
    uiaudio.warp();
    setIsTransposing(true);

    setTimeout(() => {
      setIsTransposing(false);
      setTranspositionAccuracy(97.8);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setTranspositionAccuracy(25);
    setIsTransposing(false);
  };

  // CRISPR-Cas12o (Type V-O) CAST Multi-Kilobase Transposition Canvas
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

      // Safe-Harbor Genomic Strand (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // Transposition Insertion Safe Harbor (Center: 290 to 450)
      const isIntegrated = transpositionAccuracy > 50;
      ctx.fillStyle = isIntegrated ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(290, cy - 58, 160, 36);
      ctx.strokeRect(290, cy - 58, 160, 36);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isIntegrated ? `INTEGRATED (${biosyntheticCargoSizeKb} kb BGC)` : 'SAFE HARBOR TARGET', 298, cy - 36);

      // Hyper-Compact Cas12o TnsB/TnsC Transposase Core (450-aa) at Target (cy + 35)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isTransposing ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy + 35, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cas12o', 346, cy + 39);

      // Multi-Kilobase Transposon Element with Flanking Inverted Repeats (Left: 120, cy + 35)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(130, cy + 35, 28, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Tn-CARGO', 108, cy + 32);
      ctx.fillText(`${biosyntheticCargoSizeKb} kb BGC`, 108, cy + 46);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12o CAST: CARGO = ${biosyntheticCargoSizeKb} kb BGC | TRANSPOSITION ACCURACY = ${transpositionAccuracy}% (DOUDNA & STERNBERG)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [biosyntheticCargoSizeKb, transpositionAccuracy, isTransposing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <PackagePlus className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
                CRISPR-CAS12O // 450-aa RNA-GUIDED TRANSPOSASE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                DOUDNA & STERNBERG (COLUMBIA & UC BERKELEY)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              DSB-free multi-kilobase gene cluster integration & safe-harbor targeting for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12oTransposition}
            disabled={isTransposing || transpositionAccuracy > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTransposing ? 'INTEGRATING TRANSPOSON...' : 'EXECUTE CAS12O TRANSPOSITION'}</span>
          </button>

          {transpositionAccuracy > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 450-aa (TYPE V-O)</span>
              <span className="text-amber-400 font-bold">CARGO: {biosyntheticCargoSizeKb} kb BGC</span>
              <span className="text-emerald-400 font-bold">ACCURACY: {transpositionAccuracy}%</span>
            </div>
            <div>STATUS: {transpositionAccuracy > 50 ? 'TARGETED CARGO INTEGRATED - ZERO INDELS' : 'PRE-INSERTION'}</div>
          </div>
        </div>

        {/* Cas12o Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CAST TRANSPOSASE PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Micro-CAST Effector:</strong> At only 450 amino acids, Cas12o coordinates TnsB/TnsC integration machinery with single-guide RNA precision!</div>
            <div>• <strong>Large Cargo Capacity:</strong> Seamlessly inserts whole 8.5 kb biosynthetic operons directly into genomic safe harbors without double-strand break intermediates!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
