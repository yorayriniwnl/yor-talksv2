import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Box
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function NonAbelianFracton() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [nonAbelianQuantumDimD, setNonAbelianQuantumDimD] = useState(1.618); // Golden ratio dim d = (1 + sqrt(5))/2 (Fibonacci Anyon Fracton)
  const [subsystemSymmetryPlanes, setSubsystemSymmetryPlanes] = useState<'XY_XZ_YZ' | 'Twisted_Foliated'>('XY_XZ_YZ');
  const [isBraiding, setIsBraiding] = useState(false);
  const [memoryDegeneracy, setMemoryDegeneracy] = useState(64); // 2^(3L - 3)

  const animFrameRef = useRef<number | null>(null);

  const triggerNonAbelianBraiding = () => {
    uiaudio.warp();
    setIsBraiding(true);

    setTimeout(() => {
      setIsBraiding(false);
      uiaudio.success();
    }, 750);
  };

  // 3D Non-Abelian Fracton Sub-System Code Canvas
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

      // Draw 3D Cubic Sub-system Lattice Sites
      const rot = time * 0.25;
      for (let x = -2; x <= 2; x++) {
        for (let y = -2; y <= 2; y++) {
          for (let z = -1; z <= 1; z++) {
            const px = cx + (x * 45 - y * 45) * Math.cos(rot * 0.3);
            const py = cy + (x * 22 + y * 22) - z * 35;

            // Subsystem Lattice Node
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Draw Non-Abelian Immobile Fracton Quasiparticle Cluster (Center at cx, cy)
      const fractons = [
        { dx: -40, dy: -25, color: '#ec4899' },
        { dx: 40, dy: -25, color: '#ec4899' },
        { dx: -40, dy: 25, color: '#06b6d4' },
        { dx: 40, dy: 25, color: '#06b6d4' },
      ];

      fractons.forEach((f) => {
        ctx.fillStyle = f.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowColor = f.color;
        ctx.shadowBlur = isBraiding ? 25 : 12;
        ctx.beginPath();
        ctx.arc(cx + f.dx, cy + f.dy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Braiding / Fusion Channel Ribbon
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 40, cy - 25); ctx.lineTo(cx + 40, cy + 25);
      ctx.moveTo(cx + 40, cy - 25); ctx.lineTo(cx - 40, cy + 25);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `NON-ABELIAN FRACTON CODE: QUANTUM DIM d = ${nonAbelianQuantumDimD} | GROUND DEGENERACY = ${memoryDegeneracy} | SUB-SYSTEM SYMMETRY: ${subsystemSymmetryPlanes}`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nonAbelianQuantumDimD, subsystemSymmetryPlanes, memoryDegeneracy, isBraiding]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Box className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-indigo-300 to-cyan-400">
                NON-ABELIAN FRACTONS // SUB-SYSTEM TOPOLOGICAL QUANTUM MEMORY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                VIJAY, HAAH & FU (HARVARD & MIT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Fibonacci non-Abelian quantum dimensions ($d = 1.618$) & planar sub-system symmetries for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerNonAbelianBraiding}
            disabled={isBraiding}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBraiding ? 'FUSING NON-ABELIAN FRACTONS...' : 'BRAID SUB-SYSTEM FRACTON CLUSTER'}</span>
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
              <span className="text-pink-400 font-bold">QUANTUM DIM: d = {nonAbelianQuantumDimD}</span>
              <span className="text-cyan-400 font-bold">DEGENERACY: {memoryDegeneracy}-Fold</span>
              <span className="text-emerald-400 font-bold">SYMMETRY: {subsystemSymmetryPlanes}</span>
            </div>
            <div>STATUS: NON-ABELIAN TOPOLOGICAL FUSION CHANNELS ACTIVE</div>
          </div>
        </div>

        {/* Non-Abelian Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SUB-SYSTEM FRACTON TOPOLOGY
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Non-Abelian Fracton Excitations:</strong> Unlike Abelian toric codes, braiding four immobile fractons in a cage acts non-trivially on an internal multi-dimensional Hilbert space!</div>
            <div>• <strong>Planar Sub-System Invariance:</strong> Protected by planar conservation laws, preventing thermal noise from diffusing errors across orthogonal planes!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
