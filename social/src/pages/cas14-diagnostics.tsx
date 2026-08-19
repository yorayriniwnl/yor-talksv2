import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Search, Flame
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas14Diagnostics() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pathogenSample, setPathogenSample] = useState<'HPV16_HighRisk' | 'Ebola_Zaire' | 'TB_RifampicinResistant'>('HPV16_HighRisk');
  const [fluorescenceIntensityAcu, setFluorescenceIntensityAcu] = useState(120); // 120 -> 9800 ACU
  const [isDetecting, setIsDetecting] = useState(false);
  const [snpSpecificityPercent, setSnpSpecificityPercent] = useState(99.9);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas14Detection = () => {
    uiaudio.warp();
    setIsDetecting(true);

    setTimeout(() => {
      setIsDetecting(false);
      setFluorescenceIntensityAcu(9850);
      uiaudio.success();
    }, 800);
  };

  const handleReset = () => {
    uiaudio.click();
    setFluorescenceIntensityAcu(120);
    setIsDetecting(false);
  };

  // Ultra-Compact Cas14 (Cas12f) ssDNA Trans-Cleavage & Fluorophore Unleashing Canvas
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

      // Dark Diagnostic Tube Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Target Pathogen ssDNA Strand (Left at 100, cy)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(100, cy); ctx.lineTo(260, cy);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('TARGET ssDNA', 110, cy - 15);

      // Compact Miniaturized Cas14 Nuclease (at 280, cy)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isDetecting ? 25 : 8;
      ctx.beginPath();
      ctx.arc(280, cy, 20, 0, Math.PI * 2); // 400-aa ultra compact
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('Cas14', 268, cy + 3);

      // Trans-Cleavage Fluorophore-Quencher Beacons (Right side: 340 to 620)
      for (let i = 0; i < 8; i++) {
        const bx = 360 + (i % 4) * 70;
        const by = cy - 50 + Math.floor(i / 4) * 80;
        const isUnquenched = fluorescenceIntensityAcu > 5000;

        // Quenched / Unquenched Glow Beacon
        ctx.fillStyle = isUnquenched ? '#22c55e' : '#475569';
        ctx.shadowColor = isUnquenched ? '#22c55e' : 'transparent';
        ctx.shadowBlur = isUnquenched ? 20 : 0;
        ctx.beginPath();
        ctx.arc(bx, by, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(isUnquenched ? 'FAM*' : 'F-Q', bx - 8, by + 3);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      if (fluorescenceIntensityAcu > 5000) {
        ctx.fillText(`DETECTR-v2 POSITIVE: ${pathogenSample.toUpperCase()} IDENTIFIED (FLUORESCENCE = ${fluorescenceIntensityAcu} ACU | 99.9% SNP DISCRIMINATION)`, 60, canvas.height - 25);
      } else {
        ctx.fillText(`DETECTR-v2 STANDBY: READY FOR ULTRA-COMPACT CAS14 PATHOGEN HYBRIDIZATION`, 80, canvas.height - 25);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [pathogenSample, fluorescenceIntensityAcu, isDetecting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(34,197,94,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Search className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">
                CRISPR-CAS14 // ULTRA-COMPACT DETECTR-V2 DIAGNOSTICS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                JENNIFER DOUDNA (UC BERKELEY / MAMMOTH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              400-500 aa miniaturized Cas14 ssDNA trans-cleavage & single-nucleotide SNP genotyping for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas14Detection}
            disabled={isDetecting || fluorescenceIntensityAcu > 5000}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDetecting ? 'ACTIVATING TRANS-CLEAVAGE...' : 'TRIGGER CAS14 DIAGNOSTIC SCAN'}</span>
          </button>

          {fluorescenceIntensityAcu > 5000 && (
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
              <span className="text-emerald-400 font-bold">TARGET: {pathogenSample}</span>
              <span className="text-cyan-400 font-bold">FLUORESCENCE: {fluorescenceIntensityAcu} ACU</span>
              <span className="text-pink-400 font-bold">SNP SPECIFICITY: {snpSpecificityPercent}%</span>
            </div>
            <div>STATUS: {fluorescenceIntensityAcu > 5000 ? 'RAPID 15-MIN POINT-OF-CARE DETECTION' : 'STANDBY'}</div>
          </div>
        </div>

        {/* Cas14 Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            PATHOGEN TARGET
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setPathogenSample('HPV16_HighRisk');
                setFluorescenceIntensityAcu(120);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                pathogenSample === 'HPV16_HighRisk' ? "bg-emerald-500/20 border-emerald-400 text-emerald-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">HPV16 High-Risk Oncogene</div>
              <div className="text-[10px] text-zinc-400">Single-nucleotide viral discrimination</div>
            </button>

            <button
              onClick={() => {
                setPathogenSample('Ebola_Zaire');
                setFluorescenceIntensityAcu(150);
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                pathogenSample === 'Ebola_Zaire' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Ebola Zaire GP Gene</div>
              <div className="text-[10px] text-zinc-400">Filoviral ssDNA reverse transcript</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No PAM Requirement on ssDNA:</strong> Unlike Cas9 which requires a strict NGG PAM, Cas14 cleaves single-stranded target DNA without any PAM sequence constraint!</div>
            <div>• <strong>Unprecedented SNP Fidelity:</strong> Even a single-base mismatch in the target region completely shuts down collateral trans-cleavage activity!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
