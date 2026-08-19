import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, RefreshCw
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Sc2Studio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [syntheticChromosome, setSyntheticChromosome] = useState<'synII' | 'synIII' | 'synVI' | 'synXVI'>('synIII');
  const [loxPsymSites, setLoxPsymSites] = useState(48); // 48 loxPsym recombination sites installed
  const [isScrambled, setIsScrambled] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerScramble = () => {
    uiaudio.warp();
    setIsScrambled(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setIsScrambled(false);
  };

  // Synthetic Yeast Sc2.0 Designer Chromosome & SCRaMbLE Canvas
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

      // Dark Nucleus Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Synthetic Chromosome Backbone (synIII Centromere to Telomeres)
      ctx.strokeStyle = isScrambled ? '#ec4899' : '#06b6d4';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(60, cy); ctx.lineTo(canvas.width - 60, cy);
      ctx.stroke();

      // Centromere CEN3 Marker in Center (Purple Sphere)
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CEN3', cx - 10, cy + 3);

      // Installed Symmetrical LoxPsym Sites (Golden Triangles along chromosome)
      const numSites = 14;
      for (let i = 0; i < numSites; i++) {
        const sx = 90 + (i * (canvas.width - 180)) / (numSites - 1);
        if (Math.abs(sx - cx) > 25) {
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = isScrambled ? 15 : 6;
          ctx.beginPath();
          ctx.moveTo(sx, cy - 12);
          ctx.lineTo(sx - 6, cy - 2);
          ctx.lineTo(sx + 6, cy - 2);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // If SCRaMbLE Activated: Cre-recombinase Mediated Inversion & Deletion Loops
      if (isScrambled) {
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        // Inversion loop 1
        ctx.beginPath();
        ctx.arc(cx - 120, cy - 35, 30, 0, Math.PI * 2);
        ctx.stroke();
        // Inversion loop 2
        ctx.beginPath();
        ctx.arc(cx + 120, cy + 35, 30, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('SCRAMBLE COMPLETE: COMBINATORIAL GENOME REARRANGEMENT', cx - 180, cy + 120);
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('DESIGNER SYNTHETIC CHROMOSOME // REPETITIVE ELEMENTS REMOVED', cx - 190, cy + 90);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isScrambled, syntheticChromosome]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-teal-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-400/40">
            <Dna className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400">
                SYNTHETIC YEAST SC2.0 // DESIGNER EUKARYOTIC CHROMOSOMES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                SCRAMBLE DIRECTED EVOLUTION (BOEKE LAB)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              16 synthetic chromosomes, transposon excision & Cre-loxPsym evolution for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerScramble}
            disabled={isScrambled}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", isScrambled && "animate-spin")} />
            <span>{isScrambled ? 'IN VIVO SCRAMBLE EVOLUTION COMPLETED' : 'INDUCIBLE CRE-LOXPSYM SCRAMBLE'}</span>
          </button>

          {isScrambled && (
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
              <span className="text-teal-400 font-bold">CHROMOSOME: {syntheticChromosome}</span>
              <span className="text-amber-400 font-bold">LOXPSYM SITES: {loxPsymSites}</span>
            </div>
            <div>STATUS: {isScrambled ? 'MILLIONS OF COMBINATORIAL EVOLUTION MUTANTS' : 'BOTTOM-UP DESIGNER YEAST'}</div>
          </div>
        </div>

        {/* Chromosome Selection (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SYNTHETIC CHROMOSOMES
          </h3>

          <div className="space-y-2">
            {(['synII', 'synIII', 'synVI', 'synXVI'] as const).map((chr) => (
              <button
                key={chr}
                onClick={() => {
                  setSyntheticChromosome(chr);
                  setIsScrambled(false);
                }}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  syntheticChromosome === chr ? "bg-teal-500/20 border-teal-400 text-teal-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">{chr} Designer Chromosome</div>
                <div className="text-[10px] text-zinc-400">Sc2.0 Fully Synthetic Genome</div>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>World's First Synthetic Eukaryote:</strong> The Sc2.0 consortium replaced all 16 yeast chromosomes with computer-designed sequences, removing unstable transposons and relocating all tRNAs!</div>
            <div>• <strong>SCRaMbLE Evolution:</strong> Inducing Cre recombinase scrambles the loxPsym sites, generating millions of diverse genomes for accelerated bioproduction!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
