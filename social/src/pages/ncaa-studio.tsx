import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function NcaaStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ncaaType, setNcaaType] = useState<'pAzF_PhotoCrosslinker' | 'Bpa_Fluorophore' | 'AcK_Acetylated'>('pAzF_PhotoCrosslinker');
  const [suppressionEfficiency, setSuppressionEfficiency] = useState(84.2); // 84.2% amber suppression
  const [isIncorporated, setIsIncorporated] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerAmberSuppression = () => {
    uiaudio.warp();
    setIsIncorporated(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setIsIncorporated(false);
  };

  // Orthogonal PylRS / tRNA_CUA & Ribosome Amber Suppression Canvas
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

      // Dark Cellular Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // mRNA Strand with UAG Amber Codon (Bottom ribbon)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, cy + 90); ctx.lineTo(canvas.width - 60, cy + 90);
      ctx.stroke();

      // UAG Amber Stop Codon Box (Center)
      ctx.fillStyle = isIncorporated ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
      ctx.strokeStyle = isIncorporated ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 30, cy + 75, 60, 30);
      ctx.strokeRect(cx - 30, cy + 75, 60, 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('UAG (STOP)', cx - 26, cy + 95);

      // Orthogonal Synthetase (PylRS) Complex (Top Left in Magenta)
      ctx.fillStyle = 'rgba(236, 72, 153, 0.45)';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx - 150, cy - 40, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('PylRS (SYNTHETASE)', cx - 210, cy - 90);

      // Orthogonal tRNA_CUA (Cloverleaf / L-shape charging ncAA in Emerald)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 150, cy - 40);
      ctx.quadraticCurveTo(cx - 80, cy - 60, cx, cy + 40);
      ctx.stroke();

      // Non-Canonical Amino Acid (ncAA - Glowing Gold Star at tRNA tip)
      if (isIncorporated) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(cx, cy + 40, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('21st ncAA INCORPORATED (FULL LENGTH PROTEIN)', cx - 120, cy + 130);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isIncorporated]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Dna className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                EXPANDED GENETIC CODE // NON-CANONICAL AMINO ACIDS (ncAA)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ORTHOGONAL PylRS / tRNA_CUA
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Amber UAG nonsense codon suppression & 21st synthetic amino acid incorporation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerAmberSuppression}
            disabled={isIncorporated}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isIncorporated ? '21st AMINO ACID SITE-SPECIFICALLY INSTALLED' : 'SUPPRESS AMBER (UAG) CODON'}</span>
          </button>

          {isIncorporated && (
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
              <span className="text-emerald-400 font-bold">ncAA: {ncaaType}</span>
              <span className="text-cyan-400 font-bold">SUPPRESSION: {suppressionEfficiency}%</span>
            </div>
            <div>STATUS: {isIncorporated ? 'TRANSLATION CONTINUED PAST UAG STOP' : 'TERMINATION FACTOR AT UAG'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SYNTHETIC BIOLOGY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Breaking the 20-Amino Acid Barrier:</strong> Reprogramming the amber stop codon UAG allows ribosomes to install over 200 synthetic building blocks with novel chemical functionalities!</div>
            <div>• <strong>Bioorthogonal Click Chemistry:</strong> Enables site-specific attachment of fluorescent tags, cytotoxic drugs (ADCs), and crosslinkers directly inside living human cells!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
