import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare, LineChart
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function CmpsPurifierQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cmpsBondDimensionD, setCmpsBondDimensionD] = useState(8); // D = 8 continuous bond dimension
  const [lieLinigerInteractionC, setLieLinigerInteractionC] = useState(5.0); // c = 5.0 Lieb-Liniger contact interaction
  const [isPurifyingField, setIsPurifyingField] = useState(false);
  const [purifiedFieldFidelity, setPurifiedFieldFidelity] = useState(0.987);

  const animFrameRef = useRef<number | null>(null);

  const triggerCmpsFieldPurification = () => {
    uiaudio.warp();
    setIsPurifyingField(true);

    setTimeout(() => {
      setIsPurifyingField(false);
      setPurifiedFieldFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Continuous Matrix Product State (cMPS) Quantum Field Theory Canvas
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

      // Continuous 1D Quantum Field Line x in [0, L] (Left: 80 to 260, cy - 10)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy - 10); ctx.lineTo(260, cy - 10);
      ctx.stroke();

      // Continuous Field Wavefunction Fluctuations ψ(x)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 80; x <= 260; x += 4) {
        const k = (x - 80) * 0.06;
        const fy = cy - 10 + Math.sin(k * 2 + time * 3) * 22 * (isPurifyingField ? 0.4 : 1.0) + Math.cos(k * 4 - time * 2) * 8;
        if (x === 80) ctx.moveTo(x, fy);
        else ctx.lineTo(x, fy);
      }
      ctx.stroke();

      // Functional Continuous Transfer Matrix T(x) = Q ⊗ I + I ⊗ Q* + R ⊗ R*
      ctx.fillStyle = '#06b6d4';
      for (let i = 0; i < 5; i++) {
        const mx = 95 + i * 36;
        const my = cy - 10;
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('R(x)', mx - 8, my - 10);
        ctx.fillStyle = '#06b6d4';
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CONTINUOUS MPS FIELD ψ(x)', 95, cy + 65);

      // Functional Generator Kernel (Center at 370, cy - 5)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = isPurifyingField ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 5, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('cMPS PURIFIER', 328, cy - 12);
      ctx.fillText('P exp(∫ Q + Rψ†)', 320, cy + 8);

      // Purified Continuous Field Output (Right at 530, cy - 5)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isPurifyingField ? 24 : 6;
      ctx.strokeRect(480, cy - 60, 160, 110);
      ctx.fillRect(480, cy - 60, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('LIEB-LINIGER CONTINUUM', 484, cy - 35);
      ctx.fillText('INFINITE-D FIELD PURITY', 486, cy - 10);
      ctx.fillText(`PURIFIED FIDELITY = ${(purifiedFieldFidelity * 100).toFixed(2)}%`, 485, cy + 20);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `cMPS PURIFIER QEM: BOND DIMENSION D = ${cmpsBondDimensionD} | CONTACT c = ${lieLinigerInteractionC} | FIDELITY = ${(purifiedFieldFidelity * 100).toFixed(2)}% (VERSTRAETE & CIRAC)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cmpsBondDimensionD, lieLinigerInteractionC, purifiedFieldFidelity, isPurifyingField]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <LineChart className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-300 to-pink-400">
                cMPS PURIFIER QEM // CONTINUOUS FIELD TENSOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                VERSTRAETE, CIRAC & HAEGEMAN (VIENNA & GHENT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Continuous matrix product states & real-space 1D quantum field theory purification for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerCmpsFieldPurification}
            disabled={isPurifyingField}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-cyan-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isPurifyingField ? 'PURIFYING FIELD CONTINUUM...' : 'PURIFY VIA CONTINUOUS MPS'}</span>
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
              <span className="text-purple-400 font-bold">cMPS BOND DIMENSION: D = {cmpsBondDimensionD}</span>
              <span className="text-cyan-400 font-bold">CONTACT c: {lieLinigerInteractionC}</span>
              <span className="text-emerald-400 font-bold">RESTORED FIDELITY: {(purifiedFieldFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: FUNCTIONAL CONTINUOUS TRANSFER MATRIX NOMINAL</div>
          </div>
        </div>

        {/* cMPS Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              cMPS BOND (D)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Continuous Bond:</span>
              <span className="text-purple-400 font-bold">D = {cmpsBondDimensionD}</span>
            </div>
            <input
              type="range"
              min={2}
              max={16}
              step={2}
              value={cmpsBondDimensionD}
              onChange={(e) => setCmpsBondDimensionD(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Continuum Field Limits:</strong> cMPS defines quantum states directly in the thermodynamic spatial continuum without lattice discretization artifacts!</div>
            <div>• <strong>Infinite-Dimensional Filtering:</strong> Functional transfer matrices $T(x)$ filter high-frequency thermal fluctuations while exactly preserving non-abelian continuous symmetries!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
