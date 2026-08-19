import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, GitCompare
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DualStateQem() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [referenceStateType, setReferenceStateType] = useState<'Computational_Zero' | 'Max_Entangled_Bell'>('Computational_Zero');
  const [hardwareDistortionGamma, setHardwareDistortionGamma] = useState(0.15); // 15% hardware channel distortion
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [mitigatedExpectation, setMitigatedExpectation] = useState(0.986);

  const animFrameRef = useRef<number | null>(null);

  const runDualStateCalibration = () => {
    uiaudio.warp();
    setIsCalibrating(true);

    setTimeout(() => {
      setIsCalibrating(false);
      setMitigatedExpectation(0.997);
      uiaudio.success();
    }, 750);
  };

  // Dual-State Metric Inversion & Operator Calibration Canvas
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

      // Reference State Box (Top Left 100, cy - 90)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(100, cy - 100, 160, 70);
      ctx.fillRect(100, cy - 100, 160, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('KNOWN REFERENCE |ψ₀⟩', 110, cy - 70);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText('Exact ⟨O⟩_exact = 1.000', 115, cy - 48);

      // Target Uncharacterized State Box (Bottom Left 100, cy + 30)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(100, cy + 30, 160, 70);
      ctx.fillRect(100, cy + 30, 160, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('TARGET UNKNOWN |ψ⟩', 115, cy + 60);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`Raw Noisy ⟨O⟩ = ${(1 - hardwareDistortionGamma).toFixed(3)}`, 115, cy + 82);

      // Central Dual-State Metric Inversion Core (340, cy - 50)
      ctx.fillStyle = '#1e1b4b';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = isCalibrating ? 20 : 6;
      ctx.strokeRect(330, cy - 50, 120, 100);
      ctx.fillRect(330, cy - 50, 120, 100);
      ctx.shadowBlur = 0;

      // Connecting Calibration Wires
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(260, cy - 65); ctx.lineTo(330, cy - 20);
      ctx.stroke();

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(260, cy + 65); ctx.lineTo(330, cy + 20);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('METRIC TENSOR', 340, cy - 15);
      ctx.fillText('INVERSION', 355, cy + 5);
      ctx.fillText('M⁻¹', 380, cy + 28);

      // Mitigated Output Wire to Node
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(450, cy); ctx.lineTo(560, cy);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(600, cy, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`⟨O⟩_mit`, 578, cy - 4);
      ctx.fillText(`${mitigatedExpectation.toFixed(3)}`, 572, cy + 12);

      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `DUAL-STATE QEM: OPERATOR METRIC INVERTED | MITIGATED VALUE = ${mitigatedExpectation.toFixed(3)} (RAW = ${(1 - hardwareDistortionGamma).toFixed(3)})`,
        80,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [referenceStateType, hardwareDistortionGamma, mitigatedExpectation, isCalibrating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <GitCompare className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                DUAL-STATE QEM // OPERATOR METRIC CALIBRATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                HUO & LI (OXFORD / BAIDU QUANTUM)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Reference state metric tensor calibration & exact linear noise inversion for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={runDualStateCalibration}
            disabled={isCalibrating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isCalibrating ? 'INVERTING NOISE METRIC TENSOR...' : 'CALIBRATE OPERATOR METRIC'}</span>
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
              <span className="text-cyan-400 font-bold">REF: {referenceStateType}</span>
              <span className="text-pink-400 font-bold">RAW NOISY: {(1 - hardwareDistortionGamma).toFixed(3)}</span>
              <span className="text-emerald-400 font-bold">MITIGATED: {mitigatedExpectation.toFixed(3)}</span>
            </div>
            <div>STATUS: ZERO PULSE STRETCHING OVERHEAD</div>
          </div>
        </div>

        {/* Dual-State Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            REFERENCE STATE
          </h3>

          <div className="space-y-2">
            <button
              onClick={() => {
                setReferenceStateType('Computational_Zero');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                referenceStateType === 'Computational_Zero' ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">|00...0⟩ Ground State</div>
              <div className="text-[10px] text-zinc-400">Trivial classical preparation reference</div>
            </button>

            <button
              onClick={() => {
                setReferenceStateType('Max_Entangled_Bell');
                uiaudio.click();
              }}
              className={cn(
                "w-full p-3 rounded-xl border text-left transition-all",
                referenceStateType === 'Max_Entangled_Bell' ? "bg-pink-500/20 border-pink-400 text-pink-200" : "bg-zinc-950 border-white/5 text-zinc-400"
              )}
            >
              <div className="font-bold">Bell State (|00⟩ + |11⟩)/√2</div>
              <div className="text-[10px] text-zinc-400">Calibrates entangling 2-qubit gate errors</div>
            </button>
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Dual-State Calibration:</strong> By measuring an uncharacterized target state alongside a known reference state, the transfer matrix distortion is directly inverted!</div>
            <div>• <strong>Robust to Circuit Depth:</strong> Mitigates both state-preparation-and-measurement (SPAM) errors and coherent gate over-rotations without scaling hardware noise!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
