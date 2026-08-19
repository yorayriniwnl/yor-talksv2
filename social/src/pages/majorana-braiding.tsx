import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, GitMerge
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MajoranaBraiding() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [topologicalPhase, setTopologicalPhase] = useState(true);
  const [magneticFieldTesla, setMagneticFieldTesla] = useState(0.85); // B > B_critical (0.6 T)
  const [braidStep, setBraidStep] = useState(0);
  const [isBraiding, setIsBraiding] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerBraiding = () => {
    uiaudio.warp();
    setIsBraiding(true);
    setBraidStep(1);

    setTimeout(() => {
      setBraidStep(2);
      uiaudio.click();
    }, 600);

    setTimeout(() => {
      setBraidStep(3);
      uiaudio.click();
    }, 1200);

    setTimeout(() => {
      setBraidStep(4);
      setIsBraiding(false);
      uiaudio.success();
    }, 1800);
  };

  const handleReset = () => {
    uiaudio.click();
    setBraidStep(0);
    setIsBraiding(false);
  };

  // 1D Nanowire T-Junction & Majorana Zero Mode (MZM) Braiding Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Superconducting-Semiconductor Nanowire T-Junction (InAs/Al)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      // Horizontal segment
      ctx.beginPath();
      ctx.moveTo(cx - 180, cy); ctx.lineTo(cx + 180, cy);
      ctx.stroke();
      // Vertical segment
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 140);
      ctx.stroke();

      // Active Topological Superconductor Core (Cyan glow)
      ctx.strokeStyle = topologicalPhase ? '#06b6d4' : '#64748b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 180, cy); ctx.lineTo(cx + 180, cy);
      ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 140);
      ctx.stroke();

      // Compute Majorana Positions during Adiabatic T-Junction Braiding
      // gamma_1 (Left), gamma_2 (Right), gamma_3 (Top)
      let m1 = { x: cx - 180, y: cy };
      let m2 = { x: cx + 180, y: cy };
      let m3 = { x: cx, y: cy - 140 };

      if (braidStep === 1) {
        // gamma_1 moves to center/top
        m1 = { x: cx, y: cy - 140 };
        m3 = { x: cx, y: cy };
      } else if (braidStep === 2) {
        // gamma_2 moves to left
        m1 = { x: cx, y: cy - 140 };
        m2 = { x: cx - 180, y: cy };
      } else if (braidStep === 3) {
        // gamma_1 moves to right (Braiding complete: gamma_1 and gamma_2 swapped!)
        m1 = { x: cx + 180, y: cy };
        m2 = { x: cx - 180, y: cy };
      }

      // Draw Majorana Zero Modes (Non-Abelian Bound States in Golden/Magenta)
      const majoranas = [
        { ...m1, label: 'γ₁', color: '#f59e0b' },
        { ...m2, label: 'γ₂', color: '#ec4899' },
        { ...m3, label: 'γ₃', color: '#38bdf8' },
      ];

      majoranas.forEach((m) => {
        ctx.fillStyle = m.color;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(m.label, m.x - 7, m.y - 14);
      });

      // Quantum Qubit State readout (Topologically Protected against Local Noise)
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (braidStep >= 3) {
        ctx.fillText('NON-ABELIAN BRAID COMPLETE: TOPOLOGICAL PHASE GATE U = exp(i(π/4)γ₁γ₂)', 100, cy + 120);
      } else {
        ctx.fillText('TOPOLOGICAL QUBIT INITIALIZED: NON-LOCAL DEGREES OF FREEDOM', 130, cy + 120);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [topologicalPhase, braidStep]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-pink-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <GitMerge className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-pink-300 to-cyan-400">
                MAJORANA ZERO MODES // NON-ABELIAN ANYON BRAIDING
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                TOPOLOGICAL QUANTUM COMPUTATION (KITAEV)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              1D InAs/Al nanowire T-junction & topologically fault-tolerant quantum gates for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerBraiding}
            disabled={isBraiding}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-pink-600 text-black font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isBraiding ? 'BRAIDING ANYONS THROUGH T-JUNCTION...' : 'EXECUTE NON-ABELIAN BRAID (γ₁ ↔ γ₂)'}</span>
          </button>

          {braidStep > 0 && (
            <button
              onClick={handleReset}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
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
              <span className="text-amber-400 font-bold">ZEEMAN FIELD: {magneticFieldTesla} Tesla</span>
              <span className="text-pink-400 font-bold">BRAID STEP: {braidStep} / 4</span>
            </div>
            <div>STATUS: {braidStep >= 3 ? 'NON-ABELIAN UNITARY ROTATION EXECUTED' : 'TOPOLOGICAL SUPERCONDUCTING PHASE'}</div>
          </div>
        </div>

        {/* Topological Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              MAGNETIC FIELD
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Zeeman Field (B):</span>
              <span className="text-amber-400 font-bold">{magneticFieldTesla} T</span>
            </div>
            <input
              type="range"
              min={0.4}
              max={1.5}
              step={0.05}
              value={magneticFieldTesla}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMagneticFieldTesla(val);
                setTopologicalPhase(val >= 0.6);
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Majorana Zero Modes (MZMs):</strong> Emergent non-Abelian quasiparticles that are their own antiparticles (γ = γ†), localized strictly at the ends of topological superconductor wires!</div>
            <div>• <strong>Hardware Fault-Tolerance:</strong> Quantum information is stored non-locally across paired Majoranas. Local environmental noise cannot cause decoherence without simultaneously perturbing both distant wire ends!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
