import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Disc3, ShieldAlert, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonBraidSurfaces() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [surfaceHolonomyPhaseTheta, setSurfaceHolonomyPhaseTheta] = useState(45); // θ = 45° surface holonomy
  const [higherFormBraidingPurity, setHigherFormBraidingPurity] = useState(0.988);
  const [isBraidingSurfaces, setIsBraidingSurfaces] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerSurfaceBraiding = () => {
    uiaudio.warp();
    setIsBraidingSurfaces(true);

    setTimeout(() => {
      setIsBraidingSurfaces(false);
      setHigherFormBraidingPurity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Frank-Burgers Loop Braiding Surfaces Canvas
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

      // 2D World-Sheet Braiding Ribbon Surfaces (Left: 80 to 240)
      const numRibbons = 3;
      for (let r = 0; r < numRibbons; r++) {
        const rx = 100 + r * 45;
        const wave = Math.sin(time * 3 + r) * 12;

        // 2D World-Sheet Surface Ribbon Mesh (Pink & Cyan)
        ctx.fillStyle = r % 2 === 0 ? 'rgba(236, 72, 153, 0.25)' : 'rgba(6, 182, 212, 0.25)';
        ctx.strokeStyle = r % 2 === 0 ? '#ec4899' : '#06b6d4';
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(rx - 15 + wave, cy - 50);
        ctx.bezierCurveTo(rx + 25 - wave, cy - 20, rx - 20 + wave, cy + 20, rx + 15 - wave, cy + 50);
        ctx.lineTo(rx - 10 - wave, cy + 50);
        ctx.bezierCurveTo(rx - 35 + wave, cy + 20, rx + 10 - wave, cy - 20, rx - 30 + wave, cy - 50);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 1D Frank-Burgers Boundary Loop on surface edge
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(rx + wave, cy + 50, 12, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('2D BRAIDING WORLD-SHEETS', 70, cy + 90);

      // Braiding Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isBraidingSurfaces ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('BRAIDING SURFACES', 315, cy - 12);
      ctx.fillText('2-FORM GENERALIZED', 310, cy + 8);

      // 2-Form Higher-Form Holonomy Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isBraidingSurfaces ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SURFACE HOLONOMY VERIFIED', 482, cy - 35);
      ctx.fillText('NON-ABELIAN 2-FORM PHASE', 484, cy - 10);
      ctx.fillText(`SURFACE PURITY = ${(higherFormBraidingPurity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `BRAID SURFACES: HOLONOMY θ = ${surfaceHolonomyPhaseTheta}° | PURITY = ${(higherFormBraidingPurity * 100).toFixed(2)}% (PRETKO, RADZIHOVSKY & SEIBERG)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [surfaceHolonomyPhaseTheta, higherFormBraidingPurity, isBraidingSurfaces]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Waves className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                BRAID SURFACES // 2-FORM GENERALIZED SYMMETRIES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                PRETKO, RADZIHOVSKY & NATHAN SEIBERG (HARVARD, IAS & BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3D spacetime 2D world-sheet surfaces of Frank-Burgers loop braiding for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerSurfaceBraiding}
            disabled={isBraidingSurfaces}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBraidingSurfaces ? 'BRAIDING 2D WORLD-SHEETS...' : 'BRAID WORLD-SHEET SURFACES'}</span>
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
              <span className="text-pink-400 font-bold">HOLONOMY: θ = {surfaceHolonomyPhaseTheta}°</span>
              <span className="text-cyan-400 font-bold">SYMMETRY: 2-FORM GENERALIZED</span>
              <span className="text-emerald-400 font-bold">PURITY: {(higherFormBraidingPurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: NON-ABELIAN 2-FORM SURFACE BRAIDING CONVERGED</div>
          </div>
        </div>

        {/* Braid Surface Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SURFACE HOLONOMY (θ)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Braiding Angle:</span>
              <span className="text-pink-400 font-bold">θ = {surfaceHolonomyPhaseTheta}°</span>
            </div>
            <input
              type="range"
              min={15}
              max={90}
              step={5}
              value={surfaceHolonomyPhaseTheta}
              onChange={(e) => setSurfaceHolonomyPhaseTheta(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>2D World-Sheet Braiding Surfaces:</strong> When closed Frank-Burgers loops sweep through 3D spacetime, their intersecting 2D surfaces encode higher-form non-Abelian holonomies!</div>
            <div>• <strong>Higher-Form Topological Protection:</strong> 2-form generalized symmetries ensure exponential suppression of both 0D fracton and 1D lineon thermal errors!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
