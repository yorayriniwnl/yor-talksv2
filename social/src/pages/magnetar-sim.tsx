import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Orbit, ShieldAlert
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function MagnetarSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [magneticFieldTesla, setMagneticFieldTesla] = useState(1.4e11); // 1.4 x 10^11 Tesla (10^15 Gauss)
  const [starquakeOccurred, setStarquakeOccurred] = useState(false);
  const [qedVacuumBirefringence, setQedVacuumBirefringence] = useState(99.4); // % polarized

  const animFrameRef = useRef<number | null>(null);

  const triggerStarquake = () => {
    uiaudio.warp();
    setStarquakeOccurred(true);
    setTimeout(() => {
      setStarquakeOccurred(false);
      uiaudio.success();
    }, 1200);
  };

  // Magnetar Dipole Field & Vacuum Polarization Canvas
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

      // Dark Cosmic Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Magnetic Dipole Field Loops (Ultra-dense field lines)
      ctx.strokeStyle = starquakeOccurred ? '#ef4444' : 'rgba(236, 72, 153, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = starquakeOccurred ? 15 : 6;

      for (let r = 50; r <= 220; r += 25) {
        ctx.beginPath();
        // Dipole equation: r = r0 * sin^2(theta)
        for (let a = -Math.PI; a <= Math.PI; a += 0.05) {
          const rad = r * Math.sin(a) * Math.sin(a);
          const px = cx + Math.cos(a) * rad;
          const py = cy + Math.sin(a) * rad * 1.5;
          if (a === -Math.PI) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Central Neutron Star Crust (20km diameter)
      const starGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 35);
      starGrad.addColorStop(0, '#ffffff');
      starGrad.addColorStop(0.5, '#06b6d4');
      starGrad.addColorStop(1, '#a855f7');

      ctx.fillStyle = starGrad;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Polar Gamma-Ray Relativistic Jet Columns
      const jetGrad = ctx.createLinearGradient(cx, cy, cx, 0);
      jetGrad.addColorStop(0, '#ffffff');
      jetGrad.addColorStop(0.5, '#06b6d4');
      jetGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = jetGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 25);
      ctx.lineTo(cx - 30, 0);
      ctx.lineTo(cx + 30, 0);
      ctx.lineTo(cx + 8, cy - 25);
      ctx.closePath();
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [starquakeOccurred]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(236,72,153,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/30 border border-pink-400/40">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-rose-300 to-cyan-400">
                MAGNETAR // 10¹⁵ GAUSS ULTRA-STRONG MAGNETIC FIELD
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/40">
                QED VACUUM BIREFRINGENCE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Schwinger limit breakdown & starquake soft gamma repeater flares for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={triggerStarquake}
            disabled={starquakeOccurred}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 flex items-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{starquakeOccurred ? 'CRUST FRACTURE SGR DETONATING...' : 'TRIGGER CRUST STARQUAKE'}</span>
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
              <span className="text-pink-400 font-bold">B-FIELD: 1.4 × 10¹¹ TESLA</span>
              <span className="text-cyan-400 font-bold">QED POLARIZATION: {qedVacuumBirefringence}%</span>
            </div>
            <div>STATUS: {starquakeOccurred ? 'STARQUAKE SEISMIC GAMMA FLARE' : 'STABLE DIPOLE EQUILIBRIUM'}</div>
          </div>
        </div>

        {/* Telemetry (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            QED PHENOMENA
          </h3>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Schwinger Limit:</strong> Exceeds B_QED = 4.4 × 10^9 T; empty vacuum polarizes like a crystal and splits photons into pairs.</div>
            <div>• <strong>Starquakes:</strong> Magnetic stresses fracture the solid neutron-degenerate crust, releasing in 0.1 seconds more energy than the Sun emits in 100,000 years!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
