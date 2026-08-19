import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Scale, HelpCircle, Layers, Box, Grid
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FractonDisclinationClumping() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [latticeTemperatureKelvin, setLatticeTemperatureKelvin] = useState(140); // 140K lattice temperature
  const [coreEnergyDisclinationEv, setCoreEnergyDisclinationEv] = useState(1.85); // 1.85 eV core energy
  const [isSimulatingBktMelt, setIsSimulatingBktMelt] = useState(false);
  const [hexaticOrderParameterFidelity, setHexaticOrderParameterFidelity] = useState(0.987);

  const animFrameRef = useRef<number | null>(null);

  const triggerDisclinationMelting = () => {
    uiaudio.warp();
    setIsSimulatingBktMelt(true);

    setTimeout(() => {
      setIsSimulatingBktMelt(false);
      setHexaticOrderParameterFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Fracton Disclination Clumping & Higher-Rank Melting Canvas
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

      // Crystal 2D Triangular Lattice with Clustered Disclinations (Left: 90 to 290)
      const numPoints = 12;
      for (let p = 0; p < numPoints; p++) {
        const px = 110 + (p % 4) * 45;
        const py = cy - 60 + Math.floor(p / 4) * 45;

        // Disclination Defect Pair (Fracton Dipole = Dislocation)
        const isDisclination = (p === 5 || p === 6);
        ctx.fillStyle = isDisclination ? '#ec4899' : '#334155';
        ctx.shadowColor = isDisclination ? '#ec4899' : 'transparent';
        ctx.shadowBlur = isDisclination && isSimulatingBktMelt ? 22 : 4;
        ctx.beginPath();
        ctx.arc(px, py, isDisclination ? 7.5 : 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Lattice bonds
        if (p % 4 < 3) {
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, py); ctx.lineTo(px + 45, py);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DISCLINATION CLUMPING', 105, cy + 45);
      ctx.fillText('(BKT FRACTON MELTING)', 108, cy + 65);

      // Higher-Rank Melting Transition Kernel (Center at 380, cy - 10)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isSimulatingBktMelt ? 24 : 8;
      ctx.beginPath();
      ctx.arc(380, cy - 10, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('HEXATIC PHASE', 336, cy - 18);
      ctx.fillText('T_BKT = 280 K', 338, cy + 2);

      // Higher-Rank Liquid Crystal Output (Right at 530, cy - 10)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isSimulatingBktMelt ? 24 : 6;
      ctx.strokeRect(480, cy - 65, 170, 110);
      ctx.fillRect(480, cy - 65, 170, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('ANISOTROPIC HEXATIC FLUID', 488, cy - 40);
      ctx.fillText('DIPOLE MOBILITY UNBOUND', 492, cy - 15);
      ctx.fillText(`ORDER PARAMETER = ${(hexaticOrderParameterFidelity * 100).toFixed(2)}%`, 488, cy + 15);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DISCLINATION MELTING: T = ${latticeTemperatureKelvin} K | CORE ENERGY E_c = ${coreEnergyDisclinationEv} eV | HEXATIC FIDELITY = ${(hexaticOrderParameterFidelity * 100).toFixed(2)}% (RADZIHOVSKY)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [latticeTemperatureKelvin, coreEnergyDisclinationEv, hexaticOrderParameterFidelity, isSimulatingBktMelt]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Grid className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-sky-300 to-pink-400">
                DISCLINATION CLUMPING // FRACTON-BKT PHASE TRANSITION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                RADZIHOVSKY, PRETKO & BEEKMAN (CU BOULDER & LEIDEN)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Higher-rank thermal melting & disclination-dislocation BKT phase transition for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerDisclinationMelting}
            disabled={isSimulatingBktMelt}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSimulatingBktMelt ? 'SIMULATING MELTING...' : 'MELT INTO HEXATIC PHASE'}</span>
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
              <span className="text-amber-400 font-bold">TEMPERATURE: {latticeTemperatureKelvin} K</span>
              <span className="text-pink-400 font-bold">CORE ENERGY: {coreEnergyDisclinationEv} eV</span>
              <span className="text-emerald-400 font-bold">ORDER FIDELITY: {(hexaticOrderParameterFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: HIGHER-RANK DEFECT EQUILIBRIUM ACTIVE</div>
          </div>
        </div>

        {/* Clumping Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LATTICE TEMP (K)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Temperature:</span>
              <span className="text-amber-400 font-bold">{latticeTemperatureKelvin} K</span>
            </div>
            <input
              type="range"
              min={20}
              max={400}
              step={10}
              value={latticeTemperatureKelvin}
              onChange={(e) => setLatticeTemperatureKelvin(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Higher-Rank BKT Melting Transition:</strong> At critical temperature, immobile 0D fracton disclinations unbind into neutral dipole pairs, which glide freely as mobile 1D dislocations!</div>
            <div>• <strong>Anisotropic Hexatic Phase:</strong> The crystalline shear modulus vanishes while 6-fold orientational order persists, realizing an exotic fractonic liquid crystal!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
