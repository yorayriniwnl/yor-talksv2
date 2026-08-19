import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RibosomeO() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [quadrupletCodon, setQuadrupletCodon] = useState<'UAGA' | 'AGGA' | 'CCCG'>('UAGA');
  const [orthogonalPurity, setOrthogonalPurity] = useState(99.4); // 99.4% parallel translation purity
  const [translated, setTranslated] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerQuadTranslation = () => {
    uiaudio.warp();
    setTranslated(true);
    setTimeout(() => {
      uiaudio.success();
    }, 1000);
  };

  const handleReset = () => {
    uiaudio.click();
    setTranslated(false);
  };

  // Orthogonal Ribo-Q & 4-Base mRNA Translation Canvas
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

      // Orthogonal mRNA Strand with 4-Base Quadruplet Codon (Bottom Line)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, cy + 90); ctx.lineTo(canvas.width - 60, cy + 90);
      ctx.stroke();

      // 4-Base Codon Box (UAGA in Center)
      ctx.fillStyle = translated ? 'rgba(34, 197, 94, 0.3)' : 'rgba(6, 182, 212, 0.3)';
      ctx.strokeStyle = translated ? '#22c55e' : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 45, cy + 75, 90, 30);
      ctx.strokeRect(cx - 45, cy + 75, 90, 30);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(quadrupletCodon + ' (4-BASE)', cx - 40, cy + 95);

      // Engineered 50S Large Subunit (Upper Purple/Magenta Dome)
      ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy - 35, 95, Math.PI, 0);
      ctx.fill();
      ctx.stroke();

      // Engineered 30S Small Decoding Subunit with Expanded A-Site (Lower Cyan Oval)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 40, 85, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Orthogonal 4-Base Anticodon tRNA in A-Site (Emerald)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 35);
      ctx.lineTo(cx, cy + 70);
      ctx.stroke();

      // Quadruplet Peptide Chain Emergence at Exit Tunnel
      if (translated) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(cx - 40 - i * 18, cy - 110 - i * 10, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('256-CODON PARALLEL PROTEOME SYNTHESIZED', cx - 130, cy + 135);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [translated, quadrupletCodon]);

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
                ORTHOGONAL RIBOSOME // 4-BASE QUADRUPLET CODON (RIBO-Q)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                256 QUADRUPLET CODONS (CHIN LAB)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Engineered 16S decoding center & orthogonal parallel translation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerQuadTranslation}
            disabled={translated}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{translated ? '4-BASE PEPTIDE TRANSLATION COMPLETE' : 'TRANSLATE 4-BASE CODON (' + quadrupletCodon + ')'}</span>
          </button>

          {translated && (
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
              <span className="text-teal-400 font-bold">CODON: {quadrupletCodon} (4-Base)</span>
              <span className="text-cyan-400 font-bold">PURITY: {orthogonalPurity}%</span>
            </div>
            <div>STATUS: {translated ? 'QUADRUPLET RIBO-Q TRANSLATION ACTIVE' : 'HOST TRIPLET GENOME UNTOUCHED'}</div>
          </div>
        </div>

        {/* Ribosome Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            QUADRUPLET CODONS
          </h3>

          <div className="space-y-2">
            {(['UAGA', 'AGGA', 'CCCG'] as const).map((codon) => (
              <button
                key={codon}
                onClick={() => {
                  setQuadrupletCodon(codon);
                  setTranslated(false);
                }}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  quadrupletCodon === codon ? "bg-teal-500/20 border-teal-400 text-teal-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">{codon} Quadruplet</div>
                <div className="text-[10px] text-zinc-400">4-Base Frameshift Suppressor tRNA</div>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Parallel Genetic Operating System:</strong> Orthogonal ribosomes translate exclusively orthogonal mRNAs with altered Shine-Dalgarno sequences without interfering with host cell survival!</div>
            <div>• <strong>256 Synthetic Codons:</strong> Triplet genetic code allows 64 codons; 4-base quadruplet codons unlock 4⁴ = 256 codons for exotic synthetic polymers!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
