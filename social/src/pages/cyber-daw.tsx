import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Square, Volume2, VolumeX, RotateCcw, Download, Sparkles, 
  Sliders, Music, Disc, Radio, Activity, Zap, Layers, Share2, Save,
  Plus, Trash2, FastForward, Rewind, Waves, Headphones, Cpu
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface Track {
  id: string;
  name: string;
  category: 'drums' | 'bass' | 'lead' | 'synth' | 'fx' | 'ethnic';
  color: string;
  freq: number;
  type: OscillatorType;
  steps: boolean[];
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  filterCutoff: number;
  decay: number;
}

const DEFAULT_STEPS = 16;

const PRESETS: { [key: string]: { bpm: number; tracks: Partial<Track>[] } } = {
  'Cyberpunk 2077': {
    bpm: 130,
    tracks: [
      { id: '1', name: 'Sub-Zero 808', category: 'bass', color: '#ef4444', freq: 55, type: 'sawtooth', steps: [true, false, false, false, true, false, false, true, false, false, true, false, false, false, true, false], volume: 0.9, decay: 0.4, filterCutoff: 350 },
      { id: '2', name: 'Cyber Kick', category: 'drums', color: '#f97316', freq: 120, type: 'sine', steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], volume: 1.0, decay: 0.2, filterCutoff: 2000 },
      { id: '3', name: 'Neon Snare', category: 'drums', color: '#eab308', freq: 280, type: 'triangle', steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], volume: 0.85, decay: 0.15, filterCutoff: 3000 },
      { id: '4', name: 'Laser Hi-Hat', category: 'drums', color: '#06b6d4', freq: 3500, type: 'square', steps: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], volume: 0.4, decay: 0.05, filterCutoff: 8000 },
      { id: '5', name: 'Tachyon Arp', category: 'synth', color: '#8b5cf6', freq: 440, type: 'sawtooth', steps: [true, false, true, false, true, false, true, true, false, true, true, false, true, false, true, false], volume: 0.6, decay: 0.1, filterCutoff: 1800 },
      { id: '6', name: 'Glitch Drone', category: 'fx', color: '#ec4899', freq: 110, type: 'sawtooth', steps: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false], volume: 0.5, decay: 0.8, filterCutoff: 900 },
    ]
  },
  'Desi Cyber Drill': {
    bpm: 140,
    tracks: [
      { id: '1', name: 'Dholak Bass Boom', category: 'ethnic', color: '#f59e0b', freq: 65, type: 'sine', steps: [true, false, false, true, false, false, true, false, false, false, true, false, false, true, false, false], volume: 1.0, decay: 0.35, filterCutoff: 500 },
      { id: '2', name: 'Drill Snare Slide', category: 'drums', color: '#ef4444', freq: 320, type: 'triangle', steps: [false, false, false, false, false, false, false, false, true, false, false, false, false, false, false, true], volume: 0.9, decay: 0.18, filterCutoff: 4000 },
      { id: '3', name: 'Tabla Tinke Triplets', category: 'ethnic', color: '#10b981', freq: 1400, type: 'sine', steps: [true, true, true, false, true, true, false, true, true, true, false, true, true, false, true, true], volume: 0.65, decay: 0.08, filterCutoff: 5000 },
      { id: '4', name: 'Sarangi Phrygian Lead', category: 'ethnic', color: '#ec4899', freq: 587.33, type: 'sawtooth', steps: [true, false, false, true, false, true, false, false, true, false, true, false, false, true, true, false], volume: 0.75, decay: 0.3, filterCutoff: 2200 },
      { id: '5', name: 'Glide 808 Sub', category: 'bass', color: '#6366f1', freq: 43.65, type: 'sine', steps: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, true, false], volume: 0.95, decay: 0.5, filterCutoff: 250 },
      { id: '6', name: 'Chai Shaker', category: 'drums', color: '#14b8a6', freq: 4200, type: 'square', steps: [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true], volume: 0.35, decay: 0.04, filterCutoff: 7500 },
    ]
  },
  'Neo-Tokyo Synthwave': {
    bpm: 118,
    tracks: [
      { id: '1', name: 'Retro Gate Kick', category: 'drums', color: '#3b82f6', freq: 100, type: 'sine', steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], volume: 1.0, decay: 0.25, filterCutoff: 1500 },
      { id: '2', name: 'Analog Clack Snare', category: 'drums', color: '#ec4899', freq: 240, type: 'triangle', steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], volume: 0.85, decay: 0.2, filterCutoff: 3500 },
      { id: '3', name: 'Running 16th Bass', category: 'bass', color: '#8b5cf6', freq: 82.41, type: 'sawtooth', steps: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], volume: 0.75, decay: 0.08, filterCutoff: 900 },
      { id: '4', name: 'Dream Chime Lead', category: 'synth', color: '#06b6d4', freq: 659.25, type: 'sine', steps: [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, true], volume: 0.7, decay: 0.4, filterCutoff: 4000 },
      { id: '5', name: 'Warm Poly Pad', category: 'synth', color: '#10b981', freq: 329.63, type: 'triangle', steps: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false], volume: 0.6, decay: 1.2, filterCutoff: 1200 },
      { id: '6', name: 'Overdrive White Noise', category: 'fx', color: '#f43f5e', freq: 2800, type: 'square', steps: [false, false, false, false, false, false, false, true, false, false, false, false, false, false, true, false], volume: 0.3, decay: 0.15, filterCutoff: 6000 },
    ]
  }
};

