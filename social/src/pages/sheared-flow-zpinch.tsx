import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ShearedFlowZpinch() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [shearedVelocityKmS, setShearedVelocityKmS] = useState(250); // 250 km/s sheared axial flow
  const [pinchCurrentKiloAmps, setPinchCurrentKiloAmps] = useState(650); // 650 kA pinch current
  const [specificImpulseSec, setSpecificImpulseSec] = useState(450000); // 450,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(10200); // 10,200 kN interceptor thrust

  const animFrameRef = useRef<number | null>(null);
  const zpinchPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Sheared-Flow Stabilized Z-Pinch Fusion Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Coaxial Outer Outer Neutral Gas Injection Electrodes (Left: 60 to 220)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, cy - 45); ctx.lineTo(220, cy - 45);
      ctx.moveTo(60, cy + 45); ctx.lineTo(220, cy + 45);
      ctx.stroke();

      // Sheared Axial Flow Streamlines v_z(r)
      const numStreams = 5;
      for (let s = 0; s < numStreams; s++) {
        const sy = cy - 30 + s * 15;
        const velFactor = 1.0 - Math.abs(s - 2) * 0.35; // Peak velocity at center r=0
        const sx = 60 + ((time * velFactor * 40) % 160);

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy); ctx.lineTo(sx + 20, sy);
        ctx.stroke();
      }

      // Perfectly Stabilized Narrow Z-Pinch Plasma Column (at cy)
      ctx.fillStyle = '#06b6d4';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.ellipse(140, cy, 75, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('SHEARED Z-PINCH (m=0/1 STABLE)', 72, cy + 3);

      // Magnetic Aerospike Expansion Divertor Nozzle (220 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(220, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(220, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Fusion Exhaust Plumes
      if (Math.random() < 0.85) {
        zpinchPlasmaJetsRef.current.push({
          x: 220,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 38 + (shearedVelocityKmS / 250) * 10,
        });
      }

      zpinchPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      zpinchPlasmaJetsRef.current = zpinchPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `SHEARED-FLOW Z-PINCH: SHEAR VELOCITY = ${shearedVelocityKmS} km/s | CURRENT = ${pinchCurrentKiloAmps} kA | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [shearedVelocityKmS, pinchCurrentKiloAmps, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
                SHEARED-FLOW Z-PINCH // 450,000s Isp INTERCEPTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SHUMLAK & GOLINGO (ZAP ENERGY & UNIV. OF WASHINGTON)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              MHD instability-free sheared axial flow & aneutronic p-11B starship for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">INTERCEPTOR THRUST</div>
            <div className="text-xl font-bold text-cyan-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-cyan-400 font-bold">SHEAR VELOCITY: {shearedVelocityKmS} km/s</span>
              <span className="text-pink-400 font-bold">CURRENT: {pinchCurrentKiloAmps} kA</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: m=0 SAUSAGE & m=1 KINK MODES SUPPRESSED</div>
          </div>
        </div>

        {/* Z-Pinch Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SHEAR FLOW (km/s)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Axial Flow Velocity:</span>
              <span className="text-cyan-400 font-bold">{shearedVelocityKmS} km/s</span>
            </div>
            <input
              type="range"
              min={100}
              max={400}
              step={10}
              value={shearedVelocityKmS}
              onChange={(e) => {
                const val = Number(e.target.value);
                setShearedVelocityKmS(val);
                setThrustKiloNewtons(Math.floor(val * 40.8));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Magnetohydrodynamic Stability:</strong> Sheared axial plasma flow (dv_z/dr exceeds 0.1 k v_A) tears apart sausage (m=0) and kink (m=1) disruptions before they grow, eliminating massive external magnetic coils!</div>
            <div>• <strong>Ultra-High Density Fusion:</strong> Achieves high Lawson confinement parameters exceeding 10^20 m^-3 s in a compact footprint, delivering 450,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
