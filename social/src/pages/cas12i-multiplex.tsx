import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scissors, Layers, Boxes
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function Cas12iMultiplex() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [crRnaMultiplexCount, setCrRnaMultiplexCount] = useState(6); // 6-gene multiplex crRNA array
  const [asymmetricCleavageBias, setAsymmetricCleavageBias] = useState(95); // 95% target strand bias
  const [isProcessing, setIsProcessing] = useState(false);
  const [pathwayFluxBoostPercent, setPathwayFluxBoostPercent] = useState(480); // 480% metabolic boost

  const animFrameRef = useRef<number | null>(null);

  const triggerMultiplexCleavage = () => {
    uiaudio.warp();
    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      setPathwayFluxBoostPercent(740);
      uiaudio.success();
    }, 750);
  };

  const handleReset = () => {
    uiaudio.click();
    setPathwayFluxBoostPercent(480);
    setIsProcessing(false);
  };

  // Autonomous crRNA Polycistronic Array & Cas12i Processing Canvas
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

      // Polycistronic Pre-crRNA Array (Top: 80 to 660, cy - 80)
      const step = (canvas.width - 160) / crRnaMultiplexCount;
      for (let i = 0; i < crRnaMultiplexCount; i++) {
        const rx = 80 + i * step + step / 2;
        const ry = cy - 80;

        // Repeat Region (Purple Box)
        ctx.fillStyle = '#9333ea';
        ctx.fillRect(rx - 25, ry - 10, 15, 20);

        // Spacer Gene Target Motif (Cyan Bead)
        ctx.fillStyle = isProcessing ? '#22c55e' : '#06b6d4';
        ctx.beginPath();
        ctx.arc(rx + 10, ry, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(`g${i + 1}`, rx + 5, ry + 3);
      }

      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`AUTONOMOUS POLYCISTRONIC ARRAY (${crRnaMultiplexCount} GENES)`, 90, cy - 115);

      // Central Asymmetric Cas12i Cleavage Complex (Center at 370, cy + 40)
      ctx.fillStyle = '#ec4899';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isProcessing ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy + 40, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('Cas12i', 350, cy + 43);

      // Asymmetric Target vs Non-Target Cleavage Indicators
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(220, cy + 40); ctx.lineTo(330, cy + 40);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.fillText(`TARGET STRAND CUT (100%)`, 200, cy + 25);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `CRISPR-Cas12i MULTIPLEXING: ${crRnaMultiplexCount} SIMULTANEOUS LOCI | METABOLIC FLUX BOOST = +${pathwayFluxBoostPercent}%`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [crRnaMultiplexCount, asymmetricCleavageBias, pathwayFluxBoostPercent, isProcessing]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Boxes className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                CRISPR-CAS12I // ASYMMETRIC MULTIPLEX AUTONOMOUS crRNA
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                FENG ZHANG LAB (MIT BROAD)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Polycistronic array self-processing & asymmetric strand cleavage for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerMultiplexCleavage}
            disabled={isProcessing}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isProcessing ? 'PROCESSING MULTIPLEX ARRAY...' : 'EXECUTE MULTIPLEX TARGETING'}</span>
          </button>

          <button
            onClick={handleReset}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
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
              <span className="text-purple-400 font-bold">MULTIPLEX: {crRnaMultiplexCount} Genes</span>
              <span className="text-cyan-400 font-bold">ASYMMETRIC BIAS: {asymmetricCleavageBias}%</span>
              <span className="text-emerald-400 font-bold">METABOLIC BOOST: +{pathwayFluxBoostPercent}%</span>
            </div>
            <div>STATUS: AUTONOMOUS PRE-crRNA SELF-TRIMMING</div>
          </div>
        </div>

        {/* Cas12i Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ARRAY TARGETS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Multiplex Targets:</span>
              <span className="text-purple-400 font-bold">{crRnaMultiplexCount} Genes</span>
            </div>
            <input
              type="range"
              min={2}
              max={12}
              step={1}
              value={crRnaMultiplexCount}
              onChange={(e) => setCrRnaMultiplexCount(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Autonomous crRNA Maturation:</strong> Cas12i cleaves its own polycistronic pre-crRNA transcript without requiring auxiliary RNase III or tracer RNA!</div>
            <div>• <strong>Asymmetric Strand Scission:</strong> Exhibits distinct catalytic rates between target and non-target strands, creating staggered sticky overhangs ideal for targeted HDR!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
