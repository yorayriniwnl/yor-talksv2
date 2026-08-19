import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PhageTail() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tailFiberType, setTailFiberType] = useState<'gp37_Pseudomonas' | 'gp38_MRSA'>('gp37_Pseudomonas');
  const [isInjecting, setIsInjecting] = useState(false);
  const [lysed, setLysed] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerPhageInfection = () => {
    uiaudio.warp();
    setIsInjecting(true);

    setTimeout(() => {
      setIsInjecting(false);
      setLysed(true);
      uiaudio.success();
    }, 900);
  };

  const handleReset = () => {
    uiaudio.click();
    setLysed(false);
    setIsInjecting(false);
  };

  // Synthetic Phage Host-Range Tail Fiber Docking & Lysis Canvas
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

      // Dark Bacterial Environment Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Target Pathogen Bacterial Cell Membrane (Bottom Slab)
      ctx.fillStyle = lysed ? '#7f1d1d' : '#1e293b';
      ctx.strokeStyle = lysed ? '#ef4444' : '#3b82f6';
      ctx.lineWidth = 3;
      ctx.fillRect(80, cy + 50, canvas.width - 160, 140);
      ctx.strokeRect(80, cy + 50, canvas.width - 160, 140);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(
        tailFiberType === 'gp37_Pseudomonas' ? 'TARGET: Multi-Drug Resistant Pseudomonas aeruginosa' : 'TARGET: Methicillin-Resistant Staphylococcus aureus (MRSA)',
        110,
        cy + 130
      );

      // Bacteriophage Icosahedral Capsid Head (Center cx, cy - 90)
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy - 80, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Contractile Sheath Core
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 54); ctx.lineTo(cx, cy + 30);
      ctx.stroke();

      // Reprogrammed Tail Fibers (Receptor Binding Proteins gp37/gp38 docking to bacterial LPS receptors)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      // Left tail fiber
      ctx.moveTo(cx, cy + 20); ctx.lineTo(cx - 35, cy + 40); ctx.lineTo(cx - 50, cy + 50);
      // Right tail fiber
      ctx.moveTo(cx, cy + 20); ctx.lineTo(cx + 35, cy + 40); ctx.lineTo(cx + 50, cy + 50);
      ctx.stroke();

      // DNA Injection Stream through sheath into bacterium
      if (isInjecting) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy + 80);
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (lysed) {
        ctx.fillText('TARGET PATHOGEN PERFORATED & LYSED: 100% SPECIFIC ANTIMICROBIAL KILLING', 90, cy + 210);
      } else {
        ctx.fillText('ENGINEERED TAIL FIBER RECOGNIZING SPECIFIC BACTERIAL LPS RECEPTORS', 110, cy + 210);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tailFiberType, isInjecting, lysed]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Dna className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                SYNTHETIC PHAGE // TAIL FIBER HOST-RANGE ENGINEERING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                CRISPR PHAGE THERAPY (TIM LU LAB)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              gp37/gp38 receptor binding protein mutagenesis against multi-drug resistant pathogens for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerPhageInfection}
            disabled={isInjecting || lysed}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isInjecting ? 'INJECTING PHAGE GENOME...' : 'TRIGGER TARGETED BACTERIAL LYSIS'}</span>
          </button>

          {lysed && (
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
              <span className="text-cyan-400 font-bold">FIBER: {tailFiberType}</span>
              <span className="text-pink-400 font-bold">HOST RANGE: MODULAR REPROGRAMMED</span>
            </div>
            <div>STATUS: {lysed ? 'PATHOGEN CLEARED (ZERO OFF-TARGET KILLING)' : 'SURVEILLANCE'}</div>
          </div>
        </div>

        {/* Phage Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            TAIL FIBER TARGET
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => setTailFiberType('gp37_Pseudomonas')}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                tailFiberType === 'gp37_Pseudomonas' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">gp37 (Pseudomonas OprM Target)</div>
              <div className="text-[10px] text-zinc-400">Gram-negative multi-drug resistance</div>
            </button>

            <button
              onClick={() => setTailFiberType('gp38_MRSA')}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                tailFiberType === 'gp38_MRSA' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">gp38 (MRSA Teichoic Acid Target)</div>
              <div className="text-[10px] text-zinc-400">Gram-positive Staphylococcal resistance</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Modular Receptor Tropism:</strong> Swapping the C-terminal receptor binding loops of tail fibers redirects viral host range without affecting the capsid packaging machinery!</div>
            <div>• <strong>Overcoming Antibiotic Resistance:</strong> Engineered phages selectively destroy pan-drug resistant superbugs while sparing beneficial human microbiota!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
