import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Atom, Sparkles, Orbit, Anchor
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SkyhookTether() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tetherLengthKm, setTetherLengthKm] = useState(1000); // 1,000 km rotating tether
  const [tipVelocityKms, setTipVelocityKms] = useState(3.5); // 3.5 km/s (Mach 12 atmospheric dip)
  const [payloadMassTons, setPayloadMassTons] = useState(15); // 15-ton hypersonic transport
  const [deltaVElevatedKms, setDeltaVElevatedKms] = useState(7.0); // 7.0 km/s boost to GTO/TLI

  const animFrameRef = useRef<number | null>(null);

  // Rotating Non-Synchronous Orbital Skyhook Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 120; // Earth Center at bottom

      // Dark Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Earth Curved Horizon Surface (Bottom Arc at cy + 100)
      ctx.fillStyle = '#0369a1';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy + 240, 260, Math.PI, 0);
      ctx.fill();
      ctx.stroke();

      // Atmospheric Glow Layer
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(cx, cy + 240, 270, Math.PI, 0);
      ctx.stroke();

      // Skyhook Orbital Center of Mass Station (at cx, 160)
      const hubX = cx;
      const hubY = 160;

      ctx.fillStyle = '#64748b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.fillRect(hubX - 20, hubY - 10, 40, 20);
      ctx.strokeRect(hubX - 20, hubY - 10, 40, 20);

      // Rotating Skyhook Tether Arms (Carbon Nanotube Cable)
      const tetherRot = time * 0.8;
      const armR = 120;
      const tip1X = hubX + Math.cos(tetherRot) * armR;
      const tip1Y = hubY + Math.sin(tetherRot) * armR;
      const tip2X = hubX - Math.cos(tetherRot) * armR;
      const tip2Y = hubY - Math.sin(tetherRot) * armR;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(tip1X, tip1Y);
      ctx.lineTo(tip2X, tip2Y);
      ctx.stroke();

      // Tether Catch Hook Grippers
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(tip1X, tip1Y, 6, 0, Math.PI * 2);
      ctx.arc(tip2X, tip2Y, 6, 0, Math.PI * 2);
      ctx.fill();

      // Released Trans-Lunar Injection Payload
      const tliX = hubX + Math.cos(time * 0.5) * 220;
      const tliY = 50 + Math.sin(time * 0.5) * 30;

      ctx.fillStyle = '#22c55e';
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(tliX, tliY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        `ORBITAL SKYHOOK: ${tetherLengthKm} km ROTATING TETHER (ATMOSPHERIC DIP = ${tipVelocityKms} km/s | Δv BOOST = +${deltaVElevatedKms} km/s)`,
        60,
        canvas.height - 25
      );

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [tetherLengthKm, tipVelocityKms, payloadMassTons, deltaVElevatedKms]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Anchor className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-cyan-300 to-pink-400">
                ORBITAL SKYHOOK // MOMENTUM-EXCHANGE TETHER TRANSPORT
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ZUBRIN & MORAVEC (TETHERS UNLIMITED)
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Rotating Kevlar/CNT momentum exchange & propellantless orbital injection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">ΔV INJECTION BOOST</div>
            <div className="text-xl font-bold text-amber-400">+{deltaVElevatedKms} <span className="text-xs">km/s</span></div>
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
              <span className="text-amber-400 font-bold">TETHER: {tetherLengthKm} km</span>
              <span className="text-cyan-400 font-bold">CATCH: {tipVelocityKms} km/s (Mach 12)</span>
              <span className="text-emerald-400 font-bold">PAYLOAD: {payloadMassTons} Tons</span>
            </div>
            <div>STATUS: ZERO ROCKET PROPELLANT REQUIRED FOR ESCAPE TRAJECTORY</div>
          </div>
        </div>

        {/* Skyhook Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TETHER DIMENSIONS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Tether Length:</span>
              <span className="text-amber-400 font-bold">{tetherLengthKm} km</span>
            </div>
            <input
              type="range"
              min={500}
              max={2000}
              step={100}
              value={tetherLengthKm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTetherLengthKm(val);
                setDeltaVElevatedKms(+(val * 0.007).toFixed(1));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>Hypersonic Atmospheric Hook:</strong> The rotating tip cancels orbital speed at perigee, matching a suborbital Mach 12 spaceplane velocity for an easy mid-air hook capture!</div>
            <div>• <strong>Electrodynamic Re-boost:</strong> High-efficiency solar electrodynamic tethers harvest Earth's magnetic field to pump orbital energy back into the Skyhook without chemical fuel!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
