import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Magnet, Compass, Target
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function RotatingPlasmaGunDreadnought() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gunMuzzleVelocityKms, setGunMuzzleVelocityKms] = useState(450); // 450 km/s coaxial gun ejection
  const [thetaPinchFieldTesla, setThetaPinchFieldTesla] = useState(85); // 85 Tesla rotating pinch
  const [specificImpulseSec, setSpecificImpulseSec] = useState(640000); // 640,000 s Isp
  const [thrustKiloNewtons, setThrustKiloNewtons] = useState(22000); // 22,000 kN dreadnought thrust

  const animFrameRef = useRef<number | null>(null);
  const dreadnoughtPlasmaJetsRef = useRef<{ x: number; y: number; vx: number }[]>([]);

  // Rotating Plasma Gun Dreadnought Fusion Canvas
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

      // Coaxial Gun Barrel Electrodes (Left: 60 to 180, cy)
      // Outer Electrode Tube
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(60, cy - 35); ctx.lineTo(180, cy - 35);
      ctx.moveTo(60, cy + 35); ctx.lineTo(180, cy + 35);
      ctx.stroke();

      // Inner Center Electrode Rod
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(60, cy - 6, 100, 12);

      // Rotating Theta-Pinch Coils (at 180 to 260)
      for (let i = 0; i < 4; i++) {
        const px = 180 + i * 20;
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(px, cy, 6, 42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // High-Beta Rotating Toroid Plasmoid Ignition Core (at 210, cy)
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 28;
      ctx.beginPath();
      ctx.arc(210, cy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 7px monospace';
      ctx.fillText('IGNITION', 193, cy + 2.5);

      // Magnetic Aerospike Divertor Expansion Bell (240 to 520)
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(240, cy - 25); ctx.lineTo(520, cy - 90);
      ctx.moveTo(240, cy + 25); ctx.lineTo(520, cy + 90);
      ctx.stroke();

      // High-Velocity Relativistic Alpha Exhaust Streams
      if (Math.random() < 0.85) {
        dreadnoughtPlasmaJetsRef.current.push({
          x: 240,
          y: cy + (Math.random() - 0.5) * 16,
          vx: 52 + (thetaPinchFieldTesla / 85) * 10,
        });
      }

      dreadnoughtPlasmaJetsRef.current.forEach((p) => {
        p.x += p.vx;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      dreadnoughtPlasmaJetsRef.current = dreadnoughtPlasmaJetsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PLASMA GUN DREADNOUGHT: MUZZLE VEL = ${gunMuzzleVelocityKms} km/s | PINCH B = ${thetaPinchFieldTesla} T | I_sp = ${specificImpulseSec.toLocaleString()} s | THRUST = ${thrustKiloNewtons} kN`,
        45,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gunMuzzleVelocityKms, thetaPinchFieldTesla, specificImpulseSec, thrustKiloNewtons]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-amber-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Flame className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-amber-300 to-cyan-400">
                ROTATING PLASMA GUN // 640,000s Isp DREADNOUGHT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                MARSHALL, ALFVÉN & BOSTICK (LANL & MIT)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Coaxial gun accelerated rotating theta-pinch aneutronic fusion drive for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">DREADNOUGHT THRUST</div>
            <div className="text-xl font-bold text-emerald-400">{thrustKiloNewtons} <span className="text-xs">kN</span></div>
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
              <span className="text-cyan-400 font-bold">GUN VELOCITY: {gunMuzzleVelocityKms} km/s</span>
              <span className="text-pink-400 font-bold">THETA PINCH: {thetaPinchFieldTesla} T</span>
              <span className="text-emerald-400 font-bold">THRUST: {thrustKiloNewtons} kN</span>
            </div>
            <div>STATUS: COAXIAL ROTATING PINCH IGNITION CONVERGED</div>
          </div>
        </div>

        {/* Gun Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              THETA PINCH (TESLA)
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Compression Field:</span>
              <span className="text-emerald-400 font-bold">{thetaPinchFieldTesla} T</span>
            </div>
            <input
              type="range"
              min={40}
              max={150}
              step={5}
              value={thetaPinchFieldTesla}
              onChange={(e) => {
                const val = Number(e.target.value);
                setThetaPinchFieldTesla(val);
                setGunMuzzleVelocityKms(Math.floor(val * 5.29));
                setThrustKiloNewtons(Math.floor(val * 258.8));
              }}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Marshall Coaxial Accelerator:</strong> Launches magnetized plasmoids at 450 km/s directly into rotating theta-pinch magnetic compression stages!</div>
            <div>• <strong>Rotational Stabilization:</strong> High-speed E×B rotation suppresses tilt and sausage instabilities, achieving clean p-11B ignition at 640,000s specific impulse!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
