import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Waves, Snowflake
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function LaughlinFqhe() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fractionalFillingM, setFractionalFillingM] = useState(3); // m = 3 -> nu = 1/3 (Laughlin state)
  const [quasiparticleCharge, setQuasiparticleCharge] = useState('e / 3');
  const [braidingPhaseDeg, setBraidingPhaseDeg] = useState(60); // theta = pi / 3 = 60 degrees

  const animFrameRef = useRef<number | null>(null);
  const compositeFermionsRef = useRef<{ x: number; y: number; angle: number; r: number }[]>([]);

  // Laughlin FQHE Wavefunction & Fractional Statistical Phase Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Initialize Composite Fermions with Attached Magnetic Flux Quanta
    if (compositeFermionsRef.current.length === 0) {
      for (let i = 0; i < 16; i++) {
        compositeFermionsRef.current.push({
          x: 0,
          y: 0,
          angle: (i / 16) * Math.PI * 2,
          r: 50 + (i % 3) * 45,
        });
      }
    }

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fractional Hall Disk 2DEG Boundary
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 180, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Rotating Composite Fermions (Electron + 2 Flux Vortices)
      compositeFermionsRef.current.forEach((cf, idx) => {
        cf.angle += 0.015 * (4 - fractionalFillingM);
        const px = cx + Math.cos(cf.angle + time) * cf.r;
        const py = cy + Math.sin(cf.angle + time) * cf.r;

        // Electron core (Cyan)
        ctx.fillStyle = '#06b6d4';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Attached 2 Flux Vortices (Golden swirling orbital rings)
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 1.5;
        for (let f = 0; f < 2; f++) {
          const fx = px + Math.cos(time * 3 + f * Math.PI) * 12;
          const fy = py + Math.sin(time * 3 + f * Math.PI) * 12;

          ctx.beginPath();
          ctx.arc(fx, fy, 3, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Braiding Anyonic Trajectory Orbit (Central Exchange)
      const braidR = 65;
      const ax1 = cx + Math.cos(time * 1.5) * braidR;
      const ay1 = cy + Math.sin(time * 1.5) * braidR;
      const ax2 = cx - Math.cos(time * 1.5) * braidR;
      const ay2 = cy - Math.sin(time * 1.5) * braidR;

      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, braidR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Two Quasiparticles undergoing statistical exchange braiding
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(ax1, ay1, 8, 0, Math.PI * 2);
      ctx.arc(ax2, ay2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `LAUGHLIN STATE Ψ_${fractionalFillingM}: QUASIPARTICLE CHARGE e* = ${quasiparticleCharge} | BRAID PHASE θ = ${braidingPhaseDeg}°`,
        80,
        cy + 210
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [fractionalFillingM, quasiparticleCharge, braidingPhaseDeg]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                LAUGHLIN FQHE // FRACTIONAL ANYONS & FLUX ATTACHMENT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                ν = 1/3 (NOBEL PRIZE 1998)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Jain composite fermions & fractional statistical braiding phases for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">QUASIPARTICLE CHARGE</div>
            <div className="text-xl font-bold text-cyan-400">{quasiparticleCharge}</div>
          </div>
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
              <span className="text-cyan-400 font-bold">STATE: ν = 1/{fractionalFillingM}</span>
              <span className="text-pink-400 font-bold">BRAID: θ = π/{fractionalFillingM}</span>
            </div>
            <div>STATUS: NON-ABELIAN / ABELIAN FRACTIONAL STATISTICS DEMONSTRATED</div>
          </div>
        </div>

        {/* FQHE Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            LAUGHLIN EXPONENTS
          </h3>

          <div className="space-y-2">
            {[
              { m: 3, label: 'ν = 1/3 (Laughlin 1983)', charge: 'e / 3', theta: 60 },
              { m: 5, label: 'ν = 1/5 (Laughlin State)', charge: 'e / 5', theta: 36 },
              { m: 7, label: 'ν = 1/7 (Dilute FQHE)', charge: 'e / 7', theta: 25.7 },
            ].map((state) => (
              <button
                key={state.m}
                onClick={() => {
                  setFractionalFillingM(state.m);
                  setQuasiparticleCharge(state.charge);
                  setBraidingPhaseDeg(state.theta);
                  uiaudio.click();
                }}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  fractionalFillingM === state.m ? "bg-cyan-500/20 border-cyan-400 text-cyan-200" : "bg-zinc-950 border-white/5 text-zinc-400"
                )}
              >
                <div className="font-bold">{state.label}</div>
                <div className="text-[10px] text-zinc-400">Charge: {state.charge} | Phase: {state.theta}°</div>
              </button>
            ))}
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Fractional Charge:</strong> Quasiparticle excitations in the ν = 1/3 state carry precisely one-third of the elementary electron charge e, verified via shot noise!</div>
            <div>• <strong>Anyonic Statistics:</strong> Exchanging two quasiparticles produces a fractional phase θ = π/3, proving they are neither bosons (0) nor fermions (π)!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
