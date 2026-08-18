import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Sliders, Play, Pause, RotateCcw, Zap, 
  Volume2, Disc, Waves, Layers, Radio, Sparkles
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function SignalLab() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isRunning, setIsRunning] = useState(true);
  const [viewMode, setViewMode] = useState<'dual' | 'lissajous' | 'fft'>('dual');
  
  // Channel 1 Controls
  const [ch1Freq, setCh1Freq] = useState(440);
  const [ch1Amp, setCh1Amp] = useState(1.0);
  const [ch1Type, setCh1Type] = useState<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine');
  const [ch1Phase, setCh1Phase] = useState(0);

  // Channel 2 Controls
  const [ch2Freq, setCh2Freq] = useState(660);
  const [ch2Amp, setCh2Amp] = useState(0.8);
  const [ch2Type, setCh2Type] = useState<'sine' | 'square' | 'sawtooth' | 'triangle'>('sine');
  const [ch2Phase, setCh2Phase] = useState(Math.PI / 2);

  const [timeDiv, setTimeDiv] = useState(0.005);
  const [noiseLevel, setNoiseLevel] = useState(0.02);

  const animFrameRef = useRef<number | null>(null);

  // Oscilloscope Canvas Simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Phosphor Green Screen & Grid Graticule
      ctx.fillStyle = '#020d08';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Graticule Grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.lineWidth = 1;
      const divisionsX = 10;
      const divisionsY = 8;
      const stepX = canvas.width / divisionsX;
      const stepY = canvas.height / divisionsY;

      for (let x = 0; x <= canvas.width; x += stepX) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += stepY) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Center crosshairs
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      if (isRunning) time += 0.05;

      const evalWave = (type: string, f: number, a: number, p: number, t: number) => {
        const theta = 2 * Math.PI * f * t + p;
        let v = 0;
        if (type === 'sine') v = Math.sin(theta);
        else if (type === 'square') v = Math.sin(theta) >= 0 ? 1 : -1;
        else if (type === 'sawtooth') v = (2 * (theta / (2 * Math.PI) - Math.floor(0.5 + theta / (2 * Math.PI))));
        else if (type === 'triangle') v = 2 * Math.abs(2 * (theta / (2 * Math.PI) - Math.floor(0.5 + theta / (2 * Math.PI)))) - 1;
        return v * a + (Math.random() - 0.5) * noiseLevel;
      };

      if (viewMode === 'dual') {
        // Channel 1: Phosphor Cyan / Green Beam
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 12;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x++) {
          const t = time + (x / canvas.width) * timeDiv;
          const yVal = evalWave(ch1Type, ch1Freq, ch1Amp, ch1Phase, t);
          const y = canvas.height / 2 - yVal * (canvas.height * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Channel 2: Phosphor Amber Beam
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();

        for (let x = 0; x < canvas.width; x++) {
          const t = time + (x / canvas.width) * timeDiv;
          const yVal = evalWave(ch2Type, ch2Freq, ch2Amp, ch2Phase, t);
          const y = canvas.height / 2 - yVal * (canvas.height * 0.35);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (viewMode === 'lissajous') {
        // X-Y Mode: Lissajous Curve
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 15;
        ctx.beginPath();

        const samples = 400;
        for (let i = 0; i < samples; i++) {
          const t = time + (i / samples) * 0.05;
          const xVal = evalWave(ch1Type, ch1Freq, ch1Amp, ch1Phase, t);
          const yVal = evalWave(ch2Type, ch2Freq, ch2Amp, ch2Phase, t);

          const px = canvas.width / 2 + xVal * (canvas.width * 0.35);
          const py = canvas.height / 2 - yVal * (canvas.height * 0.35);

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

      } else if (viewMode === 'fft') {
        // FFT Spectrum Analyzer Bars
        ctx.fillStyle = '#ec4899';
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 10;

        const bars = 48;
        const barW = canvas.width / bars;

        for (let b = 0; b < bars; b++) {
          const fBin = (b / bars) * 2000;
          let h = 0;

          // Peak at ch1 and ch2
          if (Math.abs(fBin - ch1Freq) < 60) h = ch1Amp * 240;
          if (Math.abs(fBin - ch2Freq) < 60) h = Math.max(h, ch2Amp * 240);

          // Add random jitter
          h = Math.max(8, h + (Math.random() - 0.5) * 15);

          ctx.fillRect(b * barW + 2, canvas.height - h - 10, barW - 4, h);
        }
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning, viewMode, ch1Freq, ch1Amp, ch1Type, ch1Phase, ch2Freq, ch2Amp, ch2Type, ch2Phase, timeDiv, noiseLevel]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Activity className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                SIGNAL LAB // HARDWARE OSCILLOSCOPE
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DUAL-CH 500MSPS
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Real-time Lissajous curve analysis, FFT spectrum analyzer & waveform synthesizer
            </p>
          </div>
        </div>

        {/* View Modes */}
        <div className="flex items-center space-x-2 bg-zinc-950/80 p-1.5 rounded-xl border border-white/10 font-mono text-xs">
          {(['dual', 'lissajous', 'fft'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                uiaudio.click();
                setViewMode(mode);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg uppercase transition-colors font-bold",
                viewMode === mode ? "bg-emerald-500 text-black shadow-sm" : "text-zinc-400 hover:text-white"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Scope Canvas (3 Cols) */}
        <div className="xl:col-span-3 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-zinc-950 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={780}
            height={520}
            className="w-full h-auto block"
          />

          {/* Quick HUD */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div className="flex items-center space-x-4">
              <span className="text-emerald-400 font-bold">CH1: {ch1Freq}Hz ({ch1Type})</span>
              <span className="text-amber-400 font-bold">CH2: {ch2Freq}Hz ({ch2Type})</span>
            </div>
            <div>TRIGGER: AUTO (EDGE RISING)</div>
          </div>
        </div>

        {/* Channel Synthesizer Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              SIGNAL GENERATOR
            </h3>
          </div>

          {/* CH1 Controls */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-emerald-500/20 space-y-2">
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>CHANNEL 1 (A)</span>
              <span>{ch1Freq} Hz</span>
            </div>
            <input
              type="range"
              min={20}
              max={1500}
              value={ch1Freq}
              onChange={(e) => setCh1Freq(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex space-x-1">
              {(['sine', 'square', 'sawtooth', 'triangle'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { uiaudio.hover(); setCh1Type(t); }}
                  className={cn(
                    "flex-1 py-1 rounded text-[9px] uppercase font-bold",
                    ch1Type === t ? "bg-emerald-500 text-black" : "bg-zinc-900 text-zinc-400"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* CH2 Controls */}
          <div className="p-3 bg-zinc-950 rounded-xl border border-amber-500/20 space-y-2">
            <div className="flex justify-between text-amber-400 font-bold">
              <span>CHANNEL 2 (B)</span>
              <span>{ch2Freq} Hz</span>
            </div>
            <input
              type="range"
              min={20}
              max={1500}
              value={ch2Freq}
              onChange={(e) => setCh2Freq(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex space-x-1">
              {(['sine', 'square', 'sawtooth', 'triangle'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { uiaudio.hover(); setCh2Type(t); }}
                  className={cn(
                    "flex-1 py-1 rounded text-[9px] uppercase font-bold",
                    ch2Type === t ? "bg-amber-500 text-black" : "bg-zinc-900 text-zinc-400"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Run / Stop */}
          <button
            onClick={() => {
              uiaudio.click();
              setIsRunning(!isRunning);
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-bold tracking-wider text-xs shadow-lg hover:brightness-110 flex items-center justify-center space-x-2 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>{isRunning ? 'FREEZE OSCILLOGRAM' : 'RESUME SCAN'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
