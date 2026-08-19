import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Maximize2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonMoireFlatband() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [twistAngleThetaDegrees, setTwistAngleThetaDegrees] = useState(1.08); // θ = 1.08° magic twist angle
  const [flatBandBandwidthMev, setFlatBandBandwidthMev] = useState(0.8); // W = 0.8 meV ultra-narrow bandwidth
  const [isSynthesizingFlatBand, setIsSynthesizingFlatBand] = useState(false);
  const [fractonFlatBandFidelity, setFractonFlatBandFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerFlatBandSynthesis = () => {
    uiaudio.warp();
    setIsSynthesizingFlatBand(true);

    setTimeout(() => {
      setIsSynthesizingFlatBand(false);
      setFractonFlatBandFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton-Elasticity Moiré Superlattice & Flat Bands Canvas
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

      // Twisted Moiré Interference Pattern (Left: 80 to 260)
      const gridSize = 7;
      const spacing = 22;
      const twistRad = (twistAngleThetaDegrees * Math.PI) / 180;

      // Layer 1 (Cyan)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
      ctx.lineWidth = 1.5;
      for (let i = -gridSize; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(170 + i * spacing, cy - 80);
        ctx.lineTo(170 + i * spacing, cy + 80);
        ctx.stroke();
      }

      // Layer 2 (Pink - Twisted by theta)
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.lineWidth = 1.5;
      for (let i = -gridSize; i <= gridSize; i++) {
        const x1 = 170 + (i * spacing) * Math.cos(twistRad) - (-80) * Math.sin(twistRad);
        const y1 = cy + (i * spacing) * Math.sin(twistRad) + (-80) * Math.cos(twistRad);
        const x2 = 170 + (i * spacing) * Math.cos(twistRad) - (80) * Math.sin(twistRad);
        const y2 = cy + (i * spacing) * Math.sin(twistRad) + (80) * Math.cos(twistRad);

        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Localized Immobile Fractons at Moiré AA Stacking Pockets
      const numAA = 3;
      for (let a = 0; a < numAA; a++) {
        const aax = 135 + a * 35;
        const aay = cy - 20 + a * 20;
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = isSynthesizingFlatBand ? 20 : 6;
        ctx.beginPath();
        ctx.arc(aax, aay, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('MOIRÉ SUPERLATTICE (θ = 1.08°)', 85, cy + 90);

      // Higher-Rank Flat Band Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isSynthesizingFlatBand ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FLAT BAND KERNEL', 318, cy - 12);
      ctx.fillText('W = 0.8 meV WIDTH', 320, cy + 8);

      // Flat Band Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isSynthesizingFlatBand ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('HIGHER-RANK FLAT BANDS', 492, cy - 35);
      ctx.fillText('E(k) ≈ 0 DISPERSIONLESS', 484, cy - 10);
      ctx.fillText(`TOPOLOGICAL FIDELITY = ${(fractonFlatBandFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON MOIRÉ FLAT BANDS: TWIST ANGLE θ = ${twistAngleThetaDegrees}° | BANDWIDTH W = ${flatBandBandwidthMev} meV | FIDELITY = ${(fractonFlatBandFidelity * 100).toFixed(2)}% (VISHWANATH & PRETKO)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [twistAngleThetaDegrees, flatBandBandwidthMev, fractonFlatBandFidelity, isSynthesizingFlatBand]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Maximize2 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-indigo-400">
                FRACTON MOIRÉ SUPERLATTICE // FLAT BANDS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                VISHWANATH, PRETKO & RADZIHOVSKY (HARVARD & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Twisted bilayer elasticity fracton higher-rank flat bands & dispersionless 0D charges for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFlatBandSynthesis}
            disabled={isSynthesizingFlatBand}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSynthesizingFlatBand ? 'SYNTHESIZING FLAT BANDS...' : 'SYNTHESIZE MOIRÉ FLAT BANDS'}</span>
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
              <span className="text-purple-400 font-bold">TWIST ANGLE: θ = {twistAngleThetaDegrees}°</span>
              <span className="text-pink-400 font-bold">BANDWIDTH: W = {flatBandBandwidthMev} meV</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(fractonFlatBandFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: DISPERSIONLESS HIGHER-RANK FLAT BAND CONFINED</div>
          </div>
        </div>

        {/* Flat Band Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TWIST ANGLE (θ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Magic Angle:</span>
              <span className="text-purple-400 font-bold">θ = {twistAngleThetaDegrees}°</span>
            </div>
            <input
              type="range"
              min={0.8}
              max={2.0}
              step={0.02}
              value={twistAngleThetaDegrees}
              onChange={(e) => setTwistAngleThetaDegrees(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Strain-Induced Gauge Potentials:</strong> In twisted elasticity superlattices, interlayer moiré strain generates pseudo-rank-2 tensor gauge fields that completely flatten the electronic dispersion (E(k) approx 0)!</div>
            <div>• <strong>Strongly Correlated Fractons:</strong> Immobile 0D fractons localize in moiré AA stacking pockets with ultra-narrow bandwidth under 1 meV, forming exotic non-Fermi liquid states!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
