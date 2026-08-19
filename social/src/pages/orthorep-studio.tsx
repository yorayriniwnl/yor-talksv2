import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, RefreshCw, FlaskConical
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function OrthorepStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mutationRatePerKb, setMutationRatePerKb] = useState(1e-5); // 10^-5 mutations/bp (100,000x genomic rate)
  const [generationsEvolved, setGenerationsEvolved] = useState(0);
  const [targetFitness, setTargetFitness] = useState(1.0); // 1.0x baseline -> 450x evolved fitness
  const [isEvolving, setIsEvolving] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerOrthoRepEvolution = () => {
    uiaudio.warp();
    setIsEvolving(true);

    const interval = setInterval(() => {
      setGenerationsEvolved(g => {
        if (g >= 120) {
          clearInterval(interval);
          setIsEvolving(false);
          uiaudio.success();
          return 120;
        }
        return g + 10;
      });

      setTargetFitness(f => +(f * 1.6).toFixed(1));
    }, 200);
  };

  const handleReset = () => {
    uiaudio.click();
    setGenerationsEvolved(0);
    setTargetFitness(1.0);
    setIsEvolving(false);
  };

  // Orthogonal Plasmid Replication & Autonomous Continuous Evolution Canvas
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

      // Dark Cytoplasm Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Host Yeast Nuclear Boundary (Pristine Protected Genome on Left)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx - 180, cy, 90, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('HOST YEAST NUCLEUS', cx - 250, cy - 100);
      ctx.fillText('GENOME MUTATION: 0% (SAFE)', cx - 260, cy + 110);

      // Cytoplasmic Orthogonal p1 Linear Plasmid (High-Speed Mutational Hotspot on Right)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 5;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isEvolving ? 20 : 6;
      ctx.beginPath();
      ctx.moveTo(cx + 80, cy - 70); ctx.lineTo(cx + 260, cy - 70);
      ctx.moveTo(cx + 80, cy + 70); ctx.lineTo(cx + 260, cy + 70);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Orthogonal Error-Prone DNA Polymerase (DNAP I-mut) moving along p1 plasmid
      const polX = cx + 80 + ((time * 120) % 180);
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(polX, cy - 70, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DNAP I', polX - 16, cy - 90);

      // Evolved Mutation Hotspots along plasmid
      for (let i = 0; i < Math.min(generationsEvolved / 10, 10); i++) {
        const mx = cx + 90 + i * 16;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(mx, cy + 70, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        `ORTHOREP EVOLVED FITNESS: ${targetFitness}x (GENERATION ${generationsEvolved})`,
        130,
        cy + 130
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [generationsEvolved, targetFitness, isEvolving]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-pink-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <FlaskConical className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-pink-300 to-cyan-400">
                ORTHOREP // CONTINUOUS DIRECTED EVOLUTION IN VIVO
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                100,000× MUTATION ACCELERATION (LIU LAB)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Orthogonal DNA polymerase replicating cytoplasmic linear p1 plasmid for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerOrthoRepEvolution}
            disabled={isEvolving || generationsEvolved >= 120}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", isEvolving && "animate-spin")} />
            <span>{isEvolving ? 'RUNNING CONTINUOUS SELECTION...' : 'COMMENCE 120-GEN EVOLUTION'}</span>
          </button>

          {generationsEvolved > 0 && (
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
              <span className="text-amber-400 font-bold">FITNESS GAIN: {targetFitness}x</span>
              <span className="text-pink-400 font-bold">MUTATION RATE: 10⁻⁵ / bp</span>
            </div>
            <div>STATUS: {isEvolving ? 'EVOLVING NOVEL ENZYME ACTIVE SITE' : 'IDLE ORTHOREP SYSTEM'}</div>
          </div>
        </div>

        {/* OrthoRep Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CONTINUOUS EVOLUTION
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Zero Host Genome Toxicity:</strong> The engineered error-prone polymerase strictly recognizes the terminal protein (TP) origins of the cytoplasmic p1 plasmid, leaving host nuclear chromosomes 100% untouched!</div>
            <div>• <strong>Autonomous Adaptation:</strong> Millions of cells continuously mutate and compete in liquid culture 24/7 without requiring manual pipetting, PCR, or transformation cycles!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
