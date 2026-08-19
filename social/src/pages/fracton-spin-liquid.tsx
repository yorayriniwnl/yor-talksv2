import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Orbit
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonSpinLiquid() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [spinCouplingRatioJpm, setSpinCouplingRatioJpm] = useState(0.42); // 0.42 transverse exchange ratio
  const [tensorPhotonSpeedC, setTensorPhotonSpeedC] = useState(0.85); // 0.85 c tensor speed of light
  const [isSimulatingSpinLiquid, setIsSimulatingSpinLiquid] = useState(false);
  const [quantumFluctuationEntanglement, setQuantumFluctuationEntanglement] = useState(0.985);

  const animFrameRef = useRef<number | null>(null);

  const triggerSpinLiquidSim = () => {
    uiaudio.warp();
    setIsSimulatingSpinLiquid(true);

    setTimeout(() => {
      setIsSimulatingSpinLiquid(false);
      setQuantumFluctuationEntanglement(0.9998);
      uiaudio.success();
    }, 750);
  };

  // 3D Pyrochlore Lattice & Rank-2 U(1) Spin Liquid Canvas
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

      // Corner-Sharing Tetrahedra Pyrochlore Lattices (Left: 90 to 310)
      const numTetra = 4;
      for (let t = 0; t < numTetra; t++) {
        const tx = 110 + (t % 2) * 90;
        const ty = cy - 60 + Math.floor(t / 2) * 80;

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;

        // Tetrahedron Wireframe
        ctx.beginPath();
        ctx.moveTo(tx, ty - 25);
        ctx.lineTo(tx - 25, ty + 20);
        ctx.lineTo(tx + 25, ty + 20);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tx, ty - 25);
        ctx.lineTo(tx, ty + 8);
        ctx.lineTo(tx - 25, ty + 20);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(tx, ty + 8);
        ctx.lineTo(tx + 25, ty + 20);
        ctx.stroke();

        // Quantum Fluctuation Spin Vectors at Vertices
        [
          { x: tx, y: ty - 25 },
          { x: tx - 25, y: ty + 20 },
          { x: tx + 25, y: ty + 20 },
          { x: tx, y: ty + 8 }
        ].forEach((v, idx) => {
          const spinAngle = time * 2 + t + idx * (Math.PI / 2);
          ctx.fillStyle = idx % 2 === 0 ? '#ec4899' : '#06b6d4';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = isSimulatingSpinLiquid ? 18 : 4;
          ctx.beginPath();
          ctx.arc(v.x, v.y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // Rank-2 U(1) Emergent Gauge Kernel (Center at 380, cy)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isSimulatingSpinLiquid ? 24 : 8;
      ctx.beginPath();
      ctx.arc(380, cy, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('EMERGENT U(1)', 335, cy - 8);
      ctx.fillText('TENSOR PHOTON', 332, cy + 12);

      // Fracton Spin Liquid Output Block (Right at 530, cy)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isSimulatingSpinLiquid ? 24 : 6;
      ctx.strokeRect(490, cy - 65, 160, 100);
      ctx.fillRect(490, cy - 65, 160, 100);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('FRACTON SPIN LIQUID', 500, cy - 40);
      ctx.fillText('NO LONG-RANGE ORDER', 502, cy - 18);
      ctx.fillText(`ENTANGLEMENT = ${(quantumFluctuationEntanglement * 100).toFixed(2)}%`, 496, cy + 8);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `FRACTON SPIN LIQUID: J_± / J_zz = ${spinCouplingRatioJpm} | TENSOR LIGHT SPEED = ${tensorPhotonSpeedC} c | ENTANGLEMENT = ${(quantumFluctuationEntanglement * 100).toFixed(2)}% (SACHDEV & HERMELE)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [spinCouplingRatioJpm, tensorPhotonSpeedC, quantumFluctuationEntanglement, isSimulatingSpinLiquid]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Orbit className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400">
                FRACTON SPIN LIQUID // RANK-2 U(1) GAUGE THEORY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                SACHDEV, HERMELE & LEE (HARVARD & CU BOULDER)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Pyrochlore lattice quantum spin ice, gapless tensor photons & sub-dimensional dipoles for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerSpinLiquidSim}
            disabled={isSimulatingSpinLiquid}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSimulatingSpinLiquid ? 'FLUCTUATING TENSOR FIELD...' : 'EXCITE GAPLESS TENSOR PHOTONS'}</span>
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
              <span className="text-purple-400 font-bold">COUPLING: J_± / J_zz = {spinCouplingRatioJpm}</span>
              <span className="text-cyan-400 font-bold">TENSOR PHOTON SPEED: {tensorPhotonSpeedC} c</span>
              <span className="text-emerald-400 font-bold">ENTANGLEMENT: {(quantumFluctuationEntanglement * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: HIGHLY ENTANGLED QUANTUM DISORDERED GROUND STATE</div>
          </div>
        </div>

        {/* Spin Liquid Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              EXCHANGE COUPLING
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Transverse / Ising Ratio:</span>
              <span className="text-purple-400 font-bold">{spinCouplingRatioJpm}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={0.8}
              step={0.02}
              value={spinCouplingRatioJpm}
              onChange={(e) => setSpinCouplingRatioJpm(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Emergent Higher-Rank Electrodynamics:</strong> Strong quantum fluctuations melt magnetic order, giving rise to gapless quadrupole tensor photons with quadratic dispersion!</div>
            <div>• <strong>Sub-Dimensional Quasiparticles:</strong> Spinon charges cannot move individually without emitting tensor photons, naturally realizing fractons in physical magnetic insulators!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
