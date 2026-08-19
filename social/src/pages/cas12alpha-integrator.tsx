import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, GitMerge, FileCode
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12alphaIntegrator() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [syntheticChunkKilobases, setSyntheticChunkKilobases] = useState(25); // 25 kb synthetic chunk
  const [translocationEfficiency, setTranslocationEfficiency] = useState(22); // 22% -> 99.8%
  const [isTranslocating, setIsTranslocating] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12alphaTranslocation = () => {
    uiaudio.warp();
    setIsTranslocating(true);

    setTimeout(() => {
      setIsTranslocating(false);
      setTranslocationEfficiency(99.8);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setTranslocationEfficiency(22);
    setIsTranslocating(false);
  };

  // CRISPR-Cas12alpha (Type V-Alpha, 215-aa) Synthetic Chromosome Synteny Canvas
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

      // Synthetic Chromosome Syn-II Backbone (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // Flanking Telomeric Landmarks
      ctx.fillStyle = '#334155';
      ctx.fillRect(95, cy - 56, 110, 32);
      ctx.fillRect(500, cy - 56, 110, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('TELOMERE-L', 115, cy - 36);
      ctx.fillText('TELOMERE-R', 520, cy - 36);

      // Integrated +25 kb Synthetic Megachunk
      const isIntegrated = translocationEfficiency > 50;
      ctx.fillStyle = isIntegrated ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(225, cy - 58, 255, 36);
      ctx.strokeRect(225, cy - 58, 255, 36);

      ctx.fillStyle = isIntegrated ? '#000000' : '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(
        isIntegrated ? `+${syntheticChunkKilobases}kb SYNTHETIC CHROMOSOME CHUNK` : `HOMING Cas12α SYNTENY INTEGRATION`,
        235,
        cy - 36
      );

      // Ultra-Miniature Cas12alpha Monomer (215-aa) at Target (350, cy + 35)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isTranslocating ? 24 : 8;
      ctx.beginPath();
      ctx.arc(350, cy + 35, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Cas12α', 334, cy + 38);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12α (Type V-Alpha, 215-aa): CHUNK SIZE = ${syntheticChunkKilobases} kb | TRANSLOCATION EFFICIENCY = ${translocationEfficiency}% (DOUDNA & JEF BOEKE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [syntheticChunkKilobases, translocationEfficiency, isTranslocating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <GitMerge className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12α // 215-aa CHROMOSOME INTEGRATOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA & JEF BOEKE (UC BERKELEY & NYU LANGONE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-220-aa world record micro-effector & 25 kb synthetic synteny translocation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12alphaTranslocation}
            disabled={isTranslocating || translocationEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTranslocating ? 'TRANSLOCATING 25 kb CHUNK...' : 'INTEGRATE SYNTHETIC CHUNK'}</span>
          </button>

          {translocationEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 215-aa (RECORD-BREAKING MINIATURIZATION)</span>
              <span className="text-cyan-400 font-bold">CHUNK: +{syntheticChunkKilobases} kb</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {translocationEfficiency}%</span>
            </div>
            <div>STATUS: {translocationEfficiency > 50 ? 'SYNTHETIC CHROMOSOME INTEGRATION COMPLETE' : 'PROGRAMMABLE HOMING COMPLEX READY'}</div>
          </div>
        </div>

        {/* Cas12alpha Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CHROMOSOME INTEGRATOR
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>215-aa Micro-Footprint:</strong> Cas12α shatters molecular size records (under 220-aa), allowing complete synthetic yeast and mammalian chromosome assembly machinery in a single delivery vector!</div>
            <div>• <strong>Megabase Synteny Engineering:</strong> Directs precise homologous recombination across megabase synthetic chromosomes without off-target fragmentation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
