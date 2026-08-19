import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Shuffle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ScrambleStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [estradiolConcentrationNm, setEstradiolConcentrationNm] = useState(500); // 500 nM beta-estradiol inducer
  const [isScrambling, setIsScrambling] = useState(false);
  const [recombinationEvents, setRecombinationEvents] = useState(0);
  const [fitnessGainPercent, setFitnessGainPercent] = useState(0);

  const animFrameRef = useRef<number | null>(null);

  const triggerCreScramble = () => {
    uiaudio.warp();
    setIsScrambling(true);

    setTimeout(() => {
      setIsScrambling(false);
      setRecombinationEvents(r => r + Math.floor(estradiolConcentrationNm / 15));
      setFitnessGainPercent(f => Math.min(350, f + Math.floor(Math.random() * 45 + 15)));
      uiaudio.success();
    }, 850);
  };

  const handleReset = () => {
    uiaudio.click();
    setRecombinationEvents(0);
    setFitnessGainPercent(0);
    setIsScrambling(false);
  };

  // Synthetic Yeast Sc2.0 SCRaMbLE Chromosomal Rearrangement Canvas
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

      // Dark Yeast Nucleus Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Synthetic Chromosome SynIII / SynVI Arm Segments (Segmented colored blocks)
      const colors = ['#06b6d4', '#ec4899', '#f59e0b', '#22c55e', '#a855f7', '#3b82f6'];

      // Draw Synthetic Chromosome Backbone with loxPsym Junctions
      for (let i = 0; i < 6; i++) {
        const segWidth = 85;
        const x = 90 + i * (segWidth + 12);
        const y = cy - 25;

        // Chromosome Gene Block
        ctx.fillStyle = colors[(i + recombinationEvents) % colors.length];
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isScrambling ? 15 : 4;
        ctx.fillRect(x, y, segWidth, 50);
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`GENE_${i + 1}`, x + 20, y + 28);

        // Symmetric loxPsym Site (Red Diamond Recombination Junction)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(x + segWidth + 6, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `Sc2.0 SCRaMbLE: ${recombinationEvents} IN VIVO RECOMBINATIONS | FITNESS GAIN: +${fitnessGainPercent}% (THERMOTOLERANCE)`,
        80,
        cy + 130
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [recombinationEvents, fitnessGainPercent, isScrambling]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Shuffle className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                SC2.0 SCRAMBLE // INDUCIBLE GENOME RESTRUCTURING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SYNTHETIC YEAST 2.0 (JEF BOEKE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              loxPsym-mediated in vivo massive chromosomal scrambling & directed evolution for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCreScramble}
            disabled={isScrambling}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isScrambling ? 'INDUCING CRE-EBD TRANSLOCATION...' : 'PULSE ESTRADIOL TO SCRAMBLE'}</span>
          </button>

          {recombinationEvents > 0 && (
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
              <span className="text-cyan-400 font-bold">ESTRADIOL: {estradiolConcentrationNm} nM</span>
              <span className="text-pink-400 font-bold">EVENTS: {recombinationEvents}</span>
              <span className="text-emerald-400 font-bold">FITNESS: +{fitnessGainPercent}%</span>
            </div>
            <div>STATUS: VIABLE ACCELERATED PHENOTYPIC EVOLUTION</div>
          </div>
        </div>

        {/* SCRaMbLE Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              INDUCER CONCENTRATION
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>β-Estradiol (nM):</span>
              <span className="text-cyan-400 font-bold">{estradiolConcentrationNm} nM</span>
            </div>
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={estradiolConcentrationNm}
              onChange={(e) => setEstradiolConcentrationNm(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Symmetric loxPsym Sites:</strong> Inserted downstream of all non-essential genes, allowing Cre recombinase to execute bidirectional inversions, deletions, and translocations!</div>
            <div>• <strong>Evolution on Demand:</strong> Generates millions of complex karyotypic variants in a single tube to screen for extreme stress, ethanol, and thermal tolerance!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
