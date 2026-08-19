import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, ShieldAlert, Sparkle
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12gammaCuring() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [targetedPlasmidsCount, setTargetedPlasmidsCount] = useState(6); // 6 MDR plasmids
  const [curingEfficiency, setCuringEfficiency] = useState(24); // 24% -> 99.9%
  const [isCuringPlasmids, setIsCuringPlasmids] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12gammaCuring = () => {
    uiaudio.warp();
    setIsCuringPlasmids(true);

    setTimeout(() => {
      setIsCuringPlasmids(false);
      setCuringEfficiency(99.9);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setCuringEfficiency(24);
    setIsCuringPlasmids(false);
  };

  // CRISPR-Cas12gamma (Type V-Gamma, 175-aa) Plasmid Curing Canvas
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

      // Dark Bacterial Cytoplasm Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Bacterial Host Genomic Chromosome (Left: 80 to 220, cy)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(140, cy, 55, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('HOST GENOME (SAFE)', 95, cy + 3);

      // Targeted Superbug Plasmids (Right: 280 to 620)
      const numPlasmids = targetedPlasmidsCount;
      const isCured = curingEfficiency > 50;

      for (let p = 0; p < numPlasmids; p++) {
        const px = 280 + (p % 3) * 115;
        const py = cy - 40 + Math.floor(p / 3) * 75;

        // Plasmid Ring
        ctx.strokeStyle = isCured ? 'rgba(239, 68, 68, 0.25)' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = isCured ? '#22c55e' : '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(isCured ? 'CLEAVED' : `MDR-p${p + 1}`, px - 14, py + 3);

        // Cleavage Sparkles if curing
        if (isCuringPlasmids) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(px + Math.sin(time * 3 + p) * 16, py + Math.cos(time * 3 + p) * 16, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Ultra-Miniature Cas12gamma Monomer (175-aa) at Center (240, cy)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isCuringPlasmids ? 24 : 8;
      ctx.beginPath();
      ctx.arc(240, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('Cas12γ', 225, cy + 3);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12γ (Type V-Gamma, 175-aa): PLASMIDS = ${targetedPlasmidsCount} | CURING EFFICIENCY = ${curingEfficiency}% (DOUDNA & GAUTAM DANTAS)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetedPlasmidsCount, curingEfficiency, isCuringPlasmids]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-pink-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <ShieldAlert className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-pink-300 to-amber-400">
                CRISPR-CAS12γ // 175-aa PLASMID CURING ENGINE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DOUDNA & GAUTAM DANTAS (UC BERKELEY & WASHU)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Sub-180-aa world record micro-effector & multi-drug resistant plasmid curing for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12gammaCuring}
            disabled={isCuringPlasmids || curingEfficiency > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCuringPlasmids ? 'CURING SUPERBUG PLASMIDS...' : 'CURE MDR PLASMIDS'}</span>
          </button>

          {curingEfficiency > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 175-aa (SUB-180-aa ABSOLUTE RECORD)</span>
              <span className="text-cyan-400 font-bold">PLASMIDS: {targetedPlasmidsCount} TARGETED</span>
              <span className="text-emerald-400 font-bold">CURING EFFICIENCY: {curingEfficiency}%</span>
            </div>
            <div>STATUS: {curingEfficiency > 50 ? 'ALL MDR PLASMIDS COMPLETELY CLEARED' : 'PROGRAMMABLE PLASMID CURING READY'}</div>
          </div>
        </div>

        {/* Cas12gamma Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PLASMID CURING SUITE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>175-aa Miniature Effector:</strong> Cas12γ breaks every known boundary (under 180-aa), allowing dense multi-crRNA multiplexing for eradicating multiple antibiotic resistance plasmids at once!</div>
            <div>• <strong>Zero Host Toxicity:</strong> Targets only non-essential plasmid replication origins (oriV), eliminating antibiotic resistance without killing host commensal microflora!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
