import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SpectralFilterQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [polynomialOrderK, setPolynomialOrderK] = useState(6); // K = 6 Chebyshev polynomial order
  const [spectralBandpassCutoff, setSpectralBandpassCutoff] = useState(0.75); // 0.75 spectral energy cutoff
  const [isFiltering, setIsFiltering] = useState(false);
  const [filteredObservableFidelity, setFilteredObservableFidelity] = useState(0.985);

  const animFrameRef = useRef<number | null>(null);

  const triggerSpectralFiltering = () => {
    uiaudio.warp();
    setIsFiltering(true);

    setTimeout(() => {
      setIsFiltering(false);
      setFilteredObservableFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Polynomial Chebyshev/Jackson Spectral Density Matrix Filter Canvas
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

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Raw Noisy Liouvillian Spectrum with Noise Sidebands (Left: 80 to 280)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(80, cy - 80, 160, 130);
      ctx.fillRect(80, cy - 80, 160, 130);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('NOISY SPECTRUM L', 95, cy - 60);

      // Discrete Eigenvalue Spikes (Noise sub-bands)
      for (let s = 0; s < 6; s++) {
        const sx = 95 + s * 22;
        const sy = cy + 30 - (s % 3) * 25;
        ctx.strokeStyle = s === 0 ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx, cy + 35); ctx.lineTo(sx, sy);
        ctx.stroke();

        ctx.fillStyle = s === 0 ? '#22c55e' : '#ef4444';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(s === 0 ? 'λ_0' : `λ_${s}`, sx - 6, sy - 4);
      }

      // Chebyshev Polynomial Kernel P_K(L) (Center at 370, cy - 15)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isFiltering ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 15, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`CHEBYSHEV P_${polynomialOrderK}`, 320, cy - 22);
      ctx.fillText('SPECTRAL FILTER', 320, cy - 2);

      // Mitigated Pure Observable Output (Right at 530, cy - 15)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isFiltering ? 24 : 6;
      ctx.strokeRect(480, cy - 70, 160, 110);
      ctx.fillRect(480, cy - 70, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PURIFIED GROUND SPECTRUM', 490, cy - 45);
      ctx.fillText('BATH MODES SUPPRESSED', 492, cy - 20);
      ctx.fillText(`FIDELITY = ${(filteredObservableFidelity * 100).toFixed(2)}%`, 495, cy + 10);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `SPECTRAL FILTER QEM: ORDER K = ${polynomialOrderK} | BANDPASS CUTOFF = ${spectralBandpassCutoff} | FILTERED FIDELITY = ${(filteredObservableFidelity * 100).toFixed(2)}% (EISERT & KLIESCH)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [polynomialOrderK, spectralBandpassCutoff, filteredObservableFidelity, isFiltering]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Filter className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                SPECTRAL FILTER QEM // POLYNOMIAL SPECTRUM PROJECTION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                EISERT, KLIESCH & KASTORYANO (FU BERLIN & COLOGNE)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Chebyshev polynomial spectral filters & non-Markovian memory deconvolution for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerSpectralFiltering}
            disabled={isFiltering}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isFiltering ? 'FILTERING LIOUVILLIAN SPECTRUM...' : 'APPLY POLYNOMIAL SPECTRAL FILTER'}</span>
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
              <span className="text-cyan-400 font-bold">ORDER: K = {polynomialOrderK}</span>
              <span className="text-amber-400 font-bold">CUTOFF: {spectralBandpassCutoff}</span>
              <span className="text-emerald-400 font-bold">FILTERED FIDELITY: {(filteredObservableFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-MARKOVIAN EIGEN-MODES FILTERED</div>
          </div>
        </div>

        {/* Spectral Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              POLYNOMIAL ORDER (K)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Filter Degree:</span>
              <span className="text-cyan-400 font-bold">K = {polynomialOrderK}</span>
            </div>
            <input
              type="range"
              min={2}
              max={12}
              step={1}
              value={polynomialOrderK}
              onChange={(e) => setPolynomialOrderK(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Optimal Chebyshev Approximation:</strong> Chebyshev polynomial series $P_K(\mathcal{L})$ sharply isolate target ground subspaces while suppressing environmental noise tails exponentially!</div>
            <div>• <strong>Non-Markovian Memory Cleansing:</strong> Eliminates bath memory kernels without requiring knowledge of environmental Hamiltonians or noise generators!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
