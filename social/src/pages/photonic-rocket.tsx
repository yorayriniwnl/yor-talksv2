import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Atom, Sun
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function PhotonicRocket() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [coreTempK, setCoreTempK] = useState(100000); // 100,000 K nuclear blackbody core
  const [laserPowerGw, setLaserPowerGw] = useState(15.0); // 15.0 Gigawatt coherent laser beam
  const [thrustN, setThrustN] = useState(50.0); // 50 N (at F = P/c = 15 GW / 3e8 = 50 N)
  const [specificImpulseSec, setSpecificImpulseSec] = useState(30570000); // 30.57 Million seconds Isp (c / g0)

  const animFrameRef = useRef<number | null>(null);
  const laserBeamsRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Nuclear Photonic Rocket & Relativistic Laser Exhaust Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cy = canvas.height / 2;

      // Dark Interstellar Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Starfield Background (Relativistically Aberrated Forward)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 43) % canvas.width;
        const sy = (i * 31) % canvas.height;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Sänger Photonic Spacecraft Hull (Upper Left 60-240)
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(60, cy - 30);
      ctx.lineTo(240, cy - 50);
      ctx.lineTo(240, cy + 50);
      ctx.lineTo(60, cy + 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Super-Reflecting Parabolic Dielectric Mirror at Stern (240, cy)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(240, cy, 65, -Math.PI / 2.3, Math.PI / 2.3);
      ctx.stroke();

      // 100,000 K Nuclear Blackbody Focal Core (Blinding Pure White Glow)
      const coreGrad = ctx.createRadialGradient(220, cy, 2, 220, cy, 30);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, '#38bdf8');
      coreGrad.addColorStop(0.7, '#ec4899');
      coreGrad.addColorStop(1, 'rgba(236, 72, 153, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(220, cy, 30, 0, Math.PI * 2);
      ctx.fill();

      // Spawn Pure Photonic Directed Laser Thrust Rays (Speed of Light Exhaust)
      for (let i = 0; i < 8; i++) {
        laserBeamsRef.current.push({
          x: 240,
          y: cy + (Math.random() - 0.5) * 45,
          vx: Math.random() * 4 + 18, // High velocity
          vy: (Math.random() - 0.5) * 1.5,
          life: 80,
        });
      }

      // Draw Coherent Collimated Photon Beams
      laserBeamsRef.current.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 1.5;

        if (b.life > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      laserBeamsRef.current = laserBeamsRef.current.filter(b => b.life > 0 && b.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [laserPowerGw]);

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
                PHOTONIC ROCKET // SÄNGER RELATIVISTIC LASER PROPULSION
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Isp = 30,570,000 SECONDS (c-EXHAUST)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              100,000 K nuclear blackbody collimation & pure photon momentum transfer for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">SPECIFIC IMPULSE</div>
            <div className="text-xl font-bold text-cyan-400">30.57 <span className="text-xs">MILLION SECONDS</span></div>
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
              <span className="text-cyan-400 font-bold">LASER POWER: {laserPowerGw} GW</span>
              <span className="text-pink-400 font-bold">CORE TEMP: {coreTempK.toLocaleString()} K</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustN} N</span>
            </div>
            <div>STATUS: SPEED OF LIGHT (c) COLLIMATED EXHAUST</div>
          </div>
        </div>

        {/* Laser Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              BEAM POWER
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Laser Core Power:</span>
              <span className="text-cyan-400 font-bold">{laserPowerGw} GW</span>
            </div>
            <input
              type="range"
              min={5.0}
              max={50.0}
              step={2.5}
              value={laserPowerGw}
              onChange={(e) => {
                const val = Number(e.target.value);
                setLaserPowerGw(val);
                setThrustN(+(val * 3.333).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Ultimate Specific Impulse:</strong> Because photons travel at c (300,000 km/s), the specific impulse reaches the absolute physical upper limit possible in the universe: Isp = c/g₀ ≈ 30,570,000 s!</div>
            <div>• <strong>Relativistic Flight:</strong> Allows steady acceleration to 0.5c–0.8c for interstellar voyages without carrying massive reaction mass!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
