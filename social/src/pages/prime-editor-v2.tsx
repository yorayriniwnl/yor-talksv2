import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Scissors, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Dna
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PrimeEditorV2() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [systemVersion, setSystemVersion] = useState<'PE2' | 'PE3' | 'PEmax'>('PEmax');
  const [editingEfficiency, setEditingEfficiency] = useState(72.5); // 72.5% precise install
  const [isEdited, setIsEdited] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerPrimeEdit = () => {
    uiaudio.warp();
    setIsEdited(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setIsEdited(false);
  };

  // Prime Editor PEmax Complex & epegRNA Canvas
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

      // Target Genomic DNA
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      // Unnicked Strand
      ctx.moveTo(60, cy + 30); ctx.lineTo(canvas.width - 60, cy + 30);
      // Nicked & Reverse Transcribed 3' Flap Strand
      ctx.moveTo(60, cy - 30);
      ctx.lineTo(cx - 100, cy - 30);
      ctx.lineTo(cx + 80, cy - 30);
      ctx.lineTo(canvas.width - 60, cy - 30);
      ctx.stroke();

      // Cas9 Nickase (H840A) Domain in Emerald
      ctx.fillStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(cx - 50, cy, 75, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Engineered M-MLV Reverse Transcriptase (RT) Domain fused to C-terminus (Purple/Pink Lobe)
      ctx.fillStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx + 70, cy - 10, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // epegRNA Extension with tev-preQ1 Structural Hairpin (Yellow/Cyan Ribbon)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 60, cy - 30);
      ctx.quadraticCurveTo(cx + 30, cy - 80, cx + 110, cy - 40);
      ctx.stroke();

      // Installed Programmed Search-and-Replace Sequence Edit (Glowing Green Flap)
      if (isEdited) {
        ctx.fillStyle = '#22c55e';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx + 40, cy - 30, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('+3 bp INSERTION INSTALLED', cx - 20, cy - 90);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isEdited, systemVersion]);

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
                PRIME EDITOR PEmax // SEARCH-AND-REPLACE epegRNA SYSTEM
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ALL 12 BASE CONVERSIONS + INDELS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Engineered M-MLV RT, 3' flap reverse transcription & MMR evasion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerPrimeEdit}
            disabled={isEdited}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isEdited ? 'PROGRAMMED REVERSE TRANSCRIPTION COMPLETE' : 'EXECUTE SEARCH-AND-REPLACE'}</span>
          </button>

          {isEdited && (
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
              <span className="text-emerald-400 font-bold">SYSTEM: {systemVersion}</span>
              <span className="text-cyan-400 font-bold">EFFICIENCY: {editingEfficiency}%</span>
            </div>
            <div>STATUS: {isEdited ? '3\' FLAP HYBRIDIZED & LIGATED' : 'epegRNA PRIMED AT 3\' OH'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PEmax INNOVATIONS
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Search-and-Replace:</strong> Directly writes new genetic information into specified genomic sites without double-strand breaks or donor templates.</div>
            <div>• <strong>epegRNA Stabilization:</strong> Incorporating structured pseudoknot/hairpin motifs prevents 3' degradation, boosting efficiency up to 4-fold!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
