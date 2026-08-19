import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Copy
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function TwinStateQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [twinAsymmetryFactor, setTwinAsymmetryFactor] = useState(1.2); // Asymmetric noise ratio rho_1 / rho_2
  const [coherentDriftAngleRad, setCoherentDriftAngleRad] = useState(0.18); // 0.18 rad coherent over-rotation
  const [isDistilling, setIsDistilling] = useState(false);
  const [purifiedStateFidelity, setPurifiedStateFidelity] = useState(0.984);

  const animFrameRef = useRef<number | null>(null);

  const triggerTwinStateDistillation = () => {
    uiaudio.warp();
    setIsDistilling(true);

    setTimeout(() => {
      setIsDistilling(false);
      setPurifiedStateFidelity(0.9994);
      uiaudio.success();
    }, 750);
  };

  // Asymmetric Twin-State Virtual Verification Canvas
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

      // Copy 1 (Noisy State ρ_1) at (140, cy - 65)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(140, cy - 65, 45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('NOISY COPY ρ_1', 95, cy - 120);

      // Copy 2 (Asymmetric Noisy State ρ_2) at (140, cy + 65)
      ctx.fillStyle = 'rgba(236, 72, 153, 0.2)';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(140, cy + 65, 45 * twinAsymmetryFactor * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ec4899';
      ctx.fillText('ASYMMETRIC COPY ρ_2', 75, cy + 125);

      // Virtual Parity Distillation Engine (Center at 320, cy - 60)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isDistilling ? 20 : 6;
      ctx.strokeRect(310, cy - 60, 160, 120);
      ctx.fillRect(310, cy - 60, 160, 120);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('VIRTUAL VERIFICATION', 320, cy - 25);
      ctx.fillText('SWAP TEST KERNEL', 335, cy);
      ctx.fillText('Tr(Π_even ρ_1 ρ_2)', 325, cy + 25);

      // Connecting State Wires
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(185, cy - 65); ctx.lineTo(310, cy - 20);
      ctx.stroke();

      ctx.strokeStyle = '#ec4899';
      ctx.beginPath();
      ctx.moveTo(185, cy + 65); ctx.lineTo(310, cy + 20);
      ctx.stroke();

      // Purified Quantum Expectation Output (Right Node at 580, cy)
      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isDistilling ? 22 : 12;
      ctx.beginPath();
      ctx.arc(580, cy, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('PURIFIED ρ_pure', 535, cy - 6);
      ctx.fillText(`F = ${(purifiedStateFidelity * 100).toFixed(2)}%`, 542, cy + 12);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `TWIN-STATE QEM: ASYMMETRIC VERIFICATION | PURIFIED FIDELITY = ${(purifiedStateFidelity * 100).toFixed(2)}% (ZERO PHYSICAL ANCILLA)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [twinAsymmetryFactor, coherentDriftAngleRad, purifiedStateFidelity, isDistilling]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Copy className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                TWIN-STATE QEM // ASYMMETRIC VIRTUAL VERIFICATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                HUGGINS & MCCLEAN (GOOGLE QUANTUM AI)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Dual-copy parity projection & coherent error distillation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerTwinStateDistillation}
            disabled={isDistilling}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isDistilling ? 'PROJECTING ASYMMETRIC PARITY...' : 'DISTILL TWIN STATES'}</span>
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
              <span className="text-cyan-400 font-bold">ASYMMETRY: {twinAsymmetryFactor}x</span>
              <span className="text-pink-400 font-bold">COHERENT DRIFT: {coherentDriftAngleRad} rad</span>
              <span className="text-emerald-400 font-bold">PURIFIED FIDELITY: {(purifiedStateFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: ZERO PHYSICAL ANCILLA REGISTERS REQUIRED</div>
          </div>
        </div>

        {/* Twin-State Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ASYMMETRIC RATIO
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Noise Asymmetry (ρ₁/ρ₂):</span>
              <span className="text-cyan-400 font-bold">{twinAsymmetryFactor}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.1}
              value={twinAsymmetryFactor}
              onChange={(e) => setTwinAsymmetryFactor(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Virtual State Verification:</strong> Projecting two unentangled state copies into the symmetric subspace cancels odd-parity coherent errors and systematic gate drifts!</div>
            <div>• <strong>Robust Against Asymmetry:</strong> Even when the two experimental state preparations suffer from different noise rates, virtual verification quadratically suppresses infidelity!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
