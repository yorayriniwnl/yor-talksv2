import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, BoxSelect
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12yTransposon() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [integratedPathwayKilobases, setIntegratedPathwayKilobases] = useState(15); // 15 kb pathway
  const [transpositionEfficiency, setTranspositionEfficiency] = useState(25); // 25% -> 99.6%
  const [isTransposing, setIsTransposing] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12yTransposition = () => {
    uiaudio.warp();
    setIsTransposing(true);

    setTimeout(() => {
      setIsTransposing(false);
      setTranspositionEfficiency(99.6);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setTranspositionEfficiency(25);
    setIsTransposing(false);
  };

  // CRISPR-Cas12y (Type V-Y, 245-aa) Search-and-Replace Transposon Canvas
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

      // Host Genomic Safe-Harbor DNA Strand (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // Flanking Host Loci (AAVS1 Safe-Harbor)
      ctx.fillStyle = '#334155';
      ctx.fillRect(100, cy - 56, 110, 32);
      ctx.fillRect(490, cy - 56, 110, 32);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('AAVS1 5-PRIME', 114, cy - 36);
      ctx.fillText('AAVS1 3-PRIME', 504, cy - 36);

      // Integrated Mega-Pathway Payload (+15 kb)
      const isIntegrated = transpositionEfficiency > 50;
      ctx.fillStyle = isIntegrated ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(230, cy - 58, 240, 36);
      ctx.strokeRect(230, cy - 58, 240, 36);

      ctx.fillStyle = isIntegrated ? '#000000' : '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(
        isIntegrated ? `+${integratedPathwayKilobases}kb FULL SYNTHETIC PATHWAY` : `PROGRAMMABLE TnsA/B-Cas12y COMPLEX`,
        240,
        cy - 36
      );

      // Ultra-Miniature Cas12y Monomer (245-aa) at Target (350, cy + 35)
      ctx.fillStyle = '#a855f7';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isTransposing ? 24 : 8;
      ctx.beginPath();
      ctx.arc(350, cy + 35, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Cas12y', 334, cy + 38);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12y (Type V-Y, 245-aa): PATHWAY SIZE = ${integratedPathwayKilobases} kb | TRANSPOSITION EFFICIENCY = ${transpositionEfficiency}% (DOUDNA & STERNBERG)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [integratedPathwayKilobases, transpositionEfficiency, isTransposing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <BoxSelect className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-sky-300 to-pink-400">
                CRISPR-CAS12Y // 245-aa PRIME TRANSPOSON
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA & STERNBERG (UC BERKELEY & COLUMBIA)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-250-aa world record micro-effector & 15 kb pathway transposition for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12yTransposition}
            disabled={isTransposing || transpositionEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTransposing ? 'INTEGRATING 15 kb PATHWAY...' : 'TRANSPOSE SYNTHETIC PATHWAY'}</span>
          </button>

          {transpositionEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 245-aa (RECORD-BREAKING MINIATURIZATION)</span>
              <span className="text-cyan-400 font-bold">CARGO: +{integratedPathwayKilobases} kb</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {transpositionEfficiency}%</span>
            </div>
            <div>STATUS: {transpositionEfficiency > 50 ? 'SAFE-HARBOR PATHWAY INTEGRATION COMPLETE' : 'PROGRAMMABLE CAST COMPLEX READY'}</div>
          </div>
        </div>

        {/* Cas12y Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PRIME TRANSPOSON PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Record 245-aa Footprint:</strong> Cas12y shatters molecular size records (under 250-aa), allowing complete multi-gene metabolic pathways (+15 kb) to be delivered into human cells!</div>
            <div>• <strong>Double-Strand Break Free:</strong> Directs TnsA/B transposases to insert large multi-gene clusters directly into safe-harbor genomic sites without mutagenic DNA cleavage!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
