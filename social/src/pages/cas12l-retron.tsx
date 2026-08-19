import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, GitFork, RefreshCw
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12lRetron() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [retronDonorAbundance, setRetronDonorAbundance] = useState(1500); // 1,500 msDNA donor copies/cell
  const [recombineeringEfficiency, setRecombineeringEfficiency] = useState(12); // 12% -> 91.5%
  const [isRecombineering, setIsRecombineering] = useState(false);
  const [mutagenesisLibrarySize, setMutagenesisLibrarySize] = useState(100000); // 100k distinct mutants

  const animFrameRef = useRef<number | null>(null);

  const triggerRetronRecombineering = () => {
    uiaudio.warp();
    setIsRecombineering(true);

    setTimeout(() => {
      setIsRecombineering(false);
      setRecombineeringEfficiency(91.8);
      uiaudio.success();
    }, 800);
  };

  const handleReset = () => {
    uiaudio.click();
    setRecombineeringEfficiency(12);
    setIsRecombineering(false);
  };

  // Coupled Retron-RT msDNA & Cas12l Nickase Canvas
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

      // Bacterial msDNA Retron Hairpin Loop (Top Left at 140, cy - 70)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(140, cy - 80, 25, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('msDNA RETRON DONOR', 85, cy - 115);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${retronDonorAbundance} copies/cell`, 95, cy - 50);

      // Host Chromosomal DNA Double Strand (Center Horizontal Strand)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(80, cy + 30); ctx.lineTo(canvas.width - 80, cy + 30);
      ctx.stroke();

      // Miniaturized Cas12l Nickase (390-aa) at (380, cy + 15)
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = isRecombineering ? 22 : 6;
      ctx.beginPath();
      ctx.arc(380, cy + 15, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Cas12l', 365, cy + 18);

      // Mutated Recombineered Allele Insertion Site
      ctx.fillStyle = recombineeringEfficiency > 80 ? '#22c55e' : '#f59e0b';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(380, cy + 30, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `RETRON-Cas12l MUTAGENESIS: IN VIVO RECOMBINEERING = ${recombineeringEfficiency}% | LIBRARY = ${mutagenesisLibrarySize.toLocaleString()} VARIANTS`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [retronDonorAbundance, recombineeringEfficiency, mutagenesisLibrarySize, isRecombineering]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <RefreshCw className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-indigo-300 to-cyan-400">
                CRISPR-CAS12L // RETRON CONTINUOUS IN VIVO RECOMBINEERING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                FARZADFARD & TIMOTHY LU (MIT SYNTHETIC BIO)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Continuous in vivo msDNA generation & Cas12l nickase-mediated evolution for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerRetronRecombineering}
            disabled={isRecombineering || recombineeringEfficiency > 80}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isRecombineering ? 'GENERATING msDNA & RECOMBINEERING...' : 'TRIGGER CONTINUOUS RECOMBINEERING'}</span>
          </button>

          {recombineeringEfficiency > 80 && (
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
              <span className="text-pink-400 font-bold">RETRON msDNA: {retronDonorAbundance} / cell</span>
              <span className="text-cyan-400 font-bold">NICKASE: Cas12l (390 aa)</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {recombineeringEfficiency}%</span>
            </div>
            <div>STATUS: {recombineeringEfficiency > 80 ? 'HIGH-THROUGHPUT DIRECTED EVOLUTION ACTIVE' : 'EXPRESSING'}</div>
          </div>
        </div>

        {/* Cas12l Retron Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CONTINUOUS EVOLUTION
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Zero Exogenous DNA Transfection:</strong> Retrons continuously reverse-transcribe thousands of single-stranded donor DNA copies directly inside living cells!</div>
            <div>• <strong>Cas12l Nickase Bias:</strong> Single-strand nicks created by Cas12l drastically bias chromosomal incorporation toward the retron donor, enabling continuous directed evolution!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
