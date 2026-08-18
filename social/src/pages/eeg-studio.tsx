import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Brain, Zap, Play, Pause, RotateCcw, 
  Sparkles, Radio, Eye, ShieldCheck
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type MentalState = 'DEEP MEDITATION' | 'ALPHA FLOW STATE' | 'HIGH COGNITIVE FOCUS' | 'GAMMA PEAK';

export default function EegStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [mentalState, setMentalState] = useState<MentalState>('ALPHA FLOW STATE');
  const [alphaPower, setAlphaPower] = useState(68);
  const [betaPower, setBetaPower] = useState(42);
  const [gammaPower, setGammaPower] = useState(25);
  const [thetaPower, setThetaPower] = useState(30);

  const animFrameRef = useRef<number | null>(null);

  // 8-Channel EEG Waveform Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const channels = ['Fp1-F3', 'Fp2-F4', 'C3-P3', 'C4-P4', 'P3-O1', 'P4-O2', 'F7-T3', 'F8-T4'];

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const channelHeight = canvas.height / channels.length;

      channels.forEach((ch, idx) => {
        const centerY = channelHeight * idx + channelHeight / 2;

        // Label
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        ctx.fillText(ch, 12, centerY + 3);

        // EEG Waveform Trace
        ctx.strokeStyle = idx % 2 === 0 ? '#06b6d4' : '#a855f7';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 6;
        ctx.beginPath();

        for (let x = 60; x < canvas.width; x += 3) {
          const freq1 = 2 + idx * 0.4;
          const freq2 = 8 + idx * 1.2;
          const y = centerY + Math.sin(x * 0.04 * freq1 + time * 3) * 8 + Math.cos(x * 0.08 * freq2 + time * 5) * 4;

          if (x === 60) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, channelHeight * (idx + 1));
        ctx.lineTo(canvas.width, channelHeight * (idx + 1));
        ctx.stroke();
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const switchState = (st: MentalState) => {
    uiaudio.hover();
    setMentalState(st);
    if (st === 'ALPHA FLOW STATE') { setAlphaPower(85); setBetaPower(30); setGammaPower(20); }
    if (st === 'HIGH COGNITIVE FOCUS') { setAlphaPower(35); setBetaPower(88); setGammaPower(45); }
    if (st === 'DEEP MEDITATION') { setAlphaPower(40); setBetaPower(15); setThetaPower(85); }
    if (st === 'GAMMA PEAK') { setAlphaPower(20); setBetaPower(50); setGammaPower(92); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Brain className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-300 to-pink-400">
                EEG STUDIO // 8-CHANNEL NEUROFEEDBACK
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                10-20 MONTAGE SYSTEM
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Live EEG brainwave spectral density & cognitive state classifier for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Cognitive State Banner */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <div className="bg-zinc-950/80 px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] text-zinc-400">CLASSIFIED MENTAL STATE</div>
            <div className="text-base font-bold text-cyan-400">{mentalState}</div>
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
              <span className="text-cyan-400 font-bold">ALPHA (8-12 Hz): {alphaPower}%</span>
              <span className="text-purple-400 font-bold">BETA (13-30 Hz): {betaPower}%</span>
              <span className="text-pink-400 font-bold">GAMMA (30-100 Hz): {gammaPower}%</span>
            </div>
            <div>SAMPLE RATE: 256 HZ</div>
          </div>
        </div>

        {/* State Presets (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200 pb-2 border-b border-white/10">
            NEURO-ENTRAINMENT
          </h3>

          <div className="space-y-2">
            {(['ALPHA FLOW STATE', 'HIGH COGNITIVE FOCUS', 'DEEP MEDITATION', 'GAMMA PEAK'] as MentalState[]).map((st) => (
              <button
                key={st}
                onClick={() => switchState(st)}
                className={cn(
                  "w-full text-left px-3.5 py-3 rounded-xl font-bold uppercase transition-all border",
                  mentalState === st 
                    ? "bg-cyan-500 text-black border-cyan-400 shadow-md" 
                    : "bg-zinc-950 text-zinc-400 border-white/5 hover:border-white/15"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
