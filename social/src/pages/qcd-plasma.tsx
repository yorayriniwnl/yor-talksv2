import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, Radio, ShieldCheck, Flame, Sun
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function QcdPlasma() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [plasmaTempMev, setPlasmaTempMev] = useState(220); // 220 MeV (2.5 Trillion Kelvin QGP)
  const [strongCouplingAlphaS, setStrongCouplingAlphaS] = useState(0.18); // Asymptotic freedom alpha_s
  const [isDeconfined, setIsDeconfined] = useState(true);

  const animFrameRef = useRef<number | null>(null);
  const quarksRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; flavor: string }[]>([]);

  const toggleConfinement = () => {
    uiaudio.warp();
    setIsDeconfined(prev => !prev);
  };

  // Quark-Gluon Plasma (QGP) & SU(3) Color Confinement Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    // Initialize Quarks (Red, Green, Blue SU(3) color charges)
    if (quarksRef.current.length === 0) {
      const colors = ['#ef4444', '#22c55e', '#3b82f6'];
      const flavors = ['u', 'd', 's', 'c', 'g'];
      for (let i = 0; i < 36; i++) {
        quarksRef.current.push({
          x: Math.random() * (canvas.width - 120) + 60,
          y: Math.random() * (canvas.height - 120) + 60,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          color: colors[i % 3],
          flavor: flavors[i % 5],
        });
      }
    }

    const render = () => {
      time += 0.06;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Quantum Vacuum Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Heavy Ion Collision Fireball (Trillion-Kelvin Thermal Glow in Orange/Magenta)
      const fireGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 200);
      fireGrad.addColorStop(0, isDeconfined ? 'rgba(236, 72, 153, 0.25)' : 'rgba(30, 41, 59, 0.2)');
      fireGrad.addColorStop(0.6, isDeconfined ? 'rgba(245, 158, 11, 0.15)' : 'rgba(15, 23, 42, 0.1)');
      fireGrad.addColorStop(1, 'rgba(1, 3, 9, 0)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 200, 0, Math.PI * 2);
      ctx.fill();

      // Relativistic Collision Chamber Perimeter (Cyan / Slate Border)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 40, canvas.width - 100, canvas.height - 80);

      // Update & Draw Free Quarks & Gluons (Deconfined State) or Hadrons (Confinement)
      quarksRef.current.forEach((q, idx) => {
        if (isDeconfined) {
          // Free Asymptotically Free Quark Motion
          q.x += q.vx;
          q.y += q.vy;

          if (q.x < 70 || q.x > canvas.width - 70) q.vx *= -1;
          if (q.y < 60 || q.y > canvas.height - 60) q.vy *= -1;

          // Fluctuating Gluon Color Flux Strings between Quarks
          if (idx % 3 === 0 && idx + 2 < quarksRef.current.length) {
            const q2 = quarksRef.current[idx + 1];
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(q.x, q.y);
            ctx.lineTo(q2.x, q2.y);
            ctx.stroke();
          }
        } else {
          // Confinement: Bound into Protons/Neutrons (Triplets) or Mesons (Pairs)
          const tripletIdx = Math.floor(idx / 3);
          const baseAngle = tripletIdx * 1.2 + time * 0.5;
          const orbitR = 110;
          const groupCx = cx + Math.cos(baseAngle) * orbitR;
          const groupCy = cy + Math.sin(baseAngle) * orbitR;

          const localAngle = (idx % 3) * ((Math.PI * 2) / 3) + time * 2;
          q.x = groupCx + Math.cos(localAngle) * 16;
          q.y = groupCy + Math.sin(localAngle) * 16;

          // Color Confining Flux Tube (String Tension kappa = 1 GeV/fm)
          if (idx % 3 === 0) {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(groupCx, groupCy, 24, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Draw Quark Particle
        ctx.fillStyle = q.color;
        ctx.shadowColor = q.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(q.flavor, q.x - 3, q.y + 3);
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDeconfined, plasmaTempMev]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-amber-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Atom className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400">
                QUANTUM CHROMODYNAMICS // QUARK-GLUON PLASMA (QGP)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                SU(3) ASYMPTOTIC FREEDOM (LHC/RHIC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              2.5 Trillion Kelvin deconfined primordial matter & color confinement for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleConfinement}
            className={cn(
              "px-6 py-3 rounded-xl font-bold shadow-lg flex items-center space-x-2 transition-all",
              isDeconfined ? "bg-pink-600 text-white shadow-pink-500/30" : "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>{isDeconfined ? 'DECONFINED QUARK-GLUON PLASMA (T > 155 MeV)' : 'HADRONIZATION FREEZE-OUT (COLOR BOUND)'}</span>
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
              <span className="text-pink-400 font-bold">TEMP: {plasmaTempMev} MeV (~2.5×10¹² K)</span>
              <span className="text-amber-400 font-bold">α_s: {strongCouplingAlphaS} (Asymptotic)</span>
            </div>
            <div>STATUS: {isDeconfined ? 'NEARLY PERFECT RELATIVISTIC LIQUID (η/s ≈ 1/4π)' : 'CONFINED HADRONIC PHASE'}</div>
          </div>
        </div>

        {/* QCD Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-pink-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              QGP TEMPERATURE
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Energy Scale (T):</span>
              <span className="text-pink-400 font-bold">{plasmaTempMev} MeV</span>
            </div>
            <input
              type="range"
              min={100}
              max={350}
              step={10}
              value={plasmaTempMev}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPlasmaTempMev(val);
                setIsDeconfined(val >= 155);
              }}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Asymptotic Freedom (Nobel 2004):</strong> At ultra-high energies, the strong coupling α_s drops toward zero, allowing quarks and gluons to roam freely as a deconfined liquid!</div>
            <div>• <strong>Color Confinement:</strong> Below T_c = 155 MeV, the gluon flux forms constant-energy strings (1 GeV/fm), prohibiting isolated color charges from ever existing in isolation!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
