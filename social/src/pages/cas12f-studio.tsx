import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Package, Feather
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12fStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [proteinSizeAminoAcids, setProteinSizeAminoAcids] = useState(400); // 400 aa ultra-compact
  const [aavPackagingHeadroomKb, setAavPackagingHeadroomKb] = useState(3.4); // 3.4 kb extra payload space!
  const [isEditing, setIsEditing] = useState(false);
  const [indelEfficiencyPercent, setIndelEfficiencyPercent] = useState(88.4);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12fEditing = () => {
    uiaudio.warp();
    setIsEditing(true);

    setTimeout(() => {
      setIsEditing(false);
      setIndelEfficiencyPercent(96.2);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setIndelEfficiencyPercent(88.4);
    setIsEditing(false);
  };

  // Ultra-Compact Cas12f & AAV Vector Packaging Canvas
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

      // Single AAV Packaging Envelope (4.7 kb Total Limit) at (80 to 660, cy - 70)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.strokeRect(100, cy - 85, 540, 45);

      // Cas12f Gene Payload (Only 1.2 kb - Cyan)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(102, cy - 83, 140, 41);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cas12f (1.2 kb)', 125, cy - 60);

      // sgRNA Expression Cassette (0.4 kb - Purple)
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(245, cy - 83, 50, 41);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('sgRNA', 250, cy - 60);

      // Massive Unused Payload Space for Dual Therapeutic Transgenes (3.1 kb - Emerald)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.strokeStyle = '#22c55e';
      ctx.strokeRect(298, cy - 83, 340, 41);
      ctx.fillRect(298, cy - 83, 340, 41);

      ctx.fillStyle = '#22c55e';
      ctx.fillText(`+${aavPackagingHeadroomKb} kb THERAPEUTIC HEADROOM (EPIGENETIC EFFECTORS / REPORTERS)`, 310, cy - 60);

      // Target dsDNA Strand (Horizontal at cy + 40)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(80, cy + 40); ctx.lineTo(canvas.width - 80, cy + 40);
      ctx.stroke();

      // Ultra-Compact Cas12f Dimeric Complex at (370, cy + 30)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isEditing ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy + 30, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Cas12f', 352, cy + 33);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12f (UnCas12f1): 400-aa ULTRA-COMPACT MONOMER | IN VIVO INDEL RATE = ${indelEfficiencyPercent}% | AAV HEADROOM = +${aavPackagingHeadroomKb} kb`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [proteinSizeAminoAcids, aavPackagingHeadroomKb, indelEfficiencyPercent, isEditing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-pink-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Feather className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-pink-300 to-amber-400">
                CRISPR-CAS12F // ULTRA-COMPACT SINGLE-AAV BASE/INDEL EDITOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                400-aa (DOUDNA LAB - UC BERKELEY & PATRICK HSU - SALK)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Engineered UnCas12f1 high-activity in vivo gene therapeutics for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12fEditing}
            disabled={isEditing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEditing ? 'EDITING CHROMOSOMAL LOCI...' : 'TRIGGER IN VIVO CAS12F CLEAVAGE'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
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
              <span className="text-cyan-400 font-bold">SIZE: {proteinSizeAminoAcids} aa (1.2 kb)</span>
              <span className="text-pink-400 font-bold">AAV SPARE: +{aavPackagingHeadroomKb} kb</span>
              <span className="text-emerald-400 font-bold">EFFICIENCY: {indelEfficiencyPercent}%</span>
            </div>
            <div>STATUS: SINGLE-VECTOR ALL-IN-ONE AAV PACKAGING</div>
          </div>
        </div>

        {/* Cas12f Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            MINIATURIZED ARCHITECTURE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>One-Third Size of SpCas9:</strong> At only ~400-aa, Cas12f leaves over 3.4 kb of free packaging payload inside standard AAV vectors!</div>
            <div>• <strong>In Vivo Therapeutic Delivery:</strong> Allows packing Cas12f, multiple gRNAs, and large base-editing deaminases into a single AAV capsid for clinical gene therapy!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
