import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit, Disc3
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonDisclinationCondensates() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [disclinationAngleOmega, setDisclinationAngleOmega] = useState(60); // Ω = 60° Frank angle
  const [smecticPhasePurity, setSmecticPhasePurity] = useState(0.988);
  const [isCondensingDisclinations, setIsCondensingDisclinations] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerDisclinationCondensation = () => {
    uiaudio.warp();
    setIsCondensingDisclinations(true);

    setTimeout(() => {
      setIsCondensingDisclinations(false);
      setSmecticPhasePurity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Fracton Disclination Loop Condensate Canvas
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

      // Disclination Loop Condensate Smectic Layer Stacks (Left: 80 to 240)
      const numLayers = 5;
      for (let l = 0; l < numLayers; l++) {
        const ly = cy - 40 + l * 20;
        const layerWobble = Math.sin(time * 3 + l) * 5;

        // Smectic Planar Crystal Sheets (Cyan)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(80, ly + layerWobble);
        ctx.lineTo(240, ly + layerWobble);
        ctx.stroke();

        // 60-degree Disclination Line Nodes (Pink)
        if (l % 2 === 1) {
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(160, ly + layerWobble, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DISCLINATION CONDENSATE (Ω=60°)', 65, cy + 90);

      // Phase Transition Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isCondensingDisclinations ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DISCLINATION CONDENSATE', 300, cy - 12);
      ctx.fillText('SMECTIC LIQUID CRYSTAL', 302, cy + 8);

      // Smectic Liquid Crystal Phase Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isCondensingDisclinations ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SMECTIC ORDER STABILIZED', 484, cy - 35);
      ctx.fillText('ANISOTROPIC PLANONS', 484, cy - 10);
      ctx.fillText(`SMECTIC PURITY = ${(smecticPhasePurity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DISCLINATION CONDENSATE: FRANK Ω = ${disclinationAngleOmega}° | SMECTIC PURITY = ${(smecticPhasePurity * 100).toFixed(2)}% (RADZIHOVSKY & ZAANEN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [disclinationAngleOmega, smecticPhasePurity, isCondensingDisclinations]);

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
                DISCLINATION CONDENSATE // SMECTIC CRYSTAL PHASES
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                RADZIHOVSKY, PRETKO & ZAANEN (CU BOULDER, HARVARD & LEIDEN)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rotational Frank disclination loop condensation into anisotropic smectic & nematic liquid crystals for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerDisclinationCondensation}
            disabled={isCondensingDisclinations}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCondensingDisclinations ? 'CONDENSING DISCLINATIONS...' : 'CONDENSE DISCLINATION LOOPS'}</span>
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
              <span className="text-pink-400 font-bold">FRANK ANGLE: Ω = {disclinationAngleOmega}°</span>
              <span className="text-cyan-400 font-bold">ORDER: SMECTIC-A</span>
              <span className="text-emerald-400 font-bold">PURITY: {(smecticPhasePurity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: ROTATIONAL DISCLINATION LOOP CONDENSATION CONVERGED</div>
          </div>
        </div>

        {/* Condensate Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              FRANK ANGLE (Ω)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Rotational Defect:</span>
              <span className="text-pink-400 font-bold">Ω = {disclinationAngleOmega}°</span>
            </div>
            <input
              type="range"
              min={30}
              max={120}
              step={30}
              value={disclinationAngleOmega}
              onChange={(e) => setDisclinationAngleOmega(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Rotational Disclination Condensation:</strong> Proliferating closed disclination loops restores rotational symmetry while preserving 1D translational order!</div>
            <div>• <strong>Smectic Planon Excitations:</strong> Fracton quasiparticles become mobile 2D planons sliding freely along layered smectic planes without interlayer dissipation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
