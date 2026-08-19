import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, CheckCircle2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SymmetryVerification() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [symmetryType, setSymmetryType] = useState<'Parity_Pz' | 'ParticleNumber_N'>('Parity_Pz');
  const [incoherentNoiseRate, setIncoherentNoiseRate] = useState(0.08); // 8% physical bit/phase flip noise
  const [isVerifying, setIsVerifying] = useState(false);
  const [mitigatedStateFidelity, setMitigatedStateFidelity] = useState(0.985);
  const [discardRatePercent, setDiscardRatePercent] = useState(14.5);

  const animFrameRef = useRef<number | null>(null);

  const triggerSymmetryProjection = () => {
    uiaudio.warp();
    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      setMitigatedStateFidelity(0.995);
      setDiscardRatePercent(+(incoherentNoiseRate * 180).toFixed(1));
      uiaudio.success();
    }, 700);
  };

  // Symmetry Verification & Parity Post-Selection Projector Canvas
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

      // Raw Noisy State Flow (Left 80 to 240)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, cy); ctx.lineTo(240, cy);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('RAW NOISY STATE ρ', 90, cy - 15);

      // Symmetry Projection Sifter Block (240 to 360)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = isVerifying ? 20 : 6;
      ctx.strokeRect(240, cy - 50, 120, 100);
      ctx.fillRect(240, cy - 50, 120, 100);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('PROJECTOR', 260, cy - 15);
      ctx.fillText(symmetryType === 'Parity_Pz' ? 'P = (I + ∏Z)/2' : 'Π_N = ∑|N⟩⟨N|', 250, cy + 12);

      // Accepted Symmetrical Branch (Right: Green Line to 540)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(360, cy - 20); ctx.lineTo(540, cy - 20);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.fillText(`ACCEPTED (+1 SYMMETRY)`, 380, cy - 35);
      ctx.fillText(`Fidelity: ${(mitigatedStateFidelity * 100).toFixed(1)}%`, 380, cy - 5);

      // Discarded Asymmetrical Error Branch (Bottom Right: Red Dotted Line to 540)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(360, cy + 25); ctx.lineTo(540, cy + 70);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.fillText(`POST-SELECTED DISCARD (-1)`, 380, cy + 90);
      ctx.fillText(`Rate: ${discardRatePercent}%`, 380, cy + 105);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `SYMMETRY VERIFICATION: POST-SELECTED FIDELITY = ${(mitigatedStateFidelity * 100).toFixed(1)}% (RAW = ${((1 - incoherentNoiseRate) * 100).toFixed(1)}%)`,
        80,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [symmetryType, incoherentNoiseRate, mitigatedStateFidelity, discardRatePercent, isVerifying]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <CheckCircle2 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                SYMMETRY VERIFICATION // POST-SELECTION ERROR MITIGATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                BONET-MONROIG & O'BRIEN (QUTECH)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Projective symmetry filtering & non-destructive parity post-selection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerSymmetryProjection}
            disabled={isVerifying}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isVerifying ? 'PROJECTING SYMMETRY SECTOR...' : 'PROJECT & FILTER SYMMETRY'}</span>
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
              <span className="text-cyan-400 font-bold">SYMMETRY: {symmetryType}</span>
              <span className="text-pink-400 font-bold">DISCARDED: {discardRatePercent}%</span>
              <span className="text-emerald-400 font-bold">PURIFIED FIDELITY: {(mitigatedStateFidelity * 100).toFixed(1)}%</span>
            </div>
            <div>STATUS: SYMMETRY VIOLATING SHOTS FILTERED</div>
          </div>
        </div>

        {/* Symmetry Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            SYMMETRY GENERATOR
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setSymmetryType('Parity_Pz');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                symmetryType === 'Parity_Pz' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Total Spin Parity (P_z = ∏Z)</div>
              <div className="text-[10px] text-zinc-400">Filters single bit-flip X/Y errors</div>
            </button>

            <button
              onClick={() => {
                setSymmetryType('ParticleNumber_N');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                symmetryType === 'ParticleNumber_N' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Particle Number Conservation (N)</div>
              <div className="text-[10px] text-zinc-400">Filters excitation loss/gain in VQE chemistry</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Zero Additional Qubits:</strong> Symmetry projections can be evaluated either ancilla-free via classical measurement post-selection or non-destructively with a single ancilla!</div>
            <div>• <strong>Physical Invariant Filtering:</strong> Unphysical noise processes that transition quantum states outside known invariant subspaces are eliminated with 100% confidence!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
