import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FoliatedFractonPhase() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [foliationLayerCountK, setFoliationLayerCountK] = useState(3); // k = 3 foliation layers
  const [interlayerCouplingJ, setInterlayerCouplingJ] = useState(0.85); // J = 0.85 inter-layer coupling
  const [isDecouplingFoliation, setIsDecouplingFoliation] = useState(false);
  const [foliatedTopologicalFidelity, setFoliatedTopologicalFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerFoliationDecoupling = () => {
    uiaudio.warp();
    setIsDecouplingFoliation(true);

    setTimeout(() => {
      setIsDecouplingFoliation(false);
      setFoliatedTopologicalFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Foliated Fracton Stackable Layer Phase Canvas
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

      // Stacked 2D Toric Foliation Planes (Left: 90 to 280)
      for (let layer = 0; layer < foliationLayerCountK; layer++) {
        const ly = cy - 70 + layer * 45;

        // 2D Foliation Plane
        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(90, ly);
        ctx.lineTo(240, ly - 20);
        ctx.lineTo(270, ly + 20);
        ctx.lineTo(120, ly + 40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2D Mobile Lineon String inside Layer
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(110, ly + 15); ctx.lineTo(220, ly - 5);
        ctx.stroke();

        // Lineon Particle Core
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(220, ly - 5, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FOLIATED 2D STACKS', 105, cy + 95);

      // Foliated Entanglement RG Kernel (Center at 380, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isDecouplingFoliation ? 24 : 8;
      ctx.beginPath();
      ctx.arc(380, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FOLIATED RG MAP', 328, cy - 12);
      ctx.fillText('H_3D ~ ⊕ H_2D ⊗ M', 324, cy + 8);

      // Decoupled Foliated Topological Order Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isDecouplingFoliation ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FOLIATED EQUIVALENCE', 492, cy - 35);
      ctx.fillText('FRACTON GSD SCALES AS 2^2k', 484, cy - 10);
      ctx.fillText(`TOPOLOGICAL FIDELITY = ${(foliatedTopologicalFidelity * 100).toFixed(2)}%`, 486, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FOLIATED FRACTON ORDER: LAYERS k = ${foliationLayerCountK} | COUPLING J = ${interlayerCouplingJ} | FIDELITY = ${(foliatedTopologicalFidelity * 100).toFixed(2)}% (SHIRLEY, SLAGLE & CHEN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [foliationLayerCountK, interlayerCouplingJ, foliatedTopologicalFidelity, isDecouplingFoliation]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Layers className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-sky-300 to-pink-400">
                FOLIATED FRACTON PHASE // 3D LAYER DECOUPLING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                SHIRLEY, SLAGLE & CHEN (CALTECH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Foliated quantum RG flow & 2D stackable topological order decoupling for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFoliationDecoupling}
            disabled={isDecouplingFoliation}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDecouplingFoliation ? 'DECOUPLING LAYERS...' : 'EXECUTE FOLIATED RG FLOW'}</span>
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
              <span className="text-purple-400 font-bold">FOLIATION LAYERS: k = {foliationLayerCountK}</span>
              <span className="text-cyan-400 font-bold">COUPLING: J = {interlayerCouplingJ}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(foliatedTopologicalFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: FOLIATED SUBSYSTEM ENTANGLEMENT CONSERVED</div>
          </div>
        </div>

        {/* Foliated Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LAYER COUNT (k)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Stackable 2D Layers:</span>
              <span className="text-purple-400 font-bold">k = {foliationLayerCountK}</span>
            </div>
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={foliationLayerCountK}
              onChange={(e) => setFoliationLayerCountK(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Foliated Equivalence:</strong> 3D fracton phases remain invariant under the addition or removal of decoupleable 2D topological layers via local unitary circuits!</div>
            <div>• <strong>Sub-System Planar Mobility:</strong> Excitations are strictly confined to 2D foliation planes as mobile planons, forming bound immobile 0D fracton composite junctions!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
