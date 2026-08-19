import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Dna, Sparkles, Play, RotateCcw, Zap, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, HeartPulse, Clock
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function EpigeneticClock() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [chronologicalAge, setChronologicalAge] = useState(55);
  const [biologicalAge, setBiologicalAge] = useState(55);
  const [oskmCycles, setOskmCycles] = useState(0);
  const [isRejuvenating, setIsRejuvenating] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerYamanakaRejuvenation = () => {
    uiaudio.warp();
    setIsRejuvenating(true);

    const interval = setInterval(() => {
      setBiologicalAge(age => {
        if (age <= 25) {
          clearInterval(interval);
          setIsRejuvenating(false);
          uiaudio.success();
          return 25;
        }
        return age - 5;
      });
    }, 250);

    setOskmCycles(c => c + 1);
  };

  const handleReset = () => {
    uiaudio.click();
    setBiologicalAge(chronologicalAge);
    setOskmCycles(0);
    setIsRejuvenating(false);
  };

  // Horvath Epigenetic Clock & CpG Methylation Profiler Canvas
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

      // Dark Epigenetic Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // DNA Double Helix Strands (Cyan & Teal)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 40; x <= canvas.width - 40; x += 6) {
        const y1 = cy + Math.sin(x * 0.04 + time) * 35;
        if (x === 40) ctx.moveTo(x, y1); else ctx.lineTo(x, y1);
      }
      ctx.stroke();

      ctx.strokeStyle = '#10b981';
      ctx.beginPath();
      for (let x = 40; x <= canvas.width - 40; x += 6) {
        const y2 = cy - Math.sin(x * 0.04 + time) * 35;
        if (x === 40) ctx.moveTo(x, y2); else ctx.lineTo(x, y2);
      }
      ctx.stroke();

      // 353 Horvath CpG Island Methylation Marks (5-methylcytosine 5mC flags)
      // Higher biological age = more epigenetic entropy / aberrant methylation
      const numCpG = 24;
      for (let i = 0; i < numCpG; i++) {
        const cpgX = 60 + (i * (canvas.width - 120)) / (numCpG - 1);
        const strandY = cy + Math.sin(cpgX * 0.04 + time) * 35;

        const isMethylated = (i * 7 + Math.floor(biologicalAge)) % 10 < (biologicalAge / 8);

        ctx.fillStyle = isMethylated ? '#ec4899' : '#22c55e';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(cpgX, strandY - (isMethylated ? 14 : -14), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = isMethylated ? '#ec4899' : '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cpgX, strandY);
        ctx.lineTo(cpgX, strandY - (isMethylated ? 14 : -14));
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        `HORVATH EPIGENETIC BIOLOGICAL AGE: ${biologicalAge} YEARS OLD (CHRONOLOGICAL: ${chronologicalAge})`,
        100,
        cy + 110
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [biologicalAge, chronologicalAge]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-teal-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-400/40">
            <Clock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400">
                EPIGENETIC AGING CLOCK // HORVATH 353-CpG METHYLOME
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                YAMANAKA OSKM CELLULAR REJUVENATION
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              DNA 5-methylcytosine regression & partial reprogramming reset for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerYamanakaRejuvenation}
            disabled={isRejuvenating || biologicalAge <= 25}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isRejuvenating ? 'RESETTING EPIGENETIC AGE VIA OSKM...' : 'PULSED OSKM REJUVENATION'}</span>
          </button>

          {biologicalAge !== chronologicalAge && (
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
              <span className="text-teal-400 font-bold">BIO AGE: {biologicalAge} yrs</span>
              <span className="text-pink-400 font-bold">OSKM CYCLES: {oskmCycles}</span>
            </div>
            <div>STATUS: {biologicalAge <= 25 ? 'PRISTINE PLURIPOTENCY EPIGENOME RESTORED' : 'ACTIVE METHYLATION REGRESSION'}</div>
          </div>
        </div>

        {/* Epigenetic Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              CHRONOLOGICAL AGE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Chronological:</span>
              <span className="text-teal-400 font-bold">{chronologicalAge} Years</span>
            </div>
            <input
              type="range"
              min={20}
              max={90}
              step={1}
              value={chronologicalAge}
              onChange={(e) => {
                const val = Number(e.target.value);
                setChronologicalAge(val);
                setBiologicalAge(val);
              }}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Horvath Epigenetic Clock:</strong> Measures DNA methylation levels across 353 specific CpG sites, estimating human biological age with a median error of under 3.6 years!</div>
            <div>• <strong>Partial Reprogramming:</strong> Transient induction of Oct4, Sox2, Klf4, and c-Myc (OSKM) resets epigenetic age without erasing cellular identity or causing dedifferentiation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
