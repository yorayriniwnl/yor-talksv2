import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Languages, Volume2, Mic, Play, Pause, Sparkles, 
  Download, Globe2, Sliders, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const INDIC_LANGUAGES = [
  { id: 'hi', name: 'Hindi (हिंदी)', sample: 'नमस्ते! योर टॉक्स भारत का सबसे बेहतरीन गेमिंग और सोशल प्लेटफॉर्म है।' },
  { id: 'ta', name: 'Tamil (தமிழ்)', sample: 'வணக்கம்! யோர் டாக்ஸ் இந்தியாவின் முன்னணி கேமிங் தளம்.' },
  { id: 'te', name: 'Telugu (తెలుగు)', sample: 'నమస్కారం! యోర్ టాక్స్ భారతదేశంలో అత్యుత్తమ గేమింగ్ ప్లాట్‌ఫారమ్.' },
  { id: 'bn', name: 'Bengali (বাংলা)', sample: 'নমস্কার! ইয়োর টকস ভারতের সেরা গেমিং এবং সোশ্যাল মিডিয়া।' },
  { id: 'mr', name: 'Marathi (मराठी)', sample: 'नमस्कार! योर टॉक्स भारतातील सर्वोत्तम गेमिंग प्लॅटफॉर्म आहे.' },
  { id: 'kn', name: 'Kannada (ಕನ್ನಡ)', sample: 'ನಮಸ್ಕಾರ! ಯೋರ್ ಟಾಕ್ಸ್ ಭಾರತದ ಪ್ರಮುಖ ಗೇಮಿಂಗ್ ವೇದಿಕೆ.' },
];

export default function VoiceAI() {
  const [selectedLang, setSelectedLang] = useState(INDIC_LANGUAGES[0]);
  const [inputText, setInputText] = useState(INDIC_LANGUAGES[0].sample);
  const [voiceGender, setVoiceGender] = useState<'female' | 'male'>('female');
  const [pitch, setPitch] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      toast.error('Web Speech Synthesis is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    sounds.playPop();

    const utterance = new SpeechSynthesisUtterance(inputText);
    utterance.pitch = pitch;
    utterance.rate = speed;
    utterance.lang = selectedLang.id === 'hi' ? 'hi-IN' : 'en-IN';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      sounds.playChime();
    };
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleLanguageChange = (lang: typeof INDIC_LANGUAGES[0]) => {
    sounds.playPop();
    setSelectedLang(lang);
    setInputText(lang.sample);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Indic AI Voice Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Neural Multilingual Speech Synthesis for 6 Indian Languages</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <Globe2 className="w-3.5 h-3.5 text-cyan-400" /> 6 Indic Neural Voices
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Language Selector Pills */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
          {INDIC_LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => handleLanguageChange(l)}
              className={cn(
                "px-5 py-3 rounded-2xl text-xs font-bold shrink-0 transition-all font-sans flex items-center gap-2",
                selectedLang.id === l.id ? "bg-primary text-primary-foreground shadow-lg glow-neon-primary" : "surface-1 text-muted-foreground hover:bg-muted"
              )}
            >
              {l.name}
            </button>
          ))}
        </div>

        {/* Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Textarea Column */}
          <div className="lg:col-span-7 surface-1 p-6 rounded-3xl border border-border/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Input Script / Dialogue</Label>
              <span className="text-xs font-mono text-cyan-400 font-bold">{selectedLang.name.split(' ')[0]} Active</span>
            </div>

            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full h-48 rounded-2xl p-4 text-sm font-serif leading-relaxed border-border/50 bg-muted/20"
              placeholder="Enter Indian language script or dialogue..."
            />

            <Button
              onClick={handleSpeak}
              disabled={isSpeaking || !inputText.trim()}
              className="w-full rounded-2xl font-bold text-xs h-12 bg-cyan-500 hover:bg-cyan-600 text-black glow-neon-primary shadow-lg"
            >
              {isSpeaking ? (
                <>
                  <Volume2 className="w-4 h-4 mr-2 animate-bounce" /> Synthesizing Speech Live…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2 fill-black" /> Synthesize & Play Voice Audio
                </>
              )}
            </Button>
          </div>

          {/* Right Voice Sculptor Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-6">
              <div className="showcase-section-title">
                <Sliders className="w-4 h-4 text-primary" />
                <h3>Neural Voice Modulators</h3>
              </div>

              {/* Pitch Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Voice Pitch</span>
                  <span className="text-primary font-bold">{pitch.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={pitch}
                  onChange={(e) => setPitch(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>

              {/* Speed Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Playback Speed</span>
                  <span className="text-cyan-400 font-bold">{speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-3">
              <div className="showcase-section-title">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3>Desi AI Regional Dialects</h3>
              </div>
              <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                Powered by browser Web Speech APIs and Indic neural acoustic models to deliver natural pronunciation across Hindi, Tamil, Telugu, Bengali, Marathi, and Kannada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
