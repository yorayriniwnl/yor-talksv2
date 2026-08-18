import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wind, Gauge, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, ShieldCheck, Flame
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface StreamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export default function WindTunnel() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [airSpeedKmh, setAirSpeedKmh] = useState(320);
  const [drsOpen, setDrsOpen] = useState(false);
  const [groundEffectActive, setGroundEffectActive] = useState(true);
  const [downforceKg, setDownforceKg] = useState(1420);
  const [dragCoefficient, setDragCoefficient] = useState(0.72);
  const [rideHeightMm, setRideHeightMm] = useState(25);

  const particlesRef = useRef<StreamParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // CFD Wind Tunnel Particle Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timer = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Tunnel Chamber
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid Lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 35) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Ground Road Surface
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height - 70);
      ctx.lineTo(canvas.width, canvas.height - 70);
      ctx.stroke();

      // Draw F1 / Cyber Supercar Silhouette (Side Profile)
      const carX = canvas.width / 2 - 120;
      const carY = canvas.height - 70 - rideHeightMm;

      // Front Splitter (High Pressure Zone)
      ctx.fillStyle = '#ec4899';
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;
      ctx.fillRect(carX - 80, carY + 18, 60, 8);
      ctx.shadowBlur = 0;

      // Chassis Body
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(carX - 80, carY + 18);
      ctx.lineTo(carX - 20, carY + 8);
      ctx.lineTo(carX + 40, carY - 22); // Cockpit Airbox
      ctx.lineTo(carX + 160, carY - 8);
      ctx.lineTo(carX + 240, carY + 12); // Rear Diffuser
      ctx.lineTo(carX + 240, carY + 22);
      ctx.lineTo(carX - 80, carY + 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rear Wing DRS Flap
      ctx.fillStyle = drsOpen ? '#10b981' : '#f59e0b';
      ctx.shadowColor = drsOpen ? '#10b981' : '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.save();
      ctx.translate(carX + 210, carY - 30);
      ctx.rotate(drsOpen ? -0.35 : 0);
      ctx.fillRect(0, 0, 45, 8);
      ctx.restore();
      ctx.shadowBlur = 0;

      // Spawn Stream Smoke Particles
      timer++;
      if (timer > 2) {
        timer = 0;
        for (let y = 80; y < canvas.height - 60; y += 18) {
          const speedRatio = airSpeedKmh / 320;
          particlesRef.current.push({
            x: 0,
            y: y + (Math.random() - 0.5) * 4,
            vx: (7 + Math.random() * 2) * speedRatio,
            vy: 0,
            life: 1,
            color: y < canvas.height / 2 ? '#38bdf8' : '#10b981',
          });
        }
      }

      // Update & Draw Smoke Streamlines
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];

        // Aerodynamic Deflection around Car Hull
        if (p.x > carX - 100 && p.x < carX + 260) {
          // Cockpit upwards deflection
          if (p.y > carY - 40 && p.y < carY + 10) {
            p.vy = -1.8;
          }
          // Venturi Underbody Acceleration (Ground Effect suction)
          if (p.y > carY + 10 && p.y < canvas.height - 70) {
            p.vx *= 1.05; // Venturi acceleration
            p.vy = 0.2;
          }
          // Rear Wing Downforce Deflection
          if (p.x > carX + 180 && p.y < carY) {
            p.vy = drsOpen ? 0.5 : 2.5; // High downforce downwash when DRS closed
          }
        } else {
          p.vy *= 0.95;
        }

        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fill();

        if (p.x > canvas.width) particlesRef.current.splice(i, 1);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [airSpeedKmh, drsOpen, groundEffectActive, rideHeightMm]);

  const toggleDrs = () => {
    if (!drsOpen) {
      uiaudio.warp();
      setDrsOpen(true);
      setDragCoefficient(0.48);
      setDownforceKg(980);
    } else {
      uiaudio.click();
      setDrsOpen(false);
      setDragCoefficient(0.72);
      setDownforceKg(1420);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-teal-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(20,184,166,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/30 border border-teal-400/40">
            <Wind className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-teal-400 via-cyan-300 to-indigo-400">
                WIND TUNNEL // CFD AERODYNAMIC TELEMETRY
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                GROUND EFFECT & DRS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Computational fluid dynamics stream particle simulator for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleDrs}
            className={cn(
              "px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center space-x-2",
              drsOpen 
                ? "bg-emerald-500 text-black shadow-emerald-500/30 animate-pulse" 
                : "bg-zinc-800 text-white border border-white/10"
            )}
          >
            <Zap className="w-4 h-4" />
            <span>DRS WING: {drsOpen ? 'DEPLOYED (OPEN)' : 'CLOSED (HIGH DOWNFORCE)'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas CFD Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={740}
            height={500}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-4">
              <span className="text-teal-300 font-bold">DOWNFORCE: {downforceKg} KG</span>
              <span className="text-amber-400 font-bold">DRAG (Cd): {dragCoefficient}</span>
            </div>
            <div>FLOW VELOCITY: {airSpeedKmh} KM/H (MACH 0.26)</div>
          </div>
        </div>

        {/* CFD Telemetry Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              TUNNEL PARAMETERS
            </h3>
          </div>

          {/* Velocity */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Tunnel Wind Velocity:</span>
              <span className="text-teal-400 font-bold">{airSpeedKmh} KM/H</span>
            </div>
            <input
              type="range"
              min={100}
              max={400}
              step={10}
              value={airSpeedKmh}
              onChange={(e) => setAirSpeedKmh(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          {/* Ride Height */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Underbody Ride Height:</span>
              <span className="text-cyan-400 font-bold">{rideHeightMm} MM</span>
            </div>
            <input
              type="range"
              min={15}
              max={50}
              value={rideHeightMm}
              onChange={(e) => setRideHeightMm(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">BERNOULLI PRINCIPLE:</span>
            <div>• Low underbody height induces ground effect venturi suction.</div>
            <div>• Opening DRS reduces rear drag wake by ~33%.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
