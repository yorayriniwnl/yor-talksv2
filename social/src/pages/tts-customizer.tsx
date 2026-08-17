import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, Sparkles, Copy, Sliders, 
  Send, Tv, Mic, Heart, Shield, Play, CheckCircle2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface VoiceProfile {
  id: string;
  name: string;
  accent: string;
  sample: string;
}

const VOICES: VoiceProfile[] = [
  { id: 'v-1', name: 'Desi Bhai Voice', accent: 'Bambaiya Hinglish', sample: 'Arre bhai kya clutch mara! Respect +100! 🔥' },
  { id: 'v-2', name: 'Dholak Uncle Voice', accent: 'Delhi Punjabi Style', sample: 'Chak de phattey! Superchat aagayi oye! 🥁' },
  { id: 'v-3', name: 'Cyber Indic AI', accent: 'Futuristic Robotic Hindi', sample: 'Squad detected at 240 degrees. Initiating drone scan. 🤖' },
  { id: 'v-4', name: 'Bollywood Hero', accent: 'Dramatic Shahi Hindi', sample: 'Picture abhi baaki hai mere dost! Top donation! 👑' },
];

export default function TTSCustomizerStudio() {
  const [voices, setVoices] = useState<VoiceProfile[]>(VOICES);
  const [activeVoice, setActiveVoice] = useState<string>('v-1');

  const handleTestVoice = (sample: string) => {
    sounds.playPop();
    toast.info(`🔊 Synthesizing TTS Voice: "${sample}"`);
  };

  const handleCopyBrowserSource = () => {
    sounds.playChime();
    triggerConfetti();
    navigator.clipboard.writeText(`https://yor-talks.in/embed/tts-alert?voice=${activeVoice}&volume=0.9`);
    toast.success('📋 OBS Studio Transparent Hinglish TTS Alert URL copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Hinglish TTS Voice Alert Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-Time Indian Accent Synthesis, Anti-Spam Filtering & OBS Transparent Ingest</p>
          </div>
        </div>

        <Button
          onClick={handleCopyBrowserSource}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS TTS URL
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Voice Selector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
          {voices.map((v) => {
            const isSelected = activeVoice === v.id;
            return (
              <div
                key={v.id}
                className={cn(
                  "surface-1 p-6 rounded-3xl border flex flex-col justify-between shadow-xl space-y-4 transition-all",
                  isSelected ? "border-primary bg-primary/5 shadow-primary/20" : "border-border/40"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-mono font-bold text-[0.65rem]">
                      {v.accent}
                    </span>
                    {isSelected && (
                      <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE VOICE
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-black text-lg text-foreground">{v.name}</h3>
                  <p className="text-xs font-mono text-muted-foreground italic">"{v.sample}"</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestVoice(v.sample)}
                    className="flex-1 rounded-xl text-xs font-mono h-9"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Test Audio
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      sounds.playPop();
                      setActiveVoice(v.id);
                      toast.success(`Active TTS Voice set to ${v.name}!`);
                    }}
                    className={cn(
                      "flex-1 rounded-xl text-xs font-mono h-9 font-bold",
                      isSelected ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
                    )}
                  >
                    {isSelected ? 'Selected' : 'Select Voice'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
