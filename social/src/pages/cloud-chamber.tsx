import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Atom, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Layers, Radio, Eye
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface VaporTrack {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  life: number;
  type: string;
}

export default function CloudChamber() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [magneticFieldTesla, setMagneticFieldTesla] = useState(0.8);
  const [temperatureC, setTemperatureC] = useState(-32);
  const [eventsPerSec, setEventsPerSec] = useState(14);

  const tracksRef = useRef<VaporTrack[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Cloud Chamber Supersaturated Alcohol Vapor Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dark Chamber Felt Bottom
      ctx.fillStyle = '#010309';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Spawn Random Cosmic Ray Muon / Alpha / Beta Tracks
      if (Math.random() > 0.82) {
        const pType = Math.random() > 0.6 ? 'MUON' : (Math.random() > 0.4 ? 'ALPHA' : 'BETA');
        const startX = Math.random() * canvas.width;
        const startY = Math.random() > 0.5 ? 0 : canvas.height;
        const angle = (Math.random() - 0.5) * Math.PI + (startY === 0 ? Math.PI / 2 : -Math.PI / 2);
        const speed = pType === 'ALPHA' ? 3 : (pType === 'MUON' ? 8 : 5);
        const length = pType === 'ALPHA' ? 15 : 45;

        const pts = [];
        let curX = startX;
        let curY = startY;
        let curAngle = angle;

        for (let i = 0; i < length; i++) {
          pts.push({ x: curX, y: curY });
          // Magnetic Lorentz Curvature: q(v x B)
          if (pType === 'BETA') curAngle += (magneticFieldTesla * 0.08) * (Math.random() > 0.5 ? 1 : -1);
          if (pType === 'MUON') curAngle += magneticFieldTesla * 0.01;

          curX += Math.cos(curAngle) * speed;
          curY += Math.sin(curAngle) * speed;
        }

        tracksRef.current.push({
          points: pts,
          color: pType === 'ALPHA' ? '#ffffff' : (pType === 'MUON' ? '#06b6d4' : '#ec4899'),
          width: pType === 'ALPHA' ? 5 : 2,
          life: 80,
          type: pType,
        });
      }

      // Draw Condensation Droplet Vapor Tracks
      tracksRef.current.forEach((t) => {
        t.life -= 1;
        if (t.life > 0 && t.points.length > 1) {
          ctx.strokeStyle = t.color;
          ctx.lineWidth = t.width;
          ctx.shadowColor = t.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(t.points[0].x, t.points[0].y);
          for (let i = 1; i < t.points.length; i++) {
            ctx.lineTo(t.points[i].x, t.points[i].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      });

      tracksRef.current = tracksRef.current.filter(t => t.life > 0);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [magneticFieldTesla]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Atom className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '20s' }} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-400">
                CLOUD CHAMBER // COSMIC RAY MUON TRACK DETECTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SUPERSATURATED ALCOHOL VAPOR
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Wilson vapor condensation & Lorentz subatomic particle deflection for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Temp */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CHAMBER TEMPERATURE</div>
            <div className="text-xl font-bold text-cyan-400">{temperatureC}°C <span className="text-xs">(DRY ICE COOLED)</span></div>
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
              <span className="text-cyan-400 font-bold">MAGNETIC FIELD: {magneticFieldTesla} T</span>
              <span className="text-pink-400 font-bold">COSMIC FLUX: {eventsPerSec} EVENTS/SEC</span>
            </div>
            <div>STATUS: IONIZATION CONDENSATION ACTIVE</div>
          </div>
        </div>

        {/* Chamber Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              LORENTZ CONTROLS
            </h3>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Magnetic Field (B):</span>
              <span className="text-cyan-400 font-bold">{magneticFieldTesla} Tesla</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={2.0}
              step={0.1}
              value={magneticFieldTesla}
              onChange={(e) => setMagneticFieldTesla(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">PARTICLE SIGNATURES:</span>
            <div>• <strong>Muons (μ-):</strong> Thin, razor-straight relativistic lines from cosmic upper atmosphere.</div>
            <div>• <strong>Alphas (α):</strong> Thick, dense, bright short ionization trails.</div>
            <div>• <strong>Betas (e-):</strong> Curving zigzag electron tracks deflected by magnetic field.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
