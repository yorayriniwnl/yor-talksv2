import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Cuboid as Cube
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fractonLatticeSizeL, setFractonLatticeSizeL] = useState(4); // 4x4x4 X-cube lattice
  const [excitationType, setExcitationType] = useState<'Immobile_Fracton_0D' | 'Lineon_1D' | 'Planon_2D'>('Immobile_Fracton_0D');
  const [isInjecting, setIsInjecting] = useState(false);
  const [memoryCodeDistance, setMemoryCodeDistance] = useState(16); // d = 4L = 16

  const animFrameRef = useRef<number | null>(null);

  const triggerFractonExcitation = () => {
    uiaudio.warp();
    setIsInjecting(true);

    setTimeout(() => {
      setIsInjecting(false);
      uiaudio.success();
    }, 750);
  };

  // 3D X-Cube Fracton Topological Model Canvas
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

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw 3D Isometric Cubic Spin Mesh
      const rot = time * 0.3;
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            const px = cx + (x * 45 - y * 45) * Math.cos(rot * 0.3);
            const py = cy + (x * 22 + y * 22) - z * 35;

            // Qubit on edge
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw Point-Like Immobile Fracton (0D) / Lineon (1D) Excitation
      ctx.fillStyle = excitationType === 'Immobile_Fracton_0D' ? '#ef4444' : (excitationType === 'Lineon_1D' ? '#f59e0b' : '#38bdf8');
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = isInjecting ? 25 : 12;

      // 4 Bound Fractons at Cube Corners
      const offsets = [
        { dx: -35, dy: -20 },
        { dx: 35, dy: -20 },
        { dx: -35, dy: 20 },
        { dx: 35, dy: 20 },
      ];

      offsets.forEach((off) => {
        ctx.beginPath();
        ctx.arc(cx + off.dx, cy + off.dy, 7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `X-CUBE FRACTON: ${excitationType.toUpperCase()} | IMMOBILE SUB-DIMENSIONAL EXCITATION (CODE DISTANCE d = ${memoryCodeDistance})`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [fractonLatticeSizeL, excitationType, memoryCodeDistance, isInjecting]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Cube className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400">
                X-CUBE FRACTON // 3D TOPOLOGICAL QUANTUM MEMORY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                VIJAY, HAAH & FU (CALTECH / MIT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Strictly immobile 0D fractons & sub-dimensional topological quantum protection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFractonExcitation}
            disabled={isInjecting}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isInjecting ? 'CREATING CUBE STABILIZER DEFECT...' : 'INJECT FRACTON CORRELATION'}</span>
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
              <span className="text-purple-400 font-bold">LATTICE: {fractonLatticeSizeL}x{fractonLatticeSizeL}x{fractonLatticeSizeL} X-CUBE</span>
              <span className="text-pink-400 font-bold">QUASIPARTICLE: {excitationType}</span>
              <span className="text-emerald-400 font-bold">CODE DISTANCE: d = {memoryCodeDistance}</span>
            </div>
            <div>STATUS: ZERO ISOLATED FRACTON MOBILITY (IMMUNE TO THERMAL HOPPING)</div>
          </div>
        </div>

        {/* Fracton Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            FRACTON QUASIPARTICLE
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setExcitationType('Immobile_Fracton_0D');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                excitationType === 'Immobile_Fracton_0D' ? "bg-red-500/20 border-red-400 text-red-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Point Fracton (0D Immobile)</div>
              <div className="text-[10px] text-zinc-400">Cannot move without creating dipoles</div>
            </button>

            <button
              onClick={() => {
                setExcitationType('Lineon_1D');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                excitationType === 'Lineon_1D' ? "bg-amber-500/20 border-amber-400 text-amber-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Lineon (1D Motion Only)</div>
              <div className="text-[10px] text-zinc-400">Moves strictly along 1D spatial axes</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Sub-Dimensional Mobility:</strong> Isolated fractons have zero spatial mobility ($0\text{D}$), meaning thermal energy cannot cause random walk errors in quantum memory!</div>
            <div>• <strong>Foliated Quantum Order:</strong> The code distance grows linearly as $d = \mathcal{O}(L)$, creating an ultra-stable self-correcting 3D quantum hard drive!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
