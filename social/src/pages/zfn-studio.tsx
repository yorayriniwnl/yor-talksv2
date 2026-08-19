import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, Layers, Dna
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ZfnStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fingerCount, setFingerCount] = useState(4); // 4 fingers = 12 bp recognition
  const [cleaved, setCleaved] = useState(false);
  const [targetSequence, setTargetSequence] = useState('5\'- GCG-GAA-GTC-GCT -3\'');

  const animFrameRef = useRef<number | null>(null);

  const triggerZfnCleavage = () => {
    uiaudio.warp();
    setCleaved(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setCleaved(false);
  };

  // ZFN Protein Dimer & FokI Catalytic Domain Canvas
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

      // Target Genomic Double-Stranded DNA
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Left unbroken strand or cleaved break
      ctx.moveTo(40, cy);
      if (cleaved) {
        ctx.lineTo(cx - 20, cy);
        ctx.moveTo(cx + 20, cy);
        ctx.lineTo(canvas.width - 40, cy);
      } else {
        ctx.lineTo(canvas.width - 40, cy);
      }
      ctx.stroke();

      // Left Zinc Finger Array (4 Cys2His2 finger motifs in Emerald)
      for (let i = 0; i < fingerCount; i++) {
        const fx = cx - 180 + i * 36;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(fx, cy - 25, 15, 22, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Coordinated Zn2+ Ion (Yellow bead)
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(fx, cy - 25, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Right Zinc Finger Array (4 Cys2His2 finger motifs in Emerald)
      for (let i = 0; i < fingerCount; i++) {
        const fx = cx + 80 + i * 36;
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(fx, cy + 25, 15, 22, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Coordinated Zn2+ Ion
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(fx, cy + 25, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Dimerized FokI Nuclease Catalytic Domains (Purple/Magenta lobes meeting in middle)
      ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = cleaved ? 25 : 10;

      // Left FokI Monomer
      ctx.beginPath();
      ctx.arc(cx - 20, cy - 20, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Right FokI Monomer
      ctx.beginPath();
      ctx.arc(cx + 20, cy + 20, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Cleavage Spark at double strand break point
      if (cleaved) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cleaved, fingerCount]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Scissors className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                ZINC FINGER NUCLEASE // MODULAR Cys2His2 DNA CLEAVAGE (ZFN)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                FokI DIMERIZATION
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Modular 3 bp triplet recognition & double-strand break targeted cleavage for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerZfnCleavage}
            disabled={cleaved}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{cleaved ? 'TARGET DNA DOUBLE-STRAND BROKEN' : 'TRIGGER FokI CLEAVAGE'}</span>
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
              <span className="text-emerald-400 font-bold">FINGER MOTIFS: {fingerCount} per arm</span>
              <span className="text-cyan-400 font-bold">TARGET SPECIFICITY: {fingerCount * 3 * 2} bp</span>
            </div>
            <div>STATUS: {cleaved ? 'DOUBLE-STRAND BREAK (FokI DIMER)' : 'Cys2His2 Zn-COORDINATED'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            ZFN BIOTECHNOLOGY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Modular Design:</strong> Each Cys2His2 zinc finger motif specifically binds a distinct 3 bp DNA triplet via residues in its alpha-helix.</div>
            <div>• <strong>FokI Dimerization:</strong> Cleavage strictly requires two ZFN monomers binding on opposite strands with 5-7 bp spacer spacing, ensuring extreme specificity!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
