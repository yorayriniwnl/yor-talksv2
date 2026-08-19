import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Eye, Snowflake
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function QuantumZeno() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [measurementFreqKhz, setMeasurementFreqKhz] = useState(50); // 50 kHz projective probe rate
  const [survivalProbability, setSurvivalProbability] = useState(0.98);
  const [isZenoFrozen, setIsZenoFrozen] = useState(true);

  const animFrameRef = useRef<number | null>(null);

  const toggleZenoEffect = () => {
    uiaudio.warp();
    setIsZenoFrozen(prev => !prev);
  };

  // Quantum Zeno Effect (Turing Paradox) Survival Probability Canvas
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

      // Energy Well & Barrier: Left Well |0> (Initial State), Right Well |1> (Decayed State)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      // Double quantum well potential V(x)
      ctx.moveTo(80, 120);
      ctx.quadraticCurveTo(cx - 100, 360, cx - 100, 360);
      ctx.quadraticCurveTo(cx, 160, cx, 160);
      ctx.quadraticCurveTo(cx + 100, 360, cx + 100, 360);
      ctx.quadraticCurveTo(canvas.width - 80, 120, canvas.width - 80, 120);
      ctx.stroke();

      // Wavefunction Particle: If Zeno Frozen -> Pinned in Left Well |0>. If Unobserved -> Tunnels to Right |1>
      let waveX = cx - 100;
      let waveY = 320;

      if (!isZenoFrozen) {
        // Coherent Rabi Tunneling Oscillation between wells
        const osc = Math.sin(time * 2);
        waveX = cx + osc * 100;
        waveY = 320 - Math.abs(osc) * 80;
      } else {
        // High-frequency measurement pulses (Golden probe beams)
        for (let i = 0; i < 6; i++) {
          const px = (cx - 100) + (Math.random() - 0.5) * 30;
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px, 60); ctx.lineTo(px, 320);
          ctx.stroke();
        }
      }

      // Draw Quantum Wavepacket |psi(t)>
      ctx.fillStyle = isZenoFrozen ? '#06b6d4' : '#ec4899';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(waveX, waveY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      if (isZenoFrozen) {
        ctx.fillText('QUANTUM ZENO EFFECT: CONTINUOUS PROJECTION FREEZES STATE IN |0⟩ (P = 98.4%)', 100, cy + 130);
      } else {
        ctx.fillText('FREE UNPERTURBED EVOLUTION: COHERENT RABI TUNNELING TO |1⟩', 140, cy + 130);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isZenoFrozen, measurementFreqKhz]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Eye className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                QUANTUM ZENO EFFECT // DYNAMICAL TUNNELING SUPPRESSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                MISRA-SUDARSHAN TURING PARADOX
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Projective measurement wavefunction collapse & decay suppression for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleZenoEffect}
            className={cn(
              "px-6 py-3 rounded-xl font-bold shadow-lg flex items-center space-x-2 transition-all",
              isZenoFrozen ? "bg-cyan-600 text-white shadow-cyan-500/30" : "bg-gradient-to-r from-pink-500 to-rose-600 text-white"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>{isZenoFrozen ? 'ZENO FREEZE ACTIVE (STATE PINNED IN |0⟩)' : 'RELEASE PROBES (ALLOW TUNNELING)'}</span>
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
              <span className="text-cyan-400 font-bold">PROBE RATE: {measurementFreqKhz} kHz</span>
              <span className="text-pink-400 font-bold">SURVIVAL: {isZenoFrozen ? '98.4%' : '50.0%'}</span>
            </div>
            <div>STATUS: {isZenoFrozen ? 'PROJECTION INHIBITS DECAY (A WATCHED POT NEVER BOILS)' : 'FREE HAMILTONIAN DRIFT'}</div>
          </div>
        </div>

        {/* Zeno Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PROBE FREQUENCY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Sampling Rate:</span>
              <span className="text-cyan-400 font-bold">{measurementFreqKhz} kHz</span>
            </div>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={measurementFreqKhz}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMeasurementFreqKhz(val);
                setIsZenoFrozen(val >= 30);
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>A Watched Quantum Pot:</strong> For short times, decay probability grows quadratically as t². Making N frequent measurements resets the clock, suppressing total decay as 1/N!</div>
            <div>• <strong>Anti-Zeno Effect:</strong> If the environmental coupling spectrum is broad, ultra-frequent measurements can alternatively accelerate decay rates!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
