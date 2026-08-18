import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function InflationSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [eFoldsN, setEFoldsN] = useState(60); // 60 e-folds (10^26 expansion)
  const [tensorScalarRatioR, setTensorScalarRatioR] = useState(0.035); // r < 0.036 (BICEP/Keck 2021)
  const [energyScaleGev, setEnergyScaleGev] = useState('1.6e16'); // 10^16 GeV GUT scale
  const [isInflating, setIsInflating] = useState(false);

  const animFrameRef = useRef<number | null>(null);
  const scaleFactorRef = useRef(1);

  const triggerCosmicInflation = () => {
    uiaudio.warp();
    setIsInflating(true);
    scaleFactorRef.current = 1;

    const interval = setInterval(() => {
      scaleFactorRef.current *= 1.15;
      if (scaleFactorRef.current >= 45) {
        clearInterval(interval);
        setIsInflating(false);
        uiaudio.success();
      }
    }, 50);
  };

  const handleReset = () => {
    uiaudio.click();
    scaleFactorRef.current = 1;
    setIsInflating(false);
  };

  // Cosmic Inflation Spacetime Metric Expansion Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const a = scaleFactorRef.current;

      // Dark Spacetime Background
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Expanding Grid of Spacetime Metric (de Sitter metric: ds^2 = -dt^2 + e^(2Ht) dx^2)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;

      const spacing = 20 * a;
      const startX = cx % spacing;
      const startY = cy % spacing;

      for (let x = startX; x < canvas.width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = startY; y < canvas.height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Quantum Metric Fluctuations Stretched Beyond Cosmological Horizon (Curling tensor wave loops)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;

      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        const r = (35 + i * 20) * (a / 5);
        ctx.arc(cx, cy, r, time + i, time + i + Math.PI);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Central Inflaton False Vacuum Core
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 30);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.4, '#06b6d4');
      coreGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Waves className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                COSMIC INFLATION // PRIMORDIAL GRAVITATIONAL WAVES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                TENSOR-TO-SCALAR RATIO r = {tensorScalarRatioR}
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Alan Guth 10²⁶ de Sitter expansion & CMB B-mode polarization for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCosmicInflation}
            disabled={isInflating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isInflating ? 'INFLATING SPACETIME METRIC (e⁶⁰)...' : 'TRIGGER COSMIC INFLATION (10⁻³⁵s)'}</span>
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
              <span className="text-cyan-400 font-bold">E-FOLDS: N = {eFoldsN}</span>
              <span className="text-pink-400 font-bold">ENERGY SCALE: {energyScaleGev} GeV</span>
            </div>
            <div>STATUS: {isInflating ? 'DE SITTER HORIZON EXPANSION' : 'FALSE VACUUM EQUILIBRIUM'}</div>
          </div>
        </div>

        {/* Inflationary Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              INFLATON POTENTIAL
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Tensor-to-Scalar Ratio (r):</span>
              <span className="text-cyan-400 font-bold">r = {tensorScalarRatioR}</span>
            </div>
            <input
              type="range"
              min={0.01}
              max={0.06}
              step={0.005}
              value={tensorScalarRatioR}
              onChange={(e) => setTensorScalarRatioR(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">ALAN GUTH 1981:</span>
            <div>• Solves the Horizon and Flatness problems by expanding the early universe by a factor of 10^26 in 10^-32 seconds.</div>
            <div>• Generates quantum primordial gravitational waves detectable via CMB B-mode polarization curls.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
