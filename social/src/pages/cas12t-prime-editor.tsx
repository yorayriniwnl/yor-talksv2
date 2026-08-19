import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, PlusCircle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12tPrimeEditor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [insertedSequenceLengthBp, setInsertedSequenceLengthBp] = useState(24); // 24 bp target prime insertion
  const [primeEditingEfficiency, setPrimeEditingEfficiency] = useState(26); // 26% -> 99.2%
  const [isPrimeWriting, setIsPrimeWriting] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12tPrimeEdit = () => {
    uiaudio.warp();
    setIsPrimeWriting(true);

    setTimeout(() => {
      setIsPrimeWriting(false);
      setPrimeEditingEfficiency(99.2);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setPrimeEditingEfficiency(26);
    setIsPrimeWriting(false);
  };

  // CRISPR-Cas12t (Type V-T, 330-aa) All-in-One Prime Editor Canvas
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

      // Flanking Exon DNA Nodes
      ctx.fillStyle = '#334155';
      ctx.fillRect(100, cy - 56, 120, 32);
      ctx.fillRect(480, cy - 56, 120, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('5-PRIME EXON', 125, cy - 36);
      ctx.fillText('3-PRIME EXON', 505, cy - 36);

      // Prime Edited Flap Insertion Region (Center: 240 to 460)
      const isInserted = primeEditingEfficiency > 50;
      ctx.fillStyle = isInserted ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(240, cy - 58, 220, 36);
      ctx.strokeRect(240, cy - 58, 220, 36);

      ctx.fillStyle = isInserted ? '#000000' : '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(
        isInserted ? `+${insertedSequenceLengthBp}bp INSERTION INTEGRATED` : `TARGET NICK (PEG-RNA PE-T)`,
        250,
        cy - 36
      );

      // Hyper-Compact Cas12t-RT Monomer (330-aa) at Nick Site (350, cy + 35)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isPrimeWriting ? 24 : 8;
      ctx.beginPath();
      ctx.arc(350, cy + 35, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Cas12t-RT', 328, cy + 38);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12t (Type V-T, 330-aa): INSERTION CARGO = ${insertedSequenceLengthBp} bp | PRIME EDITING EFFICIENCY = ${primeEditingEfficiency}% (DAVID LIU & DOUDNA)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [insertedSequenceLengthBp, primeEditingEfficiency, isPrimeWriting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <PlusCircle className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
                CRISPR-CAS12T // 330-aa SINGLE-AAV PRIME EDITOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                DAVID LIU & DOUDNA (BROAD & UC BERKELEY)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              World smallest CRISPR nuclease (330-aa) fused with engineered reverse transcriptase for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12tPrimeEdit}
            disabled={isPrimeWriting || primeEditingEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPrimeWriting ? 'REVERSE TRANSCRIBING...' : 'WRITE PRIME INSERTION'}</span>
          </button>

          {primeEditingEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 330-aa (SMALLEST KNOWN NUCLEASE)</span>
              <span className="text-cyan-400 font-bold">CARGO: +{insertedSequenceLengthBp} bp</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {primeEditingEfficiency}%</span>
            </div>
            <div>STATUS: {primeEditingEfficiency > 50 ? 'TARGET INSERTION FULLY INTEGRATED' : 'NICK-DIRECTED FLAP HYBRIDIZATION'}</div>
          </div>
        </div>

        {/* Cas12t Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PRIME EDITOR PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hyper-Compact Type V-T Domain:</strong> Measuring just 330 amino acids, Cas12t solves the single-AAV delivery bottleneck for reverse transcriptase prime editors!</div>
            <div>• <strong>Versatile Insertions & Deletions:</strong> Directly copies genetic edits from the pegRNA template without requiring donor repair DNA or double-strand cuts!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
