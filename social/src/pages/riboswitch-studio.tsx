import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, ToggleLeft
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RiboswitchStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ligandType, setLigandType] = useState<'Theophylline' | 'SAM'>('Theophylline');
  const [ligandConcentrationUm, setLigandConcentrationUm] = useState(250); // 250 uM
  const [isBinding, setIsBinding] = useState(false);
  const [boundState, setBoundState] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerLigandBinding = () => {
    uiaudio.warp();
    setIsBinding(true);

    setTimeout(() => {
      setIsBinding(false);
      setBoundState(true);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setBoundState(false);
    setIsBinding(false);
  };

  // Synthetic RNA Aptamer & Expression Platform Secondary Structure Canvas
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

      // Dark Cellular Cytoplasm Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 5' mRNA Transcript Strand Leader (Left 80 to 220)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(80, cy + 40);
      ctx.lineTo(200, cy + 40);
      ctx.stroke();

      // Aptamer Domain Hairpin Loop (200 to 340)
      ctx.strokeStyle = boundState ? '#ec4899' : '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(200, cy + 40);
      ctx.lineTo(240, cy - 60);
      ctx.arc(260, cy - 70, 20, Math.PI, 0);
      ctx.lineTo(280, cy + 40);
      ctx.stroke();

      // Ligand Pocket Molecule (Theophylline / SAM ligand docking in loop)
      if (boundState || isBinding) {
        const ligX = boundState ? 260 : 260 + Math.sin(time * 8) * 15;
        const ligY = boundState ? cy - 70 : cy - 140;

        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = boundState ? 20 : 6;
        ctx.beginPath();
        ctx.arc(ligX, ligY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(ligandType === 'Theophylline' ? 'THEO' : 'SAM', ligX - 10, ligY + 3);
      }

      // Expression Platform: Shine-Dalgarno (SD) / Terminator Hairpin (320 to 520)
      ctx.strokeStyle = boundState ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(280, cy + 40);
      if (boundState) {
        // ON State: Linear accessible Shine-Dalgarno sequence -> Ribosome binds!
        ctx.lineTo(520, cy + 40);
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        ctx.fillText('SHINE-DALGARNO EXPOSED: TRANSLATION ACTIVE (ON)', 340, cy + 25);
      } else {
        // OFF State: Intrinsic terminator hairpin sequesters ribosome binding site
        ctx.lineTo(360, cy - 40);
        ctx.arc(380, cy - 45, 20, Math.PI, 0);
        ctx.lineTo(400, cy + 40);
        ctx.lineTo(520, cy + 40);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.fillText('TERMINATOR HAIRPIN FORMED: TRANSLATION REPRESSED (OFF)', 280, cy + 70);
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `SYNTHETIC ${ligandType.toUpperCase()} RIBOSWITCH: ${boundState ? 'LIGAND BOUND (ALLOSTERIC INDUCTION)' : 'APO UNBOUND REPRESSED CONFORMATION'}`,
        90,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [ligandType, ligandConcentrationUm, boundState, isBinding]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <ToggleLeft className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                SYNTHETIC RIBOSWITCH // RNA APTAMER TRANSCRIPTION REGULATOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                BREAKER & SMOLKE LABS (STANFORD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Ligand-dependent RNA secondary structure allosteric switching for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerLigandBinding}
            disabled={isBinding || boundState}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-amber-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBinding ? 'LIGAND CONFORMATIONAL SHIFT...' : 'INJECT LIGAND (INDUCE ON-STATE)'}</span>
          </button>

          {boundState && (
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
              <span className="text-pink-400 font-bold">LIGAND: {ligandType}</span>
              <span className="text-cyan-400 font-bold">CONCENTRATION: {ligandConcentrationUm} µM</span>
            </div>
            <div>STATUS: {boundState ? 'GENE FULLY TRANSLATING (GREEN GFP EXPRESSED)' : 'REPRESSED'}</div>
          </div>
        </div>

        {/* Riboswitch Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            APTAMER LIGAND
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setLigandType('Theophylline');
                setBoundState(false);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                ligandType === 'Theophylline' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Theophylline Aptamer</div>
              <div className="text-[10px] text-zinc-400">Small purine alkaloid ligand switch</div>
            </button>

            <button
              onClick={() => {
                setLigandType('SAM');
                setBoundState(false);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                ligandType === 'SAM' ? "bg-amber-500/20 border-amber-400 text-amber-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">S-Adenosylmethionine (SAM-I)</div>
              <div className="text-[10px] text-zinc-400">Metabolic cofactor feedback switch</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Protein-Free Gene Regulation:</strong> Riboswitches control transcription termination or translation initiation purely through RNA folding without regulatory proteins!</div>
            <div>• <strong>Synthetic Biosensors:</strong> Engineered riboswitches enable cells to sense environmental metabolites and dynamically tune enzyme expression levels!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
