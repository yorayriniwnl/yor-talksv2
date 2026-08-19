import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Disc3, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonHelicalDisclinations() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [helicalPitchAngleDegree, setHelicalPitchAngleDegree] = useState(30); // 30 deg helical tilt
  const [chiralSmecticPurity, setChiralSmecticPurity] = useState(0.988);
  const [isCondensingHelicalLoops, setIsCondensingHelicalLoops] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerHelicalLoopCondensation = () => {
    uiaudio.warp();
    setIsCondensingHelicalLoops(true);

    setTimeout(() => {
      setIsCondensingHelicalLoops(false);
      setChiralSmecticPurity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton Helical Disclination Loop Condensate Canvas
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

      // Chiral Smectic-C* Layer Spiral Stacks (Left: 80 to 240)
      const numLayers = 6;
      for (let l = 0; l < numLayers; l++) {
        const ly = cy - 50 + l * 18;
        const layerTilt = Math.sin(time * 3 + l * 0.8) * (helicalPitchAngleDegree / 4);

        // Chiral Smectic Layer Plane (Cyan)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(80, ly - layerTilt);
        ctx.lineTo(240, ly + layerTilt);
        ctx.stroke();

        // Helical Frank Disclination Vortex Core (Pink)
        const helixX = 160 + Math.cos(time * 2 + l) * 20;
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(helixX, ly, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ec4899';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CHIRAL HELICAL DISCLINATIONS', 65, cy + 90);

      // Condensation Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isCondensingHelicalLoops ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('HELICAL CONDENSATE', 315, cy - 12);
      ctx.fillText('SMECTIC-C* PHASE', 320, cy + 8);

      // Chiral Smectic Phase Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isCondensingHelicalLoops ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CHIRAL ORDER STABILIZED', 484, cy - 35);
      ctx.fillText('HELICAL EDGE SUPERCURRENT', 480, cy - 10);
      ctx.fillText(`CHIRAL PURITY = ${(chiralSmecticPurity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `HELICAL DISCLINATIONS: PITCH = ${helicalPitchAngleDegree}° | CHIRAL PURITY = ${(chiralSmecticPurity * 100).toFixed(2)}% (PRETKO, RADZIHOVSKY & NELSON)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [helicalPitchAngleDegree, chiralSmecticPurity, isCondensingHelicalLoops]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Disc3 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-indigo-400">
                HELICAL DISCLINATIONS // CHIRAL SMECTIC CONDENSATES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                PRETKO, RADZIHOVSKY & NELSON (HARVARD & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Chiral helical Frank disclination loop condensation into Smectic-C* liquid crystals for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerHelicalLoopCondensation}
            disabled={isCondensingHelicalLoops}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCondensingHelicalLoops ? 'CONDENSING HELICAL LOOPS...' : 'CONDENSE HELICAL LOOPS'}</span>
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
              <span className="text-pink-400 font-bold">PITCH: {helicalPitchAngleDegree}°</span>
              <span className="text-cyan-400 font-bold">PHASE: CHIRAL SMECTIC-C*</span>
              <span className="text-emerald-400 font-bold">PURITY: {(chiralSmecticPurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: CHIRAL HELICAL DISCLINATION CONDENSATION CONVERGED</div>
          </div>
        </div>

        {/* Helical Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              HELICAL TILT (°)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Chiral Tilt Angle:</span>
              <span className="text-pink-400 font-bold">{helicalPitchAngleDegree}°</span>
            </div>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={helicalPitchAngleDegree}
              onChange={(e) => setHelicalPitchAngleDegree(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Chiral Helical Loop Condensation:</strong> Proliferating helical disclination loops breaks spatial inversion symmetry, stabilizing a chiral Smectic-C* phase!</div>
            <div>• <strong>Protected Helical Edge Modes:</strong> Features non-dissipative chiral lineon edge supercurrents circulating along layer boundaries!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
