import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function FrcThruster() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [plasmoidVelocityKms, setPlasmoidVelocityKms] = useState(150); // 150 km/s colliding plasmoid velocity
  const [pulseFreqHz, setPulseFreqHz] = useState(10); // 10 Hz repetition rate
  const [specificImpulseSec, setSpecificImpulseSec] = useState(7500); // 7,500 s Isp
  const [thrustN, setThrustN] = useState(120.0); // 120 N pulsed thrust

  const animFrameRef = useRef<number | null>(null);
  const plasmoidsRef = useRef<{ x: number; y: number; vx: number; r: number; color: string }[]>([]);

  // Colliding FRC Plasmoid Compression & Magnetic Blowdown Canvas
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

      // Left FRC Formation Injector Coil (60-180)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.strokeRect(60, cy - 40, 120, 80);

      // Right FRC Formation Injector Coil (380-500)
      ctx.strokeStyle = '#38bdf8';
      ctx.strokeRect(380, cy - 40, 120, 80);

      // Center Magnetic Compression Stagnation Chamber (200-340)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.strokeRect(200, cy - 55, 160, 110);

      // Divergent Magnetic Nozzle Exhaust at Stern (Bottom/Right 340-480)
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(340, cy - 55); ctx.quadraticCurveTo(440, cy - 80, 560, cy - 110);
      ctx.moveTo(340, cy + 55); ctx.quadraticCurveTo(440, cy + 80, 560, cy + 110);
      ctx.stroke();

      // Spawn Left & Right Colliding Compact Toroids (FRC Donuts)
      if (Math.random() < 0.25) {
        // Left FRC
        plasmoidsRef.current.push({
          x: 80,
          y: cy,
          vx: (plasmoidVelocityKms / 150) * 8,
          r: 22,
          color: '#06b6d4',
        });
        // Right Colliding FRC
        plasmoidsRef.current.push({
          x: 480,
          y: cy,
          vx: -(plasmoidVelocityKms / 150) * 8,
          r: 22,
          color: '#ec4899',
        });
      }

      // Draw & Update Colliding FRCs
      plasmoidsRef.current.forEach((p) => {
        p.x += p.vx;

        // Draw Toroidal Vortex Ring
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Stagnation Collision Burst in Center (280, cy)
      const centerDist = plasmoidsRef.current.filter(p => Math.abs(p.x - 280) < 15);
      if (centerDist.length >= 2) {
        // Magnetic Reconnection & Thermal Flash
        const burstGrad = ctx.createRadialGradient(280, cy, 5, 280, cy, 60);
        burstGrad.addColorStop(0, '#ffffff');
        burstGrad.addColorStop(0.4, '#f59e0b');
        burstGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.fillStyle = burstGrad;
        ctx.beginPath();
        ctx.arc(280, cy, 60, 0, Math.PI * 2);
        ctx.fill();

        uiaudio.success();
      }

      plasmoidsRef.current = plasmoidsRef.current.filter(p => p.x > 50 && p.x < 520);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [plasmoidVelocityKms]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                FRC PLASMOID COLLIDER // HELICITY-DRIVEN MAGNETOPLASMA
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                150 KM/S COMPACT TOROID STAGNATION
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              High-beta plasmoid magnetic reconnection & divergent nozzle blowdown for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-cyan-400">{specificImpulseSec} <span className="text-xs">SECONDS</span></div>
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
              <span className="text-cyan-400 font-bold">VELOCITY: {plasmoidVelocityKms} km/s</span>
              <span className="text-pink-400 font-bold">REP RATE: {pulseFreqHz} Hz</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustN} N</span>
            </div>
            <div>STATUS: HIGH-BETA COMPACT TOROID RECONNECTION STAGNATION</div>
          </div>
        </div>

        {/* Thruster Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              INJECTION SPEED
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Plasmoid Speed:</span>
              <span className="text-cyan-400 font-bold">{plasmoidVelocityKms} km/s</span>
            </div>
            <input
              type="range"
              min={80}
              max={250}
              step={10}
              value={plasmoidVelocityKms}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPlasmoidVelocityKms(val);
                setThrustN(+(val * 0.8).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Field-Reversed Configuration:</strong> Closed magnetic field lines trap dense plasma inside a self-contained toroidal plasmoid that travels intact down the barrel!</div>
            <div>• <strong>Stagnation Blowdown:</strong> Counter-colliding two FRCs converts 100% of kinetic energy into thermal plasma before exhausting through a magnetic nozzle at 7,500s Isp!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
