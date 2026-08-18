import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, Play, Pause, RotateCcw, Zap, 
  Volume2, Sparkles, Disc, Radio, Sliders
} from 'lucide-react';
import { uiaudio } from '@/lib/audioEngine';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const CHANNELS = ['PULSE 1 (LEAD)', 'PULSE 2 (CHORD)', 'WAVE (BASS)', 'NOISE (DRUMS)'];
const NOTES_MAP = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

export default function ChiptuneTracker() {
  const currentUser = useAppStore((state) => state.currentUser);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(135);

  const [pattern, setPattern] = useState<boolean[][]>([
    [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
    [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
    [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, true],
  ]);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
  };

  const playChiptuneTone = (chIdx: number) => {
    initAudio();
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (chIdx === 0) {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
    } else if (chIdx === 1) {
      osc.type = 'square';
      osc.frequency.setValueAtTime(330, now);
    } else if (chIdx === 2) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
    } else {
      // Noise
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1800, now);
    }

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  };

  // Step Sequencer Timer
  useEffect(() => {
    if (!isPlaying) return;

    const stepIntervalMs = (60 / bpm / 4) * 1000;
    const interval = window.setInterval(() => {
      setCurrentStep(s => {
        const next = (s + 1) % 16;
        // Trigger active channel sounds
        pattern.forEach((ch, chIdx) => {
          if (ch[next]) playChiptuneTone(chIdx);
        });
        return next;
      });
    }, stepIntervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, bpm, pattern]);

  const toggleCell = (chIdx: number, stepIdx: number) => {
    uiaudio.click();
    setPattern(prev => prev.map((row, r) => 
      r === chIdx ? row.map((cell, c) => c === stepIdx ? !cell : cell) : row
    ));
  };

  const togglePlayback = () => {
    if (!isPlaying) {
      uiaudio.warp();
      setIsPlaying(true);
    } else {
      uiaudio.click();
      setIsPlaying(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-4xl flex items-center justify-between p-6 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.1)]">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 border border-emerald-400/40">
            <Music className="w-8 h-8 text-white animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              CHIPTUNE TRACKER // 8-BIT GAMEBOY DSP
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              4-channel DMG sound chip emulator & 16-step matrix tracker for {currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center space-x-3 font-mono text-xs">
          <button
            onClick={togglePlayback}
            className={cn(
              "px-6 py-3 rounded-xl font-bold shadow-lg transition-all flex items-center space-x-2",
              isPlaying 
                ? "bg-amber-500 text-black shadow-amber-500/30 animate-pulse" 
                : "bg-gradient-to-r from-emerald-500 to-teal-600 text-black hover:brightness-110"
            )}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-black" />}
            <span>{isPlaying ? 'STOP TRACKER' : 'PLAY 8-BIT PATTERN'}</span>
          </button>
        </div>
      </div>

      {/* 16-Step 4-Channel Matrix Grid */}
      <div className="w-full max-w-4xl bg-zinc-900/60 p-6 rounded-2xl border border-white/10 shadow-2xl space-y-4 font-mono text-xs">
        {CHANNELS.map((chName, chIdx) => (
          <div key={chIdx} className="space-y-1.5">
            <div className="text-[11px] text-zinc-400 font-bold">{chName}</div>
            <div className="grid grid-cols-16 gap-1">
              {pattern[chIdx].map((active, stepIdx) => {
                const isCurrent = isPlaying && currentStep === stepIdx;

                return (
                  <button
                    key={stepIdx}
                    onClick={() => toggleCell(chIdx, stepIdx)}
                    className={cn(
                      "h-12 rounded-lg border font-black text-[10px] transition-all flex items-center justify-center",
                      active ? "bg-emerald-500 text-black border-emerald-400 shadow-md" : "bg-zinc-950 text-zinc-600 border-white/5",
                      isCurrent && "border-white ring-2 ring-cyan-400 scale-105"
                    )}
                  >
                    {active ? '●' : '·'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
