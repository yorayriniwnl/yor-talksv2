import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, Zap, Play, Pause, RotateCcw, 
  Flame, ShieldCheck, Activity, Sliders, Sun, Globe2
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function M2p2Sail() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [magnetosphereRadiusKm, setMagnetosphereRadiusKm] = useState(20); // 20 km inflated plasma magnetosphere
  const [plasmaInjectionKw, setPlasmaInjectionKw] = useState(3.5); // 3.5 kW helicon plasma source
  const [thrustN, setThrustN] = useState(2.8); // 2.8 N continuous solar wind thrust
  const [solarWindSpeedKms, setSolarWindSpeedKms] = useState(400); // 400 km/s solar wind

  const animFrameRef = useRef<number | null>(null);
  const windParticlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([]);

  // Mini-Magnetospheric Plasma Propulsion (M2P2) & Bow Shock Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.08;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2 + 60;
      const cy = canvas.height / 2;

      // Dark Deep Space Void
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Central Spacecraft Bus & Dipole Coil (At cx, cy)
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 10, cy - 10, 20, 20);

      // Inflated Artificial Mini-Magnetosphere Plasma Bubble (Radius ~ 150)
      const magR = 80 + (magnetosphereRadiusKm / 30) * 100;

      const bubbleGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, magR);
      bubbleGrad.addColorStop(0, '#ffffff');
      bubbleGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.4)');
      bubbleGrad.addColorStop(0.8, 'rgba(99, 102, 241, 0.2)');
      bubbleGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = bubbleGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, magR, 0, Math.PI * 2);
      ctx.fill();

      // Magnetic Bow Shock Front (Parabolic Arc Deflecting Solar Wind on Left)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(cx, cy, magR, Math.PI * 0.55, Math.PI * 1.45);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Spawn Supersonic Solar Wind Ions from the Sun (Left to Right)
      for (let i = 0; i < 8; i++) {
        windParticlesRef.current.push({
          x: 20,
          y: Math.random() * canvas.height,
          vx: Math.random() * 4 + 10,
          vy: 0,
          life: 80,
        });
      }

      // Draw & Deflect Solar Wind Particles around Magnetosphere
      windParticlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1.5;

        // Check Bow Shock Deflection
        const dist = Math.hypot(p.x - cx, p.y - cy);
        if (dist < magR && p.x < cx) {
          // Deflect around bubble
          const normY = (p.y - cy) / magR;
          p.vy += normY * 3.5;
          p.vx *= 0.85;
        }

        if (p.life > 0) {
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      windParticlesRef.current = windParticlesRef.current.filter(p => p.life > 0 && p.x < canvas.width);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [magnetosphereRadiusKm]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Globe2 className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                M2P2 PLASMA SAIL // MINI-MAGNETOSPHERIC PROPULSION (NASA NIAC)
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                20 KM ARTIFICIAL MAGNETOSPHERE
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Plasma-inflated magnetic bubble & 400 km/s supersonic solar wind deflection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">MAGNETOSPHERE DIAMETER</div>
            <div className="text-xl font-bold text-cyan-400">{magnetosphereRadiusKm * 2} <span className="text-xs">KILOMETERS</span></div>
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
              <span className="text-cyan-400 font-bold">RADIUS: {magnetosphereRadiusKm} km</span>
              <span className="text-pink-400 font-bold">SOLAR WIND: {solarWindSpeedKms} km/s</span>
              <span className="text-amber-400 font-bold">THRUST: {thrustN} N</span>
            </div>
            <div>STATUS: CONTINUOUS SUPERSONIC SOLAR WIND BOW SHOCK DEFLECTION</div>
          </div>
        </div>

        {/* M2P2 Parameters (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              PLASMA INFLATION
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Bubble Radius:</span>
              <span className="text-cyan-400 font-bold">{magnetosphereRadiusKm} km</span>
            </div>
            <input
              type="range"
              min={10}
              max={40}
              step={2}
              value={magnetosphereRadiusKm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMagnetosphereRadiusKm(val);
                setThrustN(+(val * 0.14).toFixed(1));
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-2 leading-relaxed text-[11px]">
            <div>• <strong>No Massive Physical Sails:</strong> Instead of deploying a fragile 10-kilometer mechanical membrane, M2P2 injects a few grams of plasma per day into a small magnetic coil to inflate a 20-kilometer magnetic shield!</div>
            <div>• <strong>Solar Wind Sailing:</strong> Intercepts the natural 400–800 km/s solar wind plasma to achieve high-speed interplanetary transport with minimal power!</div>
          </div>
        </div>
      </div>
    </div>
  );
}
