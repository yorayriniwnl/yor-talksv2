import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, Volume2, Sliders, Play, RotateCcw, Zap, 
  Sparkles, Radio, Disc, Activity, Layers
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

type FormantPreset = 'robot' | 'alien' | 'cyber_choir' | 'daft_vocoder';

export default function VocoderStudio() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [preset, setPreset] = useState<FormantPreset>('robot');
  const [carrierPitch, setCarrierPitch] = useState(130); // Hz
  const [formantShift, setFormantShift] = useState(1.2);
  const [bandsCount, setBandsCount] = useState(16);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const toggleVocoder = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }

      if (isPlaying) {
        if (oscRef.current) {
          oscRef.current.stop();
          oscRef.current.disconnect();
          oscRef.current = null;
        }
        setIsPlaying(false);
      } else {
        uiaudio.warp();
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = preset === 'robot' ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(carrierPitch, now);

        gain.gain.setValueAtTime(0.2, now);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        oscRef.current = osc;
        setIsPlaying(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 16-Band Vocoder Spectrum Waterfall Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const render = () => {
      time += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const bandWidth = canvas.width / bandsCount;

      for (let i = 0; i < bandsCount; i++) {
        const freqOffset = (i / bandsCount) * formantShift;
        const barHeight = isPlaying 
          ? (Math.sin(time * 3 + i * 0.8) * 0.4 + 0.6) * (canvas.height - 60)
          : (Math.sin(time + i * 0.4) * 0.1 + 0.15) * (canvas.height - 60);

        const x = i * bandWidth;
        const y = canvas.height - barHeight;

        // Gradient Bar
        const grad = ctx.createLinearGradient(0, y, 0, canvas.height);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(0.5, '#8b5cf6');
        grad.addColorStop(1, '#ec4899');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = isPlaying ? 12 : 2;
        ctx.fillRect(x + 2, y, bandWidth - 4, barHeight);
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, formantShift, bandsCount]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(168,85,247,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30 border border-purple-400/40">
            <Mic className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                VOCODER STUDIO // 16-BAND FORMANT SYNTH
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                DSP FILTERBANK
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Carrier/Modulator filterbank & robotic formant shaping for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={toggleVocoder}
            className={cn(
              "px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center space-x-2",
              isPlaying 
                ? "bg-pink-500 text-white shadow-pink-500/30 animate-pulse" 
                : "bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:brightness-110"
            )}
          >
            <Volume2 className="w-4 h-4" />
            <span>{isPlaying ? 'MUTE VOCODER CARRIER' : 'PLAY VOCODER CARRIER'}</span>
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
            height={480}
            className="w-full h-auto block"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[11px] text-zinc-400 bg-zinc-950/80 backdrop-blur-md p-3 rounded-xl border border-white/10 pointer-events-none">
            <div>16-BAND PARALLEL BANDPASS FILTERBANK CASCADE</div>
            <div>STATUS: {isPlaying ? 'CARRIER SYNTH OSCILLATING' : 'IDLE'}</div>
          </div>
        </div>

        {/* DSP Controls (1 Col) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl font-mono text-xs">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DSP PARAMETERS
            </h3>
          </div>

          {/* Formant Presets */}
          <div className="space-y-1.5">
            <span className="text-zinc-400">Formant Algorithm:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(['robot', 'alien', 'cyber_choir', 'daft_vocoder'] as FormantPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { uiaudio.hover(); setPreset(p); }}
                  className={cn(
                    "p-2 rounded-xl text-[10px] uppercase font-bold",
                    preset === p ? "bg-purple-500 text-white shadow-sm" : "bg-zinc-950 text-zinc-400 border border-white/5"
                  )}
                >
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Carrier Pitch */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Carrier Fundamental (F0):</span>
              <span className="text-purple-400 font-bold">{carrierPitch} Hz</span>
            </div>
            <input
              type="range"
              min={60}
              max={300}
              value={carrierPitch}
              onChange={(e) => setCarrierPitch(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Formant Shift */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-zinc-400">
              <span>Formant Shift Factor:</span>
              <span className="text-pink-400 font-bold">{formantShift}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.05}
              value={formantShift}
              onChange={(e) => setFormantShift(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
