import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid, Orbit
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FoliatedEntanglementRg() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [subtractedLayersM, setSubtractedLayersM] = useState(2); // m = 2 decoupled layers
  const [entanglementCutAreaA, setEntanglementCutAreaA] = useState(16); // A = 16 boundary area
  const [isApplyingRgStep, setIsApplyingRgStep] = useState(false);
  const [foliatedEntanglementEntropyFidelity, setFoliatedEntanglementEntropyFidelity] = useState(0.988);

  const animFrameRef = useRef<number | null>(null);

  const triggerFoliatedRgFlow = () => {
    uiaudio.warp();
    setIsApplyingRgStep(true);

    setTimeout(() => {
      setIsApplyingRgStep(false);
      setFoliatedEntanglementEntropyFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Foliated Fracton Entanglement Renormalization Group Flow Canvas
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

      // 3D Foliated Block with Subtracted 2D Layers (Left: 80 to 260)
      const numPlanes = 4;
      for (let p = 0; p < numPlanes; p++) {
        const py = cy - 70 + p * 45;
        const isDecoupled = p < subtractedLayersM;

        ctx.fillStyle = isDecoupled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.2)';
        ctx.strokeStyle = isDecoupled ? '#ef4444' : '#06b6d4';
        ctx.lineWidth = isDecoupled ? 1.5 : 2.5;

        ctx.beginPath();
        ctx.moveTo(90, py);
        ctx.lineTo(240, py - 20);
        ctx.lineTo(270, py + 20);
        ctx.lineTo(120, py + 40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Layer Status Indicator
        ctx.fillStyle = isDecoupled ? '#ef4444' : '#06b6d4';
        ctx.font = 'bold 8px monospace';
        ctx.fillText(isDecoupled ? `DECOUPLED 2D LAYER ${p + 1}` : `BULK FOLIATION ${p + 1}`, 105, py + 15);
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FOLIATED RG SLICES', 110, cy + 95);

      // Foliated Entanglement RG Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isApplyingRgStep ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FOLIATED RG FLOW', 320, cy - 12);
      ctx.fillText('S_topo = S - m·S_2D', 314, cy + 8);

      // Scale-Invariant Fractonic Core Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isApplyingRgStep ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FRACTONIC FIXED POINT', 488, cy - 35);
      ctx.fillText('SCALE-INVARIANT SUBSPACE', 484, cy - 10);
      ctx.fillText(`ENTROPY FIDELITY = ${(foliatedEntanglementEntropyFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FOLIATED ENTANGLEMENT RG: SUBTRACTED LAYERS m = ${subtractedLayersM} | AREA A = ${entanglementCutAreaA} | FIDELITY = ${(foliatedEntanglementEntropyFidelity * 100).toFixed(2)}% (SHIRLEY & CHEN)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [subtractedLayersM, entanglementCutAreaA, foliatedEntanglementEntropyFidelity, isApplyingRgStep]);

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
                FOLIATED ENTANGLEMENT RG // LAYER DECOUPLING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                SHIRLEY, SLAGLE & CHEN (CALTECH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              3D Foliated topological entanglement entropy & layer-subtracted RG flow for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerFoliatedRgFlow}
            disabled={isApplyingRgStep}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isApplyingRgStep ? 'SUBTRACTING 2D LAYERS...' : 'EXECUTE FOLIATED RG STEP'}</span>
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
              <span className="text-purple-400 font-bold">SUBTRACTED LAYERS: m = {subtractedLayersM}</span>
              <span className="text-cyan-400 font-bold">CUT AREA: A = {entanglementCutAreaA}</span>
              <span className="text-emerald-400 font-bold">FIDELITY: {(foliatedEntanglementEntropyFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: FOLIATED SUBSYSTEM ENTANGLEMENT CONSERVED</div>
          </div>
        </div>

        {/* Foliated RG Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LAYER DECOUPLING (m)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Subtracted 2D Slices:</span>
              <span className="text-purple-400 font-bold">m = {subtractedLayersM}</span>
            </div>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={subtractedLayersM}
              onChange={(e) => setSubtractedLayersM(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Foliated Entanglement Subtraction:</strong> The genuine 3D fracton topological entanglement entropy is obtained by subtracting the extensive 2D layer entanglement contributions!</div>
            <div>• <strong>Fixed-Point Subspace Flow:</strong> Under foliated entanglement RG steps, the 3D quantum state flows toward a scale-invariant fixed-point Hamiltonian without changing its fracton superselection sectors!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
