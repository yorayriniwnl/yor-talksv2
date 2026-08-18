import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Waves, Sparkles, Play, Pause, RotateCcw, Zap, 
  Activity, Sliders, Volume2, ShieldCheck, Sun
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function GravWave() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [strainH, setStrainH] = useState(1.42e-21);
  const [binaryMassRatio, setBinaryMassRatio] = useState(36.0); // 36 Solar masses (GW150914)
  const [chirpFrequency, setChirpFrequency] = useState(150); // Hz
  const [isDetecting, setIsDetecting] = useState(true);
  const [laserPowerKw, setLaserPowerKw] = useState(200);

  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChirpSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Chirp frequency ramps from 40Hz to 350Hz in 0.8s
      osc.frequency.setValueAtTime(40, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.7);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.error(e);
    }
  };

  // LIGO Laser Interferometer Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = 120;
      const cy = canvas.height - 100;
      const armLength = 320;

      // 1. Draw LIGO Arms (Beam Tube X & Y)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 14;

      // X-Arm (Horizontal)
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + armLength, cy);
      ctx.stroke();

      // Y-Arm (Vertical)
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - armLength);
      ctx.stroke();

      // 2. High-Power Infrared/Green Laser Beams
      const phaseX = Math.sin(time * 2) * (isDetecting ? 4 : 0);
      const phaseY = Math.cos(time * 2) * (isDetecting ? 4 : 0);

      // Horizontal Laser Beam
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + armLength + phaseX, cy);
      ctx.stroke();

      // Vertical Laser Beam
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - armLength - phaseY);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. Beam Splitter at Vertex
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fillRect(cx - 8, cy - 8, 16, 16);
      ctx.shadowBlur = 0;

      // 4. Interference Fringe Pattern Output (Right Side Canvas)
      const fringeX = 540;
      const fringeY = 180;
      const fringeRadius = 90;

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(fringeX, fringeY, fringeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Concentric Interference Rings
      for (let r = 10; r < fringeRadius; r += 8) {
        const ringIntensity = (Math.sin(r * 0.3 + time * 3) + 1) / 2;
        ctx.strokeStyle = `rgba(16, 185, 129, ${ringIntensity * 0.9})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(fringeX, fringeY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Fringe Border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 5. Gravitational Wave Chirp Waveform
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur = 10;
      ctx.beginPath();

      const waveStartX = 440;
      const waveEndX = 680;
      const waveCenterY = 380;

      for (let x = waveStartX; x < waveEndX; x++) {
        const t = (x - waveStartX) / (waveEndX - waveStartX);
        const freq = 4 + t * 24;
        const amp = (t * t) * 35;
        const y = waveCenterY + Math.sin(t * freq * Math.PI * 2 - time * 6) * amp;

        if (x === waveStartX) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isDetecting, binaryMassRatio, laserPowerKw]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Radio className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-300 to-pink-400">
                LIGO // GRAVITATIONAL WAVE DETECTOR
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                4KM LASER INTERFEROMETER
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Spacetime strain $h(t) \sim 10^{'{'}-21{'}'}$ laser interference & binary black hole merger chirp for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Sound Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={() => {
              uiaudio.warp();
              playChirpSound();
            }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-600 text-black font-bold shadow-lg hover:brightness-110 flex items-center space-x-2 transition-all"
          >
            <Volume2 className="w-4 h-4" />
            <span>PLAY GW150914 CHIRP SOUND</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Canvas Visualizer (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={740}
            height={500}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-3">
              <span className="text-emerald-400 font-bold">STRAIN (h): 1.42 × 10⁻²¹</span>
              <span className="text-pink-400 font-bold">MERGER FREQ: ~350 HZ</span>
            </div>
            <div>STATUS: OPTICAL CAVITY LOCKED</div>
          </div>
        </div>

        {/* Telemetry Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DETECTOR CONTROLS
            </h3>
          </div>

          {/* Binary Mass */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Binary Mass (M☉ + M☉):</span>
              <span className="text-emerald-400 font-bold">{binaryMassRatio} M☉</span>
            </div>
            <input
              type="range"
              min={10}
              max={70}
              step={2}
              value={binaryMassRatio}
              onChange={(e) => setBinaryMassRatio(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Laser Power */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Arm Laser Power:</span>
              <span className="text-cyan-400 font-bold">{laserPowerKw} kW</span>
            </div>
            <input
              type="range"
              min={50}
              max={500}
              step={25}
              value={laserPowerKw}
              onChange={(e) => setLaserPowerKw(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-zinc-950 rounded-xl border border-white/5 text-zinc-400 space-y-1.5 leading-relaxed text-[11px]">
            <span className="text-white font-bold block">EINSTEIN GENERAL RELATIVITY:</span>
            <div>• Gravitational waves stretch and compress perpendicular laser arms by less than 1/10,000th the width of a proton.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
