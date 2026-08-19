import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, ArrowDownToLine, PackagePlus
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12kTransposon() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cargoPayloadKilobases, setCargoPayloadKilobases] = useState(12.5); // 12.5 kb multi-gene cluster cargo
  const [tnsBRecruitmentFidelity, setTnsBRecruitmentFidelity] = useState(0.985); // 98.5% integration
  const [isTransposing, setIsTransposing] = useState(false);
  const [integrationSuccess, setIntegrationSuccess] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12kTransposition = () => {
    uiaudio.warp();
    setIsTransposing(true);

    setTimeout(() => {
      setIsTransposing(false);
      setIntegrationSuccess(true);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setIntegrationSuccess(false);
    setIsTransposing(false);
  };

  // CRISPR-Cas12k CAST Transposase Targeted Integration Canvas
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

      // Target Genomic dsDNA Strand (80 to 660, cy + 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(80, cy + 40); ctx.lineTo(canvas.width - 80, cy + 40);
      ctx.stroke();

      // Guide Target Site & Cas12k Complex (Left of insertion site: 220, cy + 40)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(220, cy + 40, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cas12k', 202, cy + 44);

      // TnsA/TnsB/TnsC Transposase Heterocomplex (Spans from Cas12k to Insertion Site: 240 to 420)
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(242, cy + 40); ctx.lineTo(420, cy + 40);
      ctx.stroke();

      ctx.fillStyle = '#a855f7';
      ctx.fillText('TnsB/TnsC Relay', 270, cy + 25);

      // Multi-Kilobase Donor Cargo DNA Integration Block (at 420, cy - 20)
      const cargoY = integrationSuccess ? cy + 40 : (isTransposing ? cy + 10 : cy - 50);
      ctx.fillStyle = integrationSuccess ? '#22c55e' : '#f59e0b';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = (isTransposing || integrationSuccess) ? 22 : 6;
      ctx.fillRect(360, cargoY - 18, 120, 36);
      ctx.strokeRect(360, cargoY - 18, 120, 36);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${cargoPayloadKilobases} kb DONOR CARGO`, 370, cargoY + 4);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12k CAST: CARGO = ${cargoPayloadKilobases} kb | INTEGRATION FIDELITY = ${(tnsBRecruitmentFidelity * 100).toFixed(1)}% | SEAMLESS (NO-DSB)`,
        55,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cargoPayloadKilobases, tnsBRecruitmentFidelity, integrationSuccess, isTransposing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <PackagePlus className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-indigo-300 to-pink-400">
                CRISPR-CAS12K // RNA-GUIDED TRANSPOSASE & CARGO INSERTION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                STERNBERG & FENG ZHANG (COLUMBIA & MIT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              DSB-free multi-kilobase targeted gene cassette integration for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12kTransposition}
            disabled={isTransposing || integrationSuccess}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isTransposing ? 'INTEGRATING CARGO CASSETTE...' : 'INSERT TARGETED CARGO (12.5 kb)'}</span>
          </button>

          {integrationSuccess && (
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
              <span className="text-emerald-400 font-bold">CARGO: {cargoPayloadKilobases} kb</span>
              <span className="text-pink-400 font-bold">FIDELITY: {(tnsBRecruitmentFidelity * 100).toFixed(1)}%</span>
              <span className="text-cyan-400 font-bold">MECHANISM: DSB-FREE TRANSPOSITION</span>
            </div>
            <div>STATUS: {integrationSuccess ? 'INTEGRATION COMPLETE' : 'STANDBY'}</div>
          </div>
        </div>

        {/* Cas12k Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            CARGO INTEGRATION
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No Double-Strand Breaks (DSBs):</strong> Standard CRISPR requires cutting DNA double strands which causes toxic chromosomal rearrangements. Cas12k recruits transposases (TnsB/TnsC) for clean strand-transfer!</div>
            <div>• <strong>Massive Genetic Cargo:</strong> Capable of seamlessly integrating intact 10 to 30 kb biosynthetic pathways or chimeric antigen receptors into safe harbor genomic loci!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
