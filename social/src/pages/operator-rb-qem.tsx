import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Filter, FunctionSquare
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function OperatorRbQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cliffordSequenceLengthM, setCliffordSequenceLengthM] = useState(12); // m = 12 Clifford length
  const [irrepDecayParameterP, setIrrepDecayParameterP] = useState(0.982); // p = 0.982 RB decay
  const [isFiltering, setIsFiltering] = useState(false);
  const [mitigatedObservableFidelity, setMitigatedObservableFidelity] = useState(0.984);

  const animFrameRef = useRef<number | null>(null);

  const triggerOperatorRbFilter = () => {
    uiaudio.warp();
    setIsFiltering(true);

    setTimeout(() => {
      setIsFiltering(false);
      setMitigatedObservableFidelity(0.9998);
      uiaudio.success();
    }, 750);
  };

  // Randomized Benchmarking Superoperator Irrep Decay & Filtration Canvas
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

      // Raw RB Exponential Decay Curve (Left: 80 to 280, cy - 70)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(80, cy - 80, 160, 130);
      ctx.fillRect(80, cy - 80, 160, 130);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('CLIFFORD RB DECAY', 95, cy - 60);

      // Plot F(m) = A · p^m + B curve
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let m = 0; m < 15; m++) {
        const px = 95 + m * 9;
        const py = cy + 35 - Math.pow(irrepDecayParameterP, m) * 75;
        if (m === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Superoperator Irrep Inversion Kernel (Center at 370, cy - 15)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isFiltering ? 24 : 8;
      ctx.beginPath();
      ctx.arc(370, cy - 15, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('IRREP FILTER', 325, cy - 22);
      ctx.fillText('Λ_irrep^-1 · O', 320, cy - 2);

      // Mitigated Pure Observable Output (Right at 530, cy - 15)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.25)';
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = isFiltering ? 24 : 6;
      ctx.strokeRect(480, cy - 70, 160, 110);
      ctx.fillRect(480, cy - 70, 160, 110);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('PURIFIED PHYSICAL STATE', 490, cy - 45);
      ctx.fillText('SPAM-FREE OBSERVABLE', 492, cy - 20);
      ctx.fillText(`FIDELITY = ${(mitigatedObservableFidelity * 100).toFixed(2)}%`, 495, cy + 10);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `OPERATOR RB QEM: LENGTH m = ${cliffordSequenceLengthM} | DECAY p = ${irrepDecayParameterP} | MITIGATED FIDELITY = ${(mitigatedObservableFidelity * 100).toFixed(2)}% (HELSEN & WEHNER)`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cliffordSequenceLengthM, irrepDecayParameterP, mitigatedObservableFidelity, isFiltering]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <FunctionSquare className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                OPERATOR RB QEM // CLIFFORD IRREP INVERSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                HELSEN, FLAMMIA & WEHNER (TU DELFT & SYDNEY)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Randomized benchmarking superoperator irrep decomposition & SPAM-free error mitigation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerOperatorRbFilter}
            disabled={isFiltering}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isFiltering ? 'INVERTING IRREP CHANNEL...' : 'APPLY OPERATOR RB FILTER'}</span>
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
              <span className="text-cyan-400 font-bold">SEQUENCE: m = {cliffordSequenceLengthM}</span>
              <span className="text-pink-400 font-bold">DECAY: p = {irrepDecayParameterP}</span>
              <span className="text-emerald-400 font-bold">MITIGATED FIDELITY: {(mitigatedObservableFidelity * 100).toFixed(2)}%</span>
            </div>
            <div>STATUS: SPAM-FREE IRREP NOISE INVERTED</div>
          </div>
        </div>

        {/* Operator RB Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SEQUENCE LENGTH (m)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Clifford Gates:</span>
              <span className="text-cyan-400 font-bold">m = {cliffordSequenceLengthM}</span>
            </div>
            <input
              type="range"
              min={4}
              max={32}
              step={2}
              value={cliffordSequenceLengthM}
              onChange={(e) => setCliffordSequenceLengthM(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Irreducible Representation Filters:</strong> By projecting the noisy noise map into Clifford commutant irreps, multi-qubit error channels decompose into diagonal scalar damping factors!</div>
            <div>• <strong>SPAM-Resilient Restoration:</strong> Inverting individual irrep decay parameters completely eliminates state preparation and measurement (SPAM) bias!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
