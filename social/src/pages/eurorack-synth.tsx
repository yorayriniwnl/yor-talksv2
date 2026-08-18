import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sliders, Music, Disc, Volume2, Radio, Play, Pause, 
  RotateCcw, Zap, Sparkles, Activity, Cable, Waves
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface PatchCable {
  id: string;
  fromJack: string;
  toJack: string;
  color: string;
}

export default function EurorackSynth() {
  const currentUser = useAppStore((state) => state.currentUser);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // VCO 1
  const [vco1Freq, setVco1Freq] = useState(220);
  const [vco1Wave, setVco1Wave] = useState<'sawtooth' | 'square' | 'triangle' | 'sine'>('sawtooth');
  const [vco1Octave, setVco1Octave] = useState(0);

  // VCO 2
  const [vco2Freq, setVco2Freq] = useState(440);
  const [vco2Wave, setVco2Wave] = useState<'sawtooth' | 'square' | 'triangle' | 'sine'>('square');
  const [vco2Detune, setVco2Detune] = useState(8);

  // VCF Filter
  const [vcfCutoff, setVcfCutoff] = useState(1200);
  const [vcfResonance, setVcfResonance] = useState(12);

  // LFO
  const [lfoRate, setLfoRate] = useState(2.5);
  const [lfoDepth, setLfoDepth] = useState(0.4);

  // Delay
  const [delayTime, setDelayTime] = useState(0.3);
  const [delayFeedback, setDelayFeedback] = useState(0.45);

  const [isPlaying, setIsPlaying] = useState(false);

  const [patchCables, setPatchCables] = useState<PatchCable[]>([
    { id: '1', fromJack: 'LFO_OUT', toJack: 'VCF_CV', color: '#ec4899' },
    { id: '2', fromJack: 'VCO1_OUT', toJack: 'VCF_IN', color: '#06b6d4' },
    { id: '3', fromJack: 'VCF_OUT', toJack: 'DELAY_IN', color: '#f59e0b' },
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const osc1Ref = useRef<OscillatorNode | null>(null);
  const osc2Ref = useRef<OscillatorNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const initSynth = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = vco1Wave;
      osc1.frequency.value = vco1Freq;

      osc2.type = vco2Wave;
      osc2.frequency.value = vco2Freq;
      osc2.detune.value = vco2Detune;

      filter.type = 'lowpass';
      filter.frequency.value = vcfCutoff;
      filter.Q.value = vcfResonance;

      gain.gain.value = 0.2;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      audioCtxRef.current = ctx;
      osc1Ref.current = osc1;
      osc2Ref.current = osc2;
      filterRef.current = filter;
      gainRef.current = gain;
    }
  };

  const handlePlayToggle = () => {
    initSynth();
    if (!isPlaying) {
      uiaudio.warp();
      audioCtxRef.current?.resume();
      if (gainRef.current) gainRef.current.gain.value = 0.2;
      setIsPlaying(true);
    } else {
      uiaudio.click();
      if (gainRef.current) gainRef.current.gain.value = 0;
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    if (osc1Ref.current && audioCtxRef.current) {
      osc1Ref.current.frequency.setValueAtTime(vco1Freq, audioCtxRef.current.currentTime);
      osc1Ref.current.type = vco1Wave;
    }
    if (osc2Ref.current && audioCtxRef.current) {
      osc2Ref.current.frequency.setValueAtTime(vco2Freq, audioCtxRef.current.currentTime);
      osc2Ref.current.detune.setValueAtTime(vco2Detune, audioCtxRef.current.currentTime);
      osc2Ref.current.type = vco2Wave;
    }
    if (filterRef.current && audioCtxRef.current) {
      filterRef.current.frequency.setValueAtTime(vcfCutoff, audioCtxRef.current.currentTime);
      filterRef.current.Q.setValueAtTime(vcfResonance, audioCtxRef.current.currentTime);
    }
  }, [vco1Freq, vco1Wave, vco2Freq, vco2Wave, vco2Detune, vcfCutoff, vcfResonance]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(245,158,11,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/40">
            <Cable className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-300 to-cyan-400">
                EURORACK MODULAR // CYBER SYNTHESIZER
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                DSP ANALOG MODEL
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Voltage-controlled modular synthesizer with virtual CV patch cables for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Master Power / Play */}
        <button
          onClick={handlePlayToggle}
          className={cn(
            "px-6 py-3 rounded-xl font-bold font-mono tracking-wider text-xs shadow-lg transition-all flex items-center space-x-2",
            isPlaying 
              ? "bg-amber-500 text-black shadow-amber-500/30 animate-pulse" 
              : "bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10"
          )}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isPlaying ? 'ACTIVE ANALOG DRONE' : 'POWER ON EURORACK'}</span>
        </button>
      </div>

      {/* Eurorack Modular Frame */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/10 backdrop-blur-xl">
        {/* Module 1: VCO 1 Primary Oscillator */}
        <div className="p-4 bg-zinc-950/80 rounded-xl border border-cyan-500/30 space-y-4 font-mono text-xs shadow-md">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="font-bold text-cyan-400">VCO 1 // PRIMARY</span>
            <span className="text-[10px] text-zinc-500">3340 IC</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Frequency:</span>
              <span className="text-white font-bold">{vco1Freq} Hz</span>
            </div>
            <input
              type="range"
              min={40}
              max={880}
              value={vco1Freq}
              onChange={(e) => setVco1Freq(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <span className="text-zinc-400">Waveform Shape:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {(['sawtooth', 'square', 'triangle', 'sine'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => { uiaudio.hover(); setVco1Wave(w); }}
                  className={cn(
                    "py-1 rounded text-[10px] uppercase font-bold",
                    vco1Wave === w ? "bg-cyan-500 text-black" : "bg-zinc-900 text-zinc-400"
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500">
            <span>OUT JACK:</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold border border-cyan-500/40">
              ● VCO1_OUT
            </span>
          </div>
        </div>

        {/* Module 2: VCO 2 Sub Oscillator */}
        <div className="p-4 bg-zinc-950/80 rounded-xl border border-rose-500/30 space-y-4 font-mono text-xs shadow-md">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="font-bold text-rose-400">VCO 2 // DETUNE</span>
            <span className="text-[10px] text-zinc-500">SUB-OCTAVE</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Frequency:</span>
              <span className="text-white font-bold">{vco2Freq} Hz</span>
            </div>
            <input
              type="range"
              min={40}
              max={880}
              value={vco2Freq}
              onChange={(e) => setVco2Freq(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Detune Cents:</span>
              <span className="text-rose-400 font-bold">+{vco2Detune}¢</span>
            </div>
            <input
              type="range"
              min={-50}
              max={50}
              value={vco2Detune}
              onChange={(e) => setVco2Detune(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500">
            <span>OUT JACK:</span>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-500/40">
              ● VCO2_OUT
            </span>
          </div>
        </div>

        {/* Module 3: VCF Ladder Filter */}
        <div className="p-4 bg-zinc-950/80 rounded-xl border border-amber-500/30 space-y-4 font-mono text-xs shadow-md">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="font-bold text-amber-400">VCF // 24dB LADDER</span>
            <span className="text-[10px] text-zinc-500">MOOG FILTER</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Cutoff:</span>
              <span className="text-white font-bold">{vcfCutoff} Hz</span>
            </div>
            <input
              type="range"
              min={100}
              max={6000}
              value={vcfCutoff}
              onChange={(e) => setVcfCutoff(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-400">
              <span>Resonance (Q):</span>
              <span className="text-amber-400 font-bold">{vcfResonance}</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              value={vcfResonance}
              onChange={(e) => setVcfResonance(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500">
            <span>CV IN:</span>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-500/40">
              ● VCF_CV
            </span>
          </div>
        </div>

        {/* Module 4: Patch Cable Matrix */}
        <div className="p-4 bg-zinc-950/80 rounded-xl border border-purple-500/30 space-y-3 font-mono text-xs shadow-md">
          <div className="flex justify-between items-center border-b border-white/10 pb-2">
            <span className="font-bold text-purple-400">PATCH MATRIX</span>
            <span className="text-[10px] text-zinc-500">{patchCables.length} CABLES</span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {patchCables.map((c) => (
              <div 
                key={c.id}
                className="p-2 rounded bg-zinc-900 border border-white/5 flex items-center justify-between text-[11px]"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="font-bold text-white">{c.fromJack}</span>
                </div>
                <span className="text-zinc-500">→</span>
                <span className="text-purple-300 font-bold">{c.toJack}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