const INITIAL_TRACKS: Track[] = PRESETS['Cyberpunk 2077'].tracks.map((t, idx) => ({
  id: t.id || `track-${idx}`,
  name: t.name || `Track ${idx + 1}`,
  category: t.category || 'synth',
  color: t.color || '#06b6d4',
  freq: t.freq || 440,
  type: t.type || 'sine',
  steps: t.steps || Array(DEFAULT_STEPS).fill(false),
  volume: t.volume ?? 0.8,
  pan: t.pan ?? 0,
  muted: false,
  solo: false,
  filterCutoff: t.filterCutoff ?? 2000,
  decay: t.decay ?? 0.2,
}));

export default function CyberDAW() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(130);
  const [swing, setSwing] = useState(0);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [activePreset, setActivePreset] = useState('Cyberpunk 2077');
  const [selectedTrackId, setSelectedTrackId] = useState<string>(INITIAL_TRACKS[0].id);
  const [isRecording, setIsRecording] = useState(false);
  const [reverbMix, setReverbMix] = useState(0.25);
  const [delayMix, setDelayMix] = useState(0.2);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<number | null>(null);

  // Initialize Web Audio graph
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = masterVolume;
      master.connect(ctx.destination);

      audioCtxRef.current = ctx;
      masterGainRef.current = master;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, [masterVolume]);

  // Master volume change
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterVolume;
    }
  }, [masterVolume]);

  // Play a single note for a track
  const triggerNote = useCallback((track: Track, time: number) => {
    if (!audioCtxRef.current || !masterGainRef.current) return;
    const ctx = audioCtxRef.current;

    // Check Solo / Mute state
    const anySolo = tracks.some(t => t.solo);
    if (track.muted || (anySolo && !track.solo)) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    osc.type = track.type;
    osc.frequency.setValueAtTime(track.freq, time);

    // Dynamic pitch bend for 808s and kicks
    if (track.category === 'drums' && track.freq < 150) {
      osc.frequency.exponentialRampToValueAtTime(30, time + track.decay);
    }

    // Filter setup
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(track.filterCutoff, time);

    // Envelope
    const attack = 0.005;
    const decay = track.decay;
    const peakVol = track.volume * 0.4;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peakVol, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);

    // Routing
    osc.connect(filter);
    filter.connect(gain);

    if (panNode) {
      panNode.pan.value = track.pan;
      gain.connect(panNode);
      panNode.connect(masterGainRef.current);
    } else {
      gain.connect(masterGainRef.current);
    }

    osc.start(time);
    osc.stop(time + attack + decay + 0.05);
  }, [tracks]);

  // Step Sequencer Clock
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }

    initAudio();
    const stepDurationMs = (60 / bpm / 4) * 1000;

    const interval = window.setInterval(() => {
      setCurrentStep((prev) => {
        const nextStep = (prev + 1) % DEFAULT_STEPS;
        const now = audioCtxRef.current?.currentTime || 0;

        tracks.forEach((track) => {
          if (track.steps[nextStep]) {
            triggerNote(track, now);
          }
        });

        return nextStep;
      });
    }, stepDurationMs);

    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [isPlaying, bpm, tracks, triggerNote, initAudio]);

  const toggleStep = (trackIndex: number, stepIndex: number) => {
    uiaudio.hover();
    setTracks((prev) => {
      const copy = [...prev];
      const targetTrack = { ...copy[trackIndex] };
      const newSteps = [...targetTrack.steps];
      newSteps[stepIndex] = !newSteps[stepIndex];
      targetTrack.steps = newSteps;
      copy[trackIndex] = targetTrack;
      return copy;
    });
  };

  const handlePlayPause = () => {
    initAudio();
    if (!isPlaying) {
      uiaudio.warp();
      setIsPlaying(true);
    } else {
      uiaudio.click();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    uiaudio.click();
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const handleClear = () => {
    uiaudio.error();
    setTracks(prev => prev.map(t => ({ ...t, steps: Array(DEFAULT_STEPS).fill(false) })));
  };

  const loadPreset = (presetName: string) => {
    uiaudio.success();
    setActivePreset(presetName);
    const preset = PRESETS[presetName];
    if (!preset) return;
    setBpm(preset.bpm);
    setTracks(preset.tracks.map((t, idx) => ({
      id: t.id || `track-${idx}`,
      name: t.name || `Track ${idx + 1}`,
      category: t.category || 'synth',
      color: t.color || '#06b6d4',
      freq: t.freq || 440,
      type: t.type || 'sine',
      steps: t.steps || Array(DEFAULT_STEPS).fill(false),
      volume: t.volume ?? 0.8,
      pan: t.pan ?? 0,
      muted: false,
      solo: false,
      filterCutoff: t.filterCutoff ?? 2000,
      decay: t.decay ?? 0.2,
    })));
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || tracks[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* Top Header & Cyber HUD */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-6 rounded-2xl bg-zinc-900/60 border border-cyan-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 border border-cyan-400/40">
            <Waves className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-pink-500">
                CYBER DAW // STEM MATRIX 3000
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                DSP REALTIME V2.8
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Multi-track procedural step synthesizer & neural audio workstation for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Transport Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
          {/* Presets */}
          <div className="flex items-center space-x-1.5 bg-zinc-950/80 p-1.5 rounded-xl border border-white/10">
            <Sparkles className="w-4 h-4 text-amber-400 ml-1" />
            {Object.keys(PRESETS).map((name) => (
              <button
                key={name}
                onClick={() => loadPreset(name)}
                className={cn(
                  "px-3 py-1 text-xs rounded-lg font-medium transition-all",
                  activePreset === name 
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm" 
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                )}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Transport buttons */}
          <div className="flex items-center space-x-2 bg-zinc-950/80 p-1.5 rounded-xl border border-white/10">
            <button
              onClick={handlePlayPause}
              className={cn(
                "px-5 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all shadow-md",
                isPlaying 
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse" 
                  : "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:brightness-110 shadow-cyan-500/20"
              )}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
            <button
              onClick={handleStop}
              className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors"
              title="Stop and Reset"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 bg-zinc-800/80 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 rounded-lg transition-colors"
              title="Clear Matrix"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* BPM & Master Dial */}
          <div className="flex items-center space-x-3 bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-white/10 font-mono text-xs">
            <div className="flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-zinc-400">BPM:</span>
              <input
                type="number"
                min={60}
                max={220}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-14 bg-zinc-900 border border-white/10 rounded px-1.5 py-0.5 text-cyan-300 font-bold text-center"
              />
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center space-x-1.5">
              <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-zinc-400">VOL:</span>
              <span className="text-indigo-300 font-bold">{Math.round(masterVolume * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Sequencer & Track Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Step Matrix Sequencer (3 Columns) */}
        <div className="xl:col-span-3 space-y-3 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          {/* Step Timeline Indicator */}
          <div className="flex items-center justify-between pl-48 pr-2 pb-2 text-[10px] font-mono text-zinc-500 border-b border-white/5">
            {Array.from({ length: DEFAULT_STEPS }).map((_, step) => (
              <div 
                key={step} 
                className={cn(
                  "w-10 text-center py-0.5 rounded transition-colors",
                  currentStep === step && isPlaying ? "bg-cyan-500/20 text-cyan-300 font-bold scale-110" : ""
                )}
              >
                {step + 1}
              </div>
            ))}
          </div>

          {/* Tracks List */}
          {tracks.map((track, trackIdx) => (
            <div 
              key={track.id}
              onClick={() => setSelectedTrackId(track.id)}
              className={cn(
                "flex items-center space-x-3 p-2 rounded-xl transition-all border",
                selectedTrackId === track.id 
                  ? "bg-zinc-800/40 border-cyan-500/30 shadow-lg" 
                  : "bg-zinc-950/40 border-white/5 hover:border-white/10"
              )}
            >
              {/* Track Left Controls */}
              <div className="w-44 flex items-center justify-between pr-2 border-r border-white/10">
                <div className="flex items-center space-x-2 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: track.color }} 
                  />
                  <div className="truncate">
                    <p className="text-xs font-bold text-white truncate">{track.name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono uppercase">{track.category}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {/* Mute */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t));
                    }}
                    className={cn(
                      "p-1 rounded text-[10px] font-bold font-mono transition-colors",
                      track.muted ? "bg-red-500/30 text-red-300 border border-red-500/50" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    M
                  </button>
                  {/* Solo */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTracks(prev => prev.map(t => t.id === track.id ? { ...t, solo: !t.solo } : t));
                    }}
                    className={cn(
                      "p-1 rounded text-[10px] font-bold font-mono transition-colors",
                      track.solo ? "bg-amber-500/30 text-amber-300 border border-amber-500/50" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    S
                  </button>
                </div>
              </div>

              {/* Step Triggers */}
              <div className="flex-1 flex items-center justify-between gap-1.5">
                {track.steps.map((isActive, stepIdx) => {
                  const isCurrent = currentStep === stepIdx && isPlaying;
                  const isBeat = stepIdx % 4 === 0;

                  return (
                    <button
                      key={stepIdx}
                      onClick={() => toggleStep(trackIdx, stepIdx)}
                      className={cn(
                        "h-11 flex-1 rounded-lg transition-all border flex items-center justify-center relative group",
                        isActive 
                          ? "shadow-md" 
                          : isBeat ? "bg-zinc-900/80 border-white/10" : "bg-zinc-950/60 border-white/5",
                        isCurrent && "ring-2 ring-cyan-400 ring-offset-1 ring-offset-zinc-950"
                      )}
                      style={{
                        backgroundColor: isActive ? track.color : undefined,
                        borderColor: isActive ? `${track.color}aa` : undefined,
                      }}
                    >
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                      )}
                      {isCurrent && (
                        <div className="absolute inset-0 bg-white/20 rounded-lg animate-ping pointer-events-none" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Track Synthesizer & DSP Inspector (1 Column) */}
        <div className="space-y-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-xl">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-3">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-200">
              DSP SYNTH INSPECTOR
            </h3>
          </div>

          {selectedTrack && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-400">Selected Node</span>
                  <span className="font-bold text-cyan-400">{selectedTrack.name}</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl border border-white/10 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 font-mono">Waveform:</span>
                  <div className="flex space-x-1">
                    {(['sine', 'square', 'sawtooth', 'triangle'] as OscillatorType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          uiaudio.hover();
                          setTracks(prev => prev.map(t => t.id === selectedTrack.id ? { ...t, type } : t));
                        }}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] uppercase font-mono transition-colors",
                          selectedTrack.type === type 
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40" 
                            : "text-zinc-500 hover:text-white"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Frequency Tuning */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Base Pitch (Hz)</span>
                  <span className="font-mono text-cyan-400 font-bold">{Math.round(selectedTrack.freq)} Hz</span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={4000}
                  value={selectedTrack.freq}
                  onChange={(e) => {
                    const freq = Number(e.target.value);
                    setTracks(prev => prev.map(t => t.id === selectedTrack.id ? { ...t, freq } : t));
                  }}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Filter Cutoff */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Lowpass Cutoff</span>
                  <span className="font-mono text-indigo-400 font-bold">{Math.round(selectedTrack.filterCutoff)} Hz</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={12000}
                  value={selectedTrack.filterCutoff}
                  onChange={(e) => {
                    const filterCutoff = Number(e.target.value);
                    setTracks(prev => prev.map(t => t.id === selectedTrack.id ? { ...t, filterCutoff } : t));
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Decay Time */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Decay Time</span>
                  <span className="font-mono text-pink-400 font-bold">{selectedTrack.decay.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min={0.02}
                  max={1.5}
                  step={0.01}
                  value={selectedTrack.decay}
                  onChange={(e) => {
                    const decay = Number(e.target.value);
                    setTracks(prev => prev.map(t => t.id === selectedTrack.id ? { ...t, decay } : t));
                  }}
                  className="w-full accent-pink-500 cursor-pointer"
                />
              </div>

              {/* Gain Volume */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Track Gain</span>
                  <span className="font-mono text-amber-400 font-bold">{Math.round(selectedTrack.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={selectedTrack.volume}
                  onChange={(e) => {
                    const volume = Number(e.target.value);
                    setTracks(prev => prev.map(t => t.id === selectedTrack.id ? { ...t, volume } : t));
                  }}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Quick Audition Button */}
              <button
                onClick={() => {
                  initAudio();
                  triggerNote(selectedTrack, audioCtxRef.current?.currentTime || 0);
                }}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center justify-center space-x-2 border border-white/10 transition-colors shadow-sm"
              >
                <Headphones className="w-4 h-4 text-cyan-400" />
                <span>AUDITION STEM SOUND</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
