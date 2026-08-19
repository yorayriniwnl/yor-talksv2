import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, HeartPulse
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12nHiti() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cargoPayloadSizeKb, setCargoPayloadSizeKb] = useState(4.5); // 4.5 kb therapeutic cDNA payload
  const [hitiInsertionEfficiency, setHitiInsertionEfficiency] = useState(18); // 18% -> 94.2%
  const [isInserting, setIsInserting] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerHitiInsertion = () => {
    uiaudio.warp();
    setIsInserting(true);

    setTimeout(() => {
      setIsInserting(false);
      setHitiInsertionEfficiency(94.8);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setHitiInsertionEfficiency(18);
    setIsInserting(false);
  };

  // CRISPR-Cas12n (Type V-N) Single-Strand Nickase & HITI In Vivo Insertion Canvas
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

      // Dark Non-Dividing Neuronal Nucleus Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Target Genomic Strand (80 to 660, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(canvas.width - 80, cy - 40);
      ctx.stroke();

      // HITI Therapeutic Integration Locus (Center: 300 to 440)
      const isInserted = hitiInsertionEfficiency > 50;
      ctx.fillStyle = isInserted ? '#22c55e' : '#ef4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fillRect(300, cy - 58, 140, 36);
      ctx.strokeRect(300, cy - 58, 140, 36);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(isInserted ? `HITI INTEGRATED (${cargoPayloadSizeKb} kb)` : 'TARGET NICKING LOCUS', 308, cy - 36);

      // Hyper-Compact Cas12n Nickase (420-aa) at Locus (cy + 35)
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = isInserting ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy + 35, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cas12n', 348, cy + 39);

      // Donor HITI Plasmid Payload (Left: 120, cy + 35)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(130, cy + 35, 26, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('DONOR cDNA', 105, cy + 32);
      ctx.fillText(`${cargoPayloadSizeKb} kb HITI`, 108, cy + 46);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12n NICKASE: PAYLOAD = ${cargoPayloadSizeKb} kb | NON-DIVIDING CELL HITI EFFICIENCY = ${hitiInsertionEfficiency}% (LIU & ZHANG)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cargoPayloadSizeKb, hitiInsertionEfficiency, isInserting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <HeartPulse className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                CRISPR-CAS12N // ULTRA-COMPACT NICKASE & HITI INSERTION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DAVID LIU & FENG ZHANG (BROAD & HARVARD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sequence-specific ssDNA nicking & Homology-Independent Targeted Insertion (HITI) for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerHitiInsertion}
            disabled={isInserting || hitiInsertionEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isInserting ? 'INTEGRATING HITI PAYLOAD...' : 'DELIVER CAS12N HITI VECTOR'}</span>
          </button>

          {hitiInsertionEfficiency > 50 && (
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
              <span className="text-emerald-400 font-bold">SIZE: 420-aa MONOMER</span>
              <span className="text-amber-400 font-bold">PAYLOAD: {cargoPayloadSizeKb} kb</span>
              <span className="text-cyan-400 font-bold">HITI EFFICIENCY: {hitiInsertionEfficiency}%</span>
            </div>
            <div>STATUS: {hitiInsertionEfficiency > 50 ? 'SEAMLESS PAYLOAD INTEGRATED IN NON-DIVIDING CELLS' : 'PRE-INTEGRATION'}</div>
          </div>
        </div>

        {/* Cas12n Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            HITI NICKASE PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Type V-N Nickase Architecture:</strong> Natural single-strand nicking activity avoids cytotoxic double-strand breaks while activating cellular non-homologous end joining pathways!</div>
            <div>• <strong>Non-Dividing Tissue Integration:</strong> Unlocks robust gene knock-ins in mature post-mitotic neurons, cardiomyocytes, and photoreceptors in vivo!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
