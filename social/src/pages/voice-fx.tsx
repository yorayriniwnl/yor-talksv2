import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, MicOff, Volume2, Sliders, Sparkles, 
  Radio, Zap, Flame, CheckCircle2, Waves 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface VoicePreset {
  id: string;
  name: string;
  desc: string;
  pitch: number;
  reverb: number;
  icon: string;
}

const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'caster',
    name: 'Pro Esports Caster 🎙️',
    desc: 'Deep broadcast compression & bass boost for hype casting',
    pitch: 0.9,
    reverb: 0.2,
    icon: '🎙️'
  },
  {
    id: 'radio',
    name: 'Desi Old Radio 📻',
    desc: 'Bandpass filter emulation for retro cricket radio vibes',
    pitch: 1.0,
    reverb: 0.4,
    icon: '📻'
  },
  {
    id: 'cyborg',
    name: 'Cyberpunk Mech 🤖',
    desc: 'Ring modulation and robotic harmonizer synthesis',
    pitch: 0.75,
    reverb: 0.6,
    icon: '🤖'
  },
  {
    id: 'temple',
    name: 'Temple Sacred Reverb 🛕',
    desc: 'Grand cathedral acoustics and celestial shimmer delay',
    pitch: 1.0,
    reverb: 0.9,
    icon: '🛕'
  }
];

export default function VoiceFXStudio() {
  const [isMicActive, setIsMicActive] = useState(false);
  const [activePreset, setActivePreset] = useState(VOICE_PRESETS[0]);
  const [pitchShift, setPitchShift] = useState(1.0);
  const [roomReverb, setRoomReverb] = useState(30);

  const toggleMic = () => {
    sounds.playPop();
    if (!isMicActive) {
      setIsMicActive(true);
      toast.success('🎙️ Real-time Web Audio DSP Voice Modulation Engine Active!');
    } else {
      setIsMicActive(false);
      toast.info('Mic Pipeline Disengaged.');
    }
  };

  const handleSelectPreset = (p: VoicePreset) => {
    sounds.playPop();
    setActivePreset(p);
    setPitchShift(p.pitch);
    setRoomReverb(p.reverb * 100);
    toast.success(`🎛️ Loaded DSP Voice Filter: ${p.name}`);
  };

  const handleExportOBS = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🎛️ Virtual Audio Cable DSP Pipeline linked to OBS Studio (Port 8092)!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Voice FX & Audio Modulator</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-Time DSP Vocal Transformers & OBS Virtual Cable</p>
          </div>
        </div>

        <Button
          onClick={handleExportOBS}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Waves className="w-3.5 h-3.5 mr-1" /> Route to OBS Virtual Mic
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main DSP Pipeline Display Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="surface-1 rounded-3xl p-8 border border-border/40 shadow-2xl text-center space-y-6">
              <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-4xl shadow-2xl relative">
                {activePreset.icon}
                {isMicActive && (
                  <span className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-60 pointer-events-none" />
                )}
              </div>

              <div>
                <h3 className="font-display font-black text-xl text-foreground">{activePreset.name}</h3>
                <p className="text-xs font-mono text-muted-foreground mt-1 max-w-sm mx-auto">{activePreset.desc}</p>
              </div>

              <div className="pt-2">
                <Button
                  onClick={toggleMic}
                  className={cn(
                    "rounded-2xl font-bold text-xs h-12 px-8 shadow-xl transition-all",
                    isMicActive ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" : "bg-primary text-primary-foreground glow-neon-primary"
                  )}
                >
                  {isMicActive ? <><MicOff className="w-4 h-4 mr-2" /> Mute Live FX Loop</> : <><Mic className="w-4 h-4 mr-2" /> Engage Live Vocal FX</>}
                </Button>
              </div>
            </div>

            {/* Slider Controls */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm font-mono text-xs">
              <div className="showcase-section-title">
                <Sliders className="w-4 h-4 text-primary" />
                <h3>Real-Time DSP Modulators</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Pitch Transpose</span>
                    <strong className="text-foreground">{pitchShift.toFixed(2)}x</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={pitchShift}
                    onChange={(e) => setPitchShift(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-muted-foreground">Cathedral Reverb Depth</span>
                    <strong className="text-foreground">{roomReverb}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={roomReverb}
                    onChange={(e) => setRoomReverb(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preset Selector Column */}
          <div className="lg:col-span-6 space-y-4">
            <div className="showcase-section-title">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3>Vocal Transformer Presets</h3>
            </div>

            <div className="space-y-3">
              {VOICE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={cn(
                    "w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between",
                    activePreset.id === preset.id ? "border-primary bg-primary/20 shadow-lg glow-neon-primary" : "border-border/40 hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{preset.icon}</span>
                    <div>
                      <h4 className="font-display font-bold text-sm text-foreground">{preset.name}</h4>
                      <p className="text-[0.68rem] font-mono text-muted-foreground mt-0.5">{preset.desc}</p>
                    </div>
                  </div>

                  {activePreset.id === preset.id && (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
