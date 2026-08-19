import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RdreEngine() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [detonationWaveSpeedMs, setDetonationWaveSpeedMs] = useState(2800); // 2,800 m/s Chapman-Jouguet detonation velocity
  const [detonationFreqKhz, setDetonationFreqKhz] = useState(18.5); // 18.5 kHz rotation
  const [pressureGainRatio, setPressureGainRatio] = useState(16.5); // 16.5x pressure gain
  const [thrustKn, setThrustKn] = useState(17.8); // 17.8 kN thrust (NASA Marshall 4,000-lbf class)

  const animFrameRef = useRef<number | null>(null);

  // Annular Detonation Wave Combustion Chamber Canvas (Front Axial View)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.12;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Dark Chamber
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Chamber Copper Cylinder Wall (Radius 160)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 160, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Centerbody Aerospike Plug (Radius 80)
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Annular Channel Gap (Between 80 and 160)
      // Rotating Supersonic Detonation Shock Front (Continuous spinning wave)
      const waveAngle = time;

      // Unburnt Fresh Methane/LOX Reactant Inflow (Cyan wedge preceding wave)
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, 155, waveAngle, waveAngle + Math.PI * 1.5);
      ctx.arc(cx, cy, 85, waveAngle + Math.PI * 1.5, waveAngle, true);
      ctx.fill();

      // High-Pressure Detonation Shock Wave (Supersonic CJ front in Blinding White/Yellow)
      const shockGrad = ctx.createRadialGradient(
        cx + Math.cos(waveAngle) * 120,
        cy + Math.sin(waveAngle) * 120,
        2,
        cx + Math.cos(waveAngle) * 120,
        cy + Math.sin(waveAngle) * 120,
        60
      );
      shockGrad.addColorStop(0, '#ffffff');
      shockGrad.addColorStop(0.3, '#f59e0b');
      shockGrad.addColorStop(0.7, '#ef4444');
      shockGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = shockGrad;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(
        cx + Math.cos(waveAngle) * 120,
        cy + Math.sin(waveAngle) * 120,
        50,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.shadowBlur = 0;

      // Trailing Expansion Fan (Oblique shock & expansion products behind detonation wave)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;
      for (let i = 1; i <= 6; i++) {
        const trAngle = waveAngle - i * 0.15;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(trAngle) * 85, cy + Math.sin(trAngle) * 85);
        ctx.lineTo(cx + Math.cos(trAngle) * 155, cy + Math.sin(trAngle) * 155);
        ctx.stroke();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [detonationWaveSpeedMs]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                ROTATING DETONATION ROCKET // RDRE CONTINUOUS WAVE (NASA)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                PRESSURE-GAIN COMBUSTION
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              18.5 kHz supersonic annular detonation shock & Humphrey thermodynamic cycle for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">PRESSURE GAIN</div>
            <div className="text-xl font-bold text-amber-400">{pressureGainRatio}× <span className="text-xs">RATIO</span></div>
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
              <span className="text-amber-400 font-bold">WAVE SPEED: {detonationWaveSpeedMs} m/s</span>
              <span className="text-cyan-400 font-bold">ROTATION: {detonationFreqKhz} kHz</span>
              <span className="text-pink-400 font-bold">THRUST: {thrustKn} kN</span>
            </div>
            <div>STATUS: CONTINUOUS SUPERSONIC DETONATION WAVE</div>
          </div>
        </div>

        {/* Propulsion Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DETONATION METRICS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>CJ Wave Speed:</span>
              <span className="text-amber-400 font-bold">{detonationWaveSpeedMs} m/s</span>
            </div>
            <input
              type="range"
              min={2000}
              max={3500}
              step={50}
              value={detonationWaveSpeedMs}
              onChange={(e) => setDetonationWaveSpeedMs(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Pressure-Gain Revolution:</strong> Standard rockets burn propellant via constant-pressure deflagration (subsonic). RDRE uses supersonic detonations to raise chamber pressure naturally.</div>
            <div>• <strong>15% Efficiency Leap:</strong> Delivers 15% higher specific impulse while reducing engine mass by over 30%!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
