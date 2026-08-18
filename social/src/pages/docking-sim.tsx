import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Play, RotateCcw, Trophy, Zap, 
  Target, ShieldCheck, Compass, Radio, CheckCircle2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function DockingSim() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [distMeters, setDistMeters] = useState(45.0);
  const [relSpeedMs, setRelSpeedMs] = useState(0.35);
  const [fuelKg, setFuelKg] = useState(120);
  const [isDocked, setIsDocked] = useState(false);

  const shipRef = useRef({ x: 30, y: -20, z: 45, vx: -0.1, vy: 0.05, vz: -0.35, roll: 0.15 });
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const fireRcs = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (isDocked || fuelKg <= 0) return;
    uiaudio.click();
    setFuelKg(f => Math.max(0, f - 1));

    const s = shipRef.current;
    if (axis === 'x') s.vx += delta;
    if (axis === 'y') s.vy += delta;
    if (axis === 'z') s.vz += delta;
  };

  // 3D Orbital Docking Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      const s = shipRef.current;
      const keys = keysPressed.current;

      // Keyboard RCS Thruster inputs
      if (keys['KeyW']) s.vy -= 0.01;
      if (keys['KeyS']) s.vy += 0.01;
      if (keys['KeyA']) s.vx -= 0.01;
      if (keys['KeyD']) s.vx += 0.01;
      if (keys['KeyQ']) s.vz -= 0.01; // Forward thrust
      if (keys['KeyE']) s.vz += 0.01; // Reverse thrust

      if (!isDocked) {
        s.x += s.vx * 0.1;
        s.y += s.vy * 0.1;
        s.z += s.vz * 0.1;

        setDistMeters(Math.max(0, +s.z.toFixed(2)));
        setRelSpeedMs(Math.abs(+s.vz.toFixed(2)));

        // Successful Docking Condition
        if (s.z <= 0.2 && Math.abs(s.x) < 2 && Math.abs(s.y) < 2 && Math.abs(s.vz) < 0.4) {
          setIsDocked(true);
          uiaudio.success();
        }
      }

      // ---------------- RENDER ----------------
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep Space Void
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Earth Horizon at Bottom
      const earthGrad = ctx.createLinearGradient(0, canvas.height - 120, 0, canvas.height);
      earthGrad.addColorStop(0, '#0284c7');
      earthGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = earthGrad;
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height + 100, 500, 200, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw ISS Harmony Node 2 Docking Port (Approaching Target)
      const cx = canvas.width / 2 - s.x * 6;
      const cy = canvas.height / 2 - s.y * 6;
      const scale = Math.max(0.4, 40 / Math.max(1, s.z));
      const portRadius = 40 * scale;

      // ISS Outer Metal Structure
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, portRadius * 1.6, 0, Math.PI * 2);
      ctx.stroke();

      // IDA (International Docking Adapter) Ring
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(cx, cy, portRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Alignment Crosshair Target Guides
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Center Laser Reticle
      ctx.strokeStyle = isDocked ? '#10b981' : '#06b6d4';
      ctx.lineWidth = 2;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDocked]);

  const handleReset = () => {
    uiaudio.warp();
    setIsDocked(false);
    setDistMeters(45.0);
    setRelSpeedMs(0.35);
    setFuelKg(120);
    shipRef.current = { x: 30, y: -20, z: 45, vx: -0.1, vy: 0.05, vz: -0.35, roll: 0.15 };
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Rocket className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400">
              ORBITAL DOCKING // ISS RENDEZVOUS 3D
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              6-DoF RCS spacecraft trajectory & IDA docking latching simulator for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Reset */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={handleReset}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3D Docking HUD Canvas */}
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
        <canvas
          ref={canvasRef}
          width={740}
          height={480}
          className="w-full h-auto block"
        />

        {/* In-Cockpit Flight Telemetry HUD */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between font-mono text-xs pointer-events-none">
          <div className="bg-zinc-950/80 backdrop-blur-md p-3.5 rounded-xl border border-white/10 space-y-1">
            <div className="text-[10px] text-zinc-400">RANGE TO HARMONY NODE</div>
            <div className="text-2xl font-black text-cyan-400">{distMeters} <span className="text-xs">M</span></div>
            <div className="text-[10px] text-amber-400">RATE: {relSpeedMs} M/S</div>
          </div>

          <div className="bg-zinc-950/80 backdrop-blur-md px-4 py-3 rounded-xl border border-white/10 text-right space-y-1">
            <div className="text-[10px] text-zinc-400">RCS MONOPROPELLANT</div>
            <div className="text-base font-bold text-emerald-400">{fuelKg} KG</div>
          </div>
        </div>

        {isDocked && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-bounce" />
            <h2 className="text-3xl font-black tracking-wider uppercase text-emerald-400">
              CAPTURE CONFIRMED // HARD CAPTURE LATCH LOCKED
            </h2>
            <button
              onClick={handleReset}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 font-bold text-white shadow-xl hover:brightness-110"
            >
              RUN ANOTHER APPROACH
            </button>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
          <div>RCS KEYS: [W/S] TRANSLATE Y, [A/D] TRANSLATE X, [Q/E] RANGE +/-</div>
          <div>STATUS: LASER RETICLE LOCKED</div>
        </div>
      </div>
    </div>
  );
}
