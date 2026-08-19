import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Search, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12gSensor() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [targetRnaConcentrationAttomolar, setTargetRnaConcentrationAttomolar] = useState(50); // 50 aM ultra-low limit
  const [collateralTurnoverRate, setCollateralTurnoverRate] = useState(10000); // 10,000 cleavages/sec
  const [isDetecting, setIsDetecting] = useState(false);
  const [fluorescenceSignalNormalized, setFluorescenceSignalNormalized] = useState(1.0);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12gDetection = () => {
    uiaudio.warp();
    setIsDetecting(true);

    setTimeout(() => {
      setIsDetecting(false);
      setFluorescenceSignalNormalized(420.0);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setFluorescenceSignalNormalized(1.0);
    setIsDetecting(false);
  };

  // CRISPR-Cas12g Target RNA Binding & Collateral Reporter Cleavage Canvas
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

      // Dark Microfluidic Detection Channel
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Target Positive-Sense Viral ssRNA Strand (Left at 140, cy)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(260, cy);
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('VIRAL ssRNA TARGET', 95, cy - 15);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${targetRnaConcentrationAttomolar} aM concentration`, 95, cy + 20);

      // Central Allosterically Activated Cas12g Complex (Center at 370, cy)
      const isActive = isDetecting || fluorescenceSignalNormalized > 10;
      ctx.fillStyle = isActive ? '#22c55e' : '#334155';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = isActive ? '#22c55e' : 'transparent';
      ctx.shadowBlur = isActive ? 26 : 0;
      ctx.beginPath();
      ctx.arc(370, cy, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cas12g', 350, cy + 3);

      // Collateral Fluorescent Reporter Cleavage Particles (Right: 450 to 660)
      for (let p = 0; p < 8; p++) {
        const px = 470 + (p % 4) * 45;
        const py = cy - 40 + Math.floor(p / 4) * 80;

        ctx.fillStyle = isActive ? '#fbbf24' : '#64748b';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isActive ? 14 : 0;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12g BIOSENSOR: DETECTION LIMIT = ${targetRnaConcentrationAttomolar} aM | TURNOVER = ${collateralTurnoverRate.toLocaleString()} /s | FLUORESCENCE = ${fluorescenceSignalNormalized.toFixed(1)}x`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetRnaConcentrationAttomolar, collateralTurnoverRate, fluorescenceSignalNormalized, isDetecting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-amber-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Search className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-amber-300 to-pink-400">
                CRISPR-CAS12G // RNA-ACTIVATED ssRNA SENSOR & RIBONUCLEASE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                DOUDNA & SAVAGE (UC BERKELEY & IGI)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Ultrasensitive attomolar pathogen diagnostics & explosive collateral ribonuclease for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12gDetection}
            disabled={isDetecting || fluorescenceSignalNormalized > 10}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-amber-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDetecting ? 'ALLOSTERICALLY ACTIVATING CAS12G...' : 'TRIGGER PATHOGEN DETECTION'}</span>
          </button>

          {fluorescenceSignalNormalized > 10 && (
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
              <span className="text-cyan-400 font-bold">TARGET RNA: {targetRnaConcentrationAttomolar} aM</span>
              <span className="text-amber-400 font-bold">TURNOVER: {collateralTurnoverRate.toLocaleString()}/s</span>
              <span className="text-emerald-400 font-bold">SIGNAL: {fluorescenceSignalNormalized.toFixed(1)}x</span>
            </div>
            <div>STATUS: {fluorescenceSignalNormalized > 10 ? 'PATHOGEN DETECTED - FLUORESCENT BURST' : 'MONITORING'}</div>
          </div>
        </div>

        {/* Cas12g Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            DIAGNOSTIC SENSITIVITY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>RNA-Targeted ssRNA Cleavage:</strong> Unlike Cas12a which targets dsDNA, Cas12g specifically binds single-stranded viral RNA, making it ideal for detecting RNA viruses (SARS-CoV-2, Influenza)!</div>
            <div>• <strong>Enzymatic Signal Amplification:</strong> A single target binding event unleashes over 10,000 collateral cleavages of quenched fluorescent reporters per second!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
