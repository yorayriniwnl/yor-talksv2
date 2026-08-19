import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Zap, Play, RotateCcw, Sparkles, 
  Activity, Sliders, ShieldCheck, CheckCircle2, Award, Compass, Layers
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function QuantumSteering() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [wernerParameterP, setWernerParameterP] = useState(0.75); // p = 0.75 (Steerable Werner state: p > 1/2)
  const [aliceMeasurementAngleDeg, setAliceMeasurementAngleDeg] = useState(45);
  const [isSteering, setIsSteering] = useState(false);

  const animFrameRef = useRef<number | null>(null);

  const triggerEprSteering = () => {
    uiaudio.warp();
    setIsSteering(true);

    setTimeout(() => {
      setIsSteering(false);
      uiaudio.success();
    }, 750);
  };

  // Jevtic-Pusey-Rudolph-Barrett (JPRB) Quantum Steering Ellipsoid Canvas
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

      // Dark Quantum Foundation Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Bloch Sphere Perimeter for Bob (Radius 120)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 120, 0, Math.PI * 2);
      ctx.stroke();

      // Bloch Coordinate Axes (X and Z)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(cx - 130, cy); ctx.lineTo(cx + 130, cy);
      ctx.moveTo(cx, cy - 130); ctx.lineTo(cx, cy + 130);
      ctx.stroke();

      // Bob's Quantum Steering Ellipsoid E_B inside the Bloch sphere (Cyan/Magenta)
      // Radius scaled by Werner parameter p: r_x = r_y = r_z = p
      const ellR = 120 * wernerParameterP;

      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isSteering ? 20 : 8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, ellR, ellR * 0.75, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Alice Steers Bob's State Vector via Measurement at angle theta
      const rad = (aliceMeasurementAngleDeg * Math.PI) / 180;
      const steerX = cx + Math.cos(rad) * ellR;
      const steerY = cy - Math.sin(rad) * (ellR * 0.75);

      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(steerX, steerY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(steerX, steerY);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (wernerParameterP > 0.5) {
        ctx.fillText(`EPR STEERING VERIFIED: ALICE REMOTELY PREPARES BOB'S STATE (p = ${wernerParameterP})`, 100, cy + 150);
      } else {
        ctx.fillText('UNSTEERABLE STATE: LOCAL HIDDEN STATE (LHS) MODEL APPLIES (p ≤ 0.5)', 100, cy + 150);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [wernerParameterP, aliceMeasurementAngleDeg, isSteering]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Compass className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                EPR QUANTUM STEERING // JPRB STEERING ELLIPSOIDS
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SCHRÖDINGER (1935) & WISEMAN (2007)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Remote state preparation & one-way asymmetric quantum steering for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerEprSteering}
            disabled={isSteering}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isSteering ? 'STEERING BOB’S BLOCH VECTOR...' : 'STEER REMOTE QUANTUM STATE'}</span>
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
              <span className="text-cyan-400 font-bold">WERNER p: {wernerParameterP}</span>
              <span className="text-pink-400 font-bold">ALICE ANGLE: {aliceMeasurementAngleDeg}°</span>
            </div>
            <div>STATUS: {wernerParameterP > 0.5 ? 'GENUINE EPR STEERABILITY DEMONSTRATED' : 'LOCAL HIDDEN STATE'}</div>
          </div>
        </div>

        {/* Steering Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              ENTANGLEMENT FRACTION
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Werner Parameter (p):</span>
              <span className="text-cyan-400 font-bold">{wernerParameterP}</span>
            </div>
            <input
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={wernerParameterP}
              onChange={(e) => setWernerParameterP(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Alice Angle:</span>
              <span className="text-pink-400 font-bold">{aliceMeasurementAngleDeg}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={aliceMeasurementAngleDeg}
              onChange={(e) => setAliceMeasurementAngleDeg(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hierarchy of Non-Locality:</strong> Bell Non-locality ⊂ EPR Steering ⊂ Quantum Entanglement. Steering is the intermediate form of non-classicality!</div>
            <div>• <strong>One-Way Steering:</strong> Certain asymmetric quantum states allow Alice to steer Bob's state, while Bob is completely incapable of steering Alice!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
