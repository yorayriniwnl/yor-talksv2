import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RnaiStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [sirnaLengthNt, setSirnaLengthNt] = useState(21); // 21-nt siRNA duplex with 2-nt 3' overhangs
  const [cleaved, setCleaved] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerRnaiCleavage = () => {
    uiaudio.warp();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setCleaved(true);
      uiaudio.success();
    }, 900);
  };

  const handleReset = () => {
    uiaudio.click();
    setCleaved(false);
    setIsProcessing(false);
  };

  // Dicer Ribonuclease III & Argonaute-2 (Ago2) RISC Cleavage Canvas
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

      // Dark Cytoplasmic Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Target Viral mRNA Strand (Single Strand moving across)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (!cleaved) {
        ctx.moveTo(60, cy); ctx.lineTo(canvas.width - 60, cy);
      } else {
        // Post-Transcriptional Cleavage in Two Halves
        ctx.moveTo(60, cy - 20); ctx.lineTo(cx - 20, cy - 20);
        ctx.moveTo(cx + 20, cy + 20); ctx.lineTo(canvas.width - 60, cy + 20);
      }
      ctx.stroke();

      // RISC / Argonaute-2 (Ago2) Catalytic Domain (Center cx, cy - 40)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isProcessing ? 20 : 8;
      ctx.beginPath();
      ctx.arc(cx, cy - 35, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Ago2 RISC', cx - 24, cy - 65);

      // 21-nt Guide siRNA duplex bound into Ago2 catalytic cleft (Golden Duplex)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 35, cy - 10); ctx.lineTo(cx + 35, cy - 10);
      ctx.stroke();

      // Scissor Cleavage Animation when processing
      if (isProcessing) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy - 25); ctx.lineTo(cx + 15, cy + 25);
        ctx.moveTo(cx + 15, cy - 25); ctx.lineTo(cx - 15, cy + 25);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (cleaved) {
        ctx.fillText('TARGET mRNA ENDONUCLEOLYTICALLY CLEAVED: POST-TRANSCRIPTIONAL SILENCING (100%)', 90, cy + 110);
      } else {
        ctx.fillText('INTACT VIRAL/ONCOGENIC mRNA TARGETED BY 21-nt GUIDE siRNA', 150, cy + 110);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cleaved, isProcessing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Scissors className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                RNA INTERFERENCE // DICER & ARGONAUTE-2 RISC CLEAVAGE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                NOBEL PRIZE 2006 (FIRE & MELLO)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              21-nt siRNA duplex loading & targeted mRNA endonucleolytic destruction for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerRnaiCleavage}
            disabled={isProcessing || cleaved}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-amber-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isProcessing ? 'Ago2 CLEAVING TARGET mRNA...' : 'EXECUTE Ago2 mRNA CLEAVAGE'}</span>
          </button>

          {cleaved && (
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
              <span className="text-pink-400 font-bold">siRNA DUPLEX: {sirnaLengthNt} nt</span>
              <span className="text-cyan-400 font-bold">COMPLEX: Ago2-RISC</span>
            </div>
            <div>STATUS: {cleaved ? 'mRNA DEGRADED (GENE SILENCED)' : 'SURVEILLANCE'}</div>
          </div>
        </div>

        {/* RNAi Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            RNAi MECHANISM
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dicer Dicing:</strong> Long double-stranded RNA is diced into 21-23 nt siRNAs with characteristic 2-nt 3' overhangs by Dicer endoribonuclease!</div>
            <div>• <strong>RISC Slicing:</strong> The guide strand guides Argonaute-2 to slice complementary mRNAs exactly between nucleotides 10 and 11 from the 5' guide end!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
