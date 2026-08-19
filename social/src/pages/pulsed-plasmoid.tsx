import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Magnet
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PulsedPlasmoid() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [plasmoidVelocityKms, setPlasmoidVelocityKms] = useState(250); // 250 km/s supersonic FRC injection
  const [specificImpulseSec, setSpecificImpulseSec] = useState(30000); // 30,000 s Isp
  const [compressionRatio, setCompressionRatio] = useState(20); // 20:1 magnetic flux compression
  const [thrustKn, setThrustKn] = useState(300); // 300 kN thrust

  const animFrameRef = useRef<number | null>(null);
  const plasmoidsRef = useRef<{ x: number; y: number; r: number; compressed: boolean }[]>([]);

  // Pulsed Plasmoid Helical Magnetic Compression Canvas
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

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Converging Helical Compression Coils (Lithium Liner Rings at 220 to 360)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      for (let x = 120; x <= 360; x += 30) {
        const radius = 90 - (x - 120) * 0.22;
        ctx.strokeRect(x, cy - radius, 12, radius * 2);
      }

      // Magnetic Expansion Nozzle (360 to 520)
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(360, cy - 35); ctx.lineTo(520, cy - 120);
      ctx.moveTo(360, cy + 35); ctx.lineTo(520, cy + 120);
      ctx.stroke();

      // Spawn Injected High-Beta FRC Plasmoids from Left (at 100)
      if (Math.random() < 0.12) {
        plasmoidsRef.current.push({
          x: 80,
          y: cy,
          r: 28,
          compressed: false,
        });
      }

      // Propagate & Compress Plasmoids
      plasmoidsRef.current.forEach((p) => {
        p.x += 8;

        // In Compression Zone (220 to 360)
        if (p.x > 180 && p.x < 360) {
          p.r = Math.max(6, 28 - (p.x - 180) * 0.14);
        }

        // Fusion Ignition & Sudden Expansion at Nozzle Throat (360)
        if (p.x >= 360) {
          p.compressed = true;
          p.r += 4.5;
        }

        ctx.fillStyle = p.compressed ? '#ec4899' : '#06b6d4';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = p.compressed ? 25 : 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      plasmoidsRef.current = plasmoidsRef.current.filter(p => p.x < canvas.width);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `PULSED PLASMOID LINER COMPRESSION: D-³He FUSION IGNITION (I_sp = ${specificImpulseSec.toLocaleString()} s | F = ${thrustKn} kN)`,
        80,
        cy + 160
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [plasmoidVelocityKms, specificImpulseSec, thrustKn]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Magnet className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                PULSED PLASMOID FUSION // HELICAL LINER COMPRESSION ROCKET
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                30,000s Isp (MSNW / SLOUGH - NASA NIAC)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              High-beta FRC plasmoid injection & direct inductive MHD energy recovery for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-cyan-400">{specificImpulseSec.toLocaleString()} <span className="text-xs">s</span></div>
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
              <span className="text-cyan-400 font-bold">FRC INJECTION: {plasmoidVelocityKms} km/s</span>
              <span className="text-pink-400 font-bold">COMPRESSION: {compressionRatio}:1</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustKn} kN</span>
            </div>
            <div>STATUS: DIRECT MHD INDUCTION HARVESTING COMPLETE</div>
          </div>
        </div>

        {/* Pulsed Plasmoid Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              INJECTION VELOCITY
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>FRC Inflow Speed:</span>
              <span className="text-cyan-400 font-bold">{plasmoidVelocityKms} km/s</span>
            </div>
            <input
              type="range"
              min={100}
              max={500}
              step={25}
              value={plasmoidVelocityKms}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPlasmoidVelocityKms(val);
                setSpecificImpulseSec(Math.round(val * 120));
                setThrustKn(Math.round(val * 1.2));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Field-Reversed Configuration:</strong> Self-confined high-beta toroidal plasmoids are translated supersonically into a converging magnetic flux coil!</div>
            <div>• <strong>Foil Liner Compression:</strong> Collapsing lithium rings compress the magnetic field to megagauss levels, igniting D-3He fusion without bulky laser drivers!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
