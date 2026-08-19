import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Feather, Layers, Radio
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12qDiagnostic() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [targetConcentrationAttomolar, setTargetConcentrationAttomolar] = useState(15); // 15 aM ultra-low target
  const [transCleavageVelocityRatio, setTransCleavageVelocityRatio] = useState(22); // 22% -> 99.4%
  const [isDetecting, setIsDetecting] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerCas12qDetection = () => {
    uiaudio.warp();
    setIsDetecting(true);

    setTimeout(() => {
      setIsDetecting(false);
      setTransCleavageVelocityRatio(99.6);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setTransCleavageVelocityRatio(22);
    setIsDetecting(false);
  };

  // CRISPR-Cas12q (Type V-Q, 390-aa) Collateral Trans-Cleavage Canvas
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

      // Dark Biosensor Reaction Well Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Target Pathogen Target Strand (80 to 280, cy - 40)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(80, cy - 40); ctx.lineTo(260, cy - 40);
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`VIRAL TARGET (${targetConcentrationAttomolar} aM)`, 90, cy - 55);

      // Hyper-Compact Cas12q Effector Core (390-aa) at Target (260, cy - 40)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isDetecting ? 24 : 8;
      ctx.beginPath();
      ctx.arc(260, cy - 40, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cas12q', 238, cy - 36);

      // Collateral Trans-Cleaved Fluorescent Reporters (Center to Right)
      const isDetected = transCleavageVelocityRatio > 50;
      for (let r = 0; r < 8; r++) {
        const rx = 350 + (r % 4) * 65;
        const ry = cy - 60 + Math.floor(r / 4) * 65;

        ctx.fillStyle = isDetected ? '#22c55e' : '#475569';
        ctx.strokeStyle = isDetected ? '#ffffff' : '#334155';
        ctx.lineWidth = 2;
        ctx.shadowColor = isDetected ? '#22c55e' : 'transparent';
        ctx.shadowBlur = isDetected ? 18 : 0;

        ctx.beginPath();
        ctx.arc(rx, ry, isDetected ? 12 : 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = isDetected ? '#000000' : '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(isDetected ? 'FAM' : 'DARK', rx - 10, ry + 3);
      }

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12q (Type V-Q, 390-aa): ATTOMOLAR TARGET = ${targetConcentrationAttomolar} aM | FLUORESCENCE AMPLIFICATION = ${transCleavageVelocityRatio}% (ZHANG & LIU)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetConcentrationAttomolar, transCleavageVelocityRatio, isDetecting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-pink-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-pink-300 to-cyan-400">
                CRISPR-CAS12Q // 390-aa TRANS-CLEAVAGE BIOSENSOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                FENG ZHANG & DAVID LIU (BROAD & MIT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              High-speed collateral reporter trans-cleavage & attomolar viral detection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCas12qDetection}
            disabled={isDetecting || transCleavageVelocityRatio > 50}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDetecting ? 'AMPLIFYING FLUORESCENCE...' : 'DETECT ATTOMOLAR PATHOGEN'}</span>
          </button>

          {transCleavageVelocityRatio > 50 && (
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
              <span className="text-pink-400 font-bold">SIZE: 390-aa (MICRO-NUCLEASE)</span>
              <span className="text-emerald-400 font-bold">SENSITIVITY: {targetConcentrationAttomolar} aM</span>
              <span className="text-cyan-400 font-bold">SIGNAL: {transCleavageVelocityRatio}%</span>
            </div>
            <div>STATUS: {transCleavageVelocityRatio > 50 ? 'POSITIVE ATTOMOLAR PATHOGEN DETECTED' : 'QUIESCENT'}</div>
          </div>
        </div>

        {/* Cas12q Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            DIAGNOSTIC PROFILE
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hyper-Fast Trans-Cleavage (k_cat &gt; 10,000 / s):</strong> Target hybridization triggers an ultra-rapid non-specific cleavage burst that destroys thousands of quencher-fluorophore probes per minute!</div>
            <div>• <strong>Point-of-Care Microfluidics:</strong> The miniature 390-aa size enables freeze-dried isothermal diagnostic strips with zero cold-chain storage requirements!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
