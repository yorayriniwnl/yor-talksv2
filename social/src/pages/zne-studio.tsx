import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, TrendingDown
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ZneStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [extrapolationMethod, setExtrapolationMethod] = useState<'Richardson' | 'Polynomial' | 'Exponential'>('Richardson');
  const [scaleFactors, setScaleFactors] = useState([1.0, 2.0, 3.0, 5.0]);
  const [isMitigating, setIsMitigating] = useState(false);
  const [mitigatedValue, setMitigatedValue] = useState(0.985); // True ideal noiseless expectation value

  const animFrameRef = useRef<number | null>(null);

  const triggerZneMitigation = () => {
    uiaudio.warp();
    setIsMitigating(true);

    setTimeout(() => {
      setIsMitigating(false);
      setMitigatedValue(0.992);
      uiaudio.success();
    }, 700);
  };

  // Zero-Noise Extrapolation (ZNE) Curve Fitting Canvas
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

      // Dark NISQ Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Coordinate Grid: X = Noise Scale Factor λ (0 to 6), Y = Expectation Value <O> (0 to 1.2)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Y-axis (λ = 0 Zero-Noise Target Line)
      ctx.moveTo(120, 60); ctx.lineTo(120, 380);
      // X-axis
      ctx.moveTo(120, 380); ctx.lineTo(canvas.width - 60, 380);
      ctx.stroke();

      // Zero-Noise Target Vertical Line (Golden Dashed Line at λ = 0)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(120, 60); ctx.lineTo(120, 380);
      ctx.stroke();
      ctx.setLineDash([]);

      // Data Points at Noise Factors λ = 1, 2, 3, 5 (Simulated noisy measurements)
      const points = [
        { lambda: 1.0, val: 0.84 },
        { lambda: 2.0, val: 0.71 },
        { lambda: 3.0, val: 0.60 },
        { lambda: 5.0, val: 0.43 },
      ];

      // Draw Extrapolated Fit Curve back to λ = 0
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = isMitigating ? 15 : 4;
      ctx.beginPath();
      for (let l = 0; l <= 6; l += 0.1) {
        const x = 120 + l * 85;
        // Extrapolated model: E(lambda) = E0 * exp(-gamma * lambda)
        const expVal = mitigatedValue * Math.exp(-0.16 * l);
        const y = 380 - (expVal / 1.1) * 300;

        if (l === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Measured Noise Points (Cyan & Magenta Dots)
      points.forEach((pt) => {
        const px = 120 + pt.lambda * 85;
        const py = 380 - (pt.val / 1.1) * 300;

        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Highlight Zero-Noise Extrapolated Intercept Point (λ = 0, E0)
      const e0X = 120;
      const e0Y = 380 - (mitigatedValue / 1.1) * 300;

      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(e0X, e0Y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ZNE EXTTRAPOLATED NOISELESS VALUE ⟨O⟩_0 = ${mitigatedValue.toFixed(3)} (IDEAL = 1.000)`,
        100,
        cy + 170
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [extrapolationMethod, mitigatedValue, isMitigating]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <TrendingDown className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                ZERO-NOISE EXTRAPOLATION // NISQ QUANTUM ERROR MITIGATION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                TEMME & GAMBETTA (MITIQ)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Unitary pulse stretching & Richardson polynomial extrapolation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerZneMitigation}
            disabled={isMitigating}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isMitigating ? 'EXTRAPOLATING TO ZERO NOISE LIMIT...' : 'EXECUTE ZNE ERROR MITIGATION'}</span>
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
              <span className="text-cyan-400 font-bold">FIT: {extrapolationMethod}</span>
              <span className="text-pink-400 font-bold">RAW ⟨O⟩_1 = 0.840</span>
              <span className="text-emerald-400 font-bold">MITIGATED ⟨O⟩_0 = {mitigatedValue.toFixed(3)}</span>
            </div>
            <div>STATUS: NOISELESS ESTIMATE RECOVERED WITHOUT PHYSICAL QEC</div>
          </div>
        </div>

        {/* ZNE Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            EXTRAPOLATION MODEL
          </h3>

          <div className="space-y-2">
            {[
              { id: 'Richardson', name: 'Richardson Multi-Factor Fit', desc: 'Linear combination cancelling higher order noise terms' },
              { id: 'Polynomial', name: 'Quadratic Polynomial Fit', desc: 'Polynomial series expansion O(lambda^2)' },
              { id: 'Exponential', name: 'Exponential Decay Fit', desc: 'Models Lindbladian depolarizing noise channel' },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  setExtrapolationMethod(method.id as any);
                  uiaudio.click();
                }}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  extrapolationMethod === method.id ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">{method.name}</div>
                <div className="text-[10px] text-zinc-400">{method.desc}</div>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Unitary Folding:</strong> Noise is deliberately amplified by replacing gates U with U U† U, maintaining circuit unitarity while scaling physical error rates by integer factors!</div>
            <div>• <strong>No Hardware Overhead:</strong> Recovers noiseless quantum expectation values on near-term NISQ hardware without requiring millions of physical ancilla qubits!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
