import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Sliders, Wand2, Sparkles, Mic, Radio, Volume2, 
  Settings, CheckCircle2, Copy, BarChart3, IndianRupee, Zap, Eye, Play 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

const SHADER_FILTERS = [
  { id: 'f-normal', name: 'Original Raw', css: 'none', desc: 'Natural sensor feed' },
  { id: 'f-cyber', name: 'Bengaluru Cyberpunk', css: 'hue-rotate(180deg) saturate(1.8) contrast(1.2)', desc: 'Neon cyan & magenta tint' },
  { id: 'f-sunset', name: 'Mumbai Sunset', css: 'sepia(0.5) saturate(2) hue-rotate(-20deg)', desc: 'Warm golden hour warmth' },
  { id: 'f-retro', name: 'VHS Bollywood 90s', css: 'contrast(1.4) saturate(1.4) brightness(1.1)', desc: 'Cinematic analog grain' },
  { id: 'f-noir', name: 'Desi Noir', css: 'grayscale(1) contrast(1.6)', desc: 'High drama monochrome' },
];

export default function Studio() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'broadcast' | 'vfx' | 'ai'>('broadcast');
  const [selectedFilter, setSelectedFilter] = useState(SHADER_FILTERS[0]);
  
  // Audio Mixer State
  const [micVolume, setMicVolume] = useState(85);
  const [bgmVolume, setBgmVolume] = useState(40);
  const [bitrate, setBitrate] = useState(6200);

  // AI Hook Generator
  const [aiTopic, setAiTopic] = useState('');
  const [generatedHooks, setGeneratedHooks] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerateHooks = () => {
    if (!aiTopic.trim()) return;
    setGenerating(true);
    sounds.playPop();

    setTimeout(() => {
      setGeneratedHooks([
        `🔥 "If you're building tech in India in 2026, you cannot ignore this spatial UI trend..."`,
        `🚀 "How we scaled our gaming squad to Rank #1 Conqueror in South Asia with 0 latency."`,
        `💡 "The secret shader math behind high-performance WebGL reels you see on Yor Talks."`,
      ]);
      setGenerating(false);
      toast.info('Generated 3 local hook drafts. Connect an AI provider to generate production copy.');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-primary text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">YOR Creator Studio Pro</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Live control handoff, VFX canvas & hook drafting</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setLocation('/live')}
            className="rounded-2xl font-bold text-xs px-6 h-10 shadow-lg glow-neon-primary bg-primary text-primary-foreground"
          >
            <Radio className="w-4 h-4 mr-1.5" /> Open Live Control
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1.5 rounded-2xl surface-1 border border-border/40 w-fit">
          <Button
            size="sm"
            variant={activeTab === 'broadcast' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('broadcast')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'broadcast' && "bg-primary text-primary-foreground shadow-md")}
          >
            <Radio className="w-3.5 h-3.5 mr-1.5" /> Broadcast Stage & Telemetry
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'vfx' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('vfx')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'vfx' && "bg-primary text-primary-foreground shadow-md")}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> WebGL Shader VFX Studio
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'ai' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('ai')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'ai' && "bg-amber-600 text-white shadow-md")}
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI Viral Hook & Script Engine
          </Button>
        </div>

        {activeTab === 'broadcast' && (
          /* Live Broadcast Stage & Audio Mixer */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Stage View */}
            <div className="lg:col-span-8 space-y-4">
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-border/40 shadow-2xl group">
                <img
                  src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"
                  alt="Broadcast Stage"
                  className="w-full h-full object-cover transition-transform duration-700"
                  style={{ filter: selectedFilter.css }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Live Overlays */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold shadow-lg border bg-black/60 text-zinc-400 border-white/10">
                    PREVIEW MODE
                  </span>
                  <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-mono border border-white/10">
                    Filter: {selectedFilter.name}
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                  <div className="text-white font-mono text-xs">
                    <div>Bitrate: <strong className="text-emerald-400">{bitrate} kbps</strong> (1080p 60fps)</div>
                    <div className="text-zinc-400 text-[0.65rem]">Audio Sample: 48kHz Stereo</div>
                  </div>
                </div>
              </div>

              {/* Creator Analytics Quick Strip */}
              <div className="grid grid-cols-3 gap-4">
                <div className="surface-1 p-4 rounded-2xl border border-border/40">
                  <div className="text-[0.62rem] font-mono text-muted-foreground uppercase">Superchats</div>
                  <div className="font-display font-extrabold text-xl text-muted-foreground">Not connected</div>
                </div>
                <div className="surface-1 p-4 rounded-2xl border border-border/40">
                  <div className="text-[0.62rem] font-mono text-muted-foreground uppercase">Peak viewers</div>
                  <div className="font-display font-extrabold text-xl text-muted-foreground">Use Live room</div>
                </div>
                <div className="surface-1 p-4 rounded-2xl border border-border/40">
                  <div className="text-[0.62rem] font-mono text-muted-foreground uppercase">Karma drops</div>
                  <div className="font-display font-extrabold text-xl text-muted-foreground">Ledger pending</div>
                </div>
              </div>
            </div>

            {/* Audio Mixer & Stream Settings */}
            <div className="lg:col-span-4 space-y-6">
              <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-6">
                <div className="showcase-section-title">
                  <Sliders className="w-4 h-4 text-primary" />
                  <h3>Studio Audio Mixer</h3>
                </div>

                {/* Mic Volume Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-1.5 font-bold"><Mic className="w-3.5 h-3.5 text-primary" /> Microphone Input</span>
                    <span className="text-primary font-bold">{micVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={micVolume}
                    onChange={(e) => setMicVolume(Number(e.target.value))}
                    className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                  />
                </div>

                {/* BGM Volume Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-1.5 font-bold"><Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Background Music (BGM)</span>
                    <span className="text-cyan-400 font-bold">{bgmVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume(Number(e.target.value))}
                    className="w-full accent-cyan-400 h-2 bg-muted rounded-lg cursor-pointer"
                  />
                </div>

                {/* Stream Bitrate Config */}
                <div className="space-y-2 pt-4 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-foreground">Target Encoding Bitrate</span>
                    <span className="text-emerald-400 font-bold">{bitrate} kbps</span>
                  </div>
                  <select
                    value={bitrate}
                    onChange={(e) => setBitrate(Number(e.target.value))}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-xs font-medium"
                  >
                    <option value={8000}>8000 kbps (4K Ultra / Fast Fiber)</option>
                    <option value={6200}>6200 kbps (1080p60 Pro Recommended)</option>
                    <option value={4500}>4500 kbps (1080p30 Standard)</option>
                    <option value={3000}>3000 kbps (720p60 Low Bandwidth)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vfx' && (
          /* WebGL Shader VFX Studio */
          <div className="space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40">
              <div className="showcase-section-title mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3>Cinematic Shader Presets for Reels & Live Video</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-6">Select real-time hardware accelerated GPU filters designed for Indian lighting and creator aesthetics.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {SHADER_FILTERS.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedFilter(f);
                    }}
                    className={cn(
                      "p-4 rounded-3xl border text-left cursor-pointer transition-all duration-300 flex flex-col justify-between group",
                      selectedFilter.id === f.id ? "border-primary bg-primary/10 shadow-lg" : "surface-1 border-border/40 hover:border-border"
                    )}
                  >
                    <div className="h-36 rounded-2xl overflow-hidden mb-3 relative bg-black">
                      <img
                        src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop"
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        style={{ filter: f.css }}
                      />
                      {selectedFilter.id === f.id && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-mono text-[0.62rem] font-bold">
                          Active Preset
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-display font-bold text-sm text-foreground">{f.name}</h4>
                      <p className="text-xs text-muted-foreground font-serif mt-1">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          /* AI Viral Hook & Script Engine */
          <div className="space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm max-w-3xl mx-auto space-y-6">
              <div className="showcase-section-title">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <h3>AI Viral Video Script & Hook Concierge</h3>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase text-muted-foreground">What is your reel or post about?</Label>
                <Input
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="e.g. 5 essential WebGL shaders for Indian UI designers or BGMI 1v4 clutch tips"
                  className="rounded-2xl h-12 text-sm"
                />
              </div>

              <Button
                onClick={handleGenerateHooks}
                disabled={generating || !aiTopic.trim()}
                className="w-full rounded-2xl font-bold text-xs h-12 glow-neon-primary bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                {generating ? 'Synthesizing Viral Hooks…' : 'Generate High-Retention Hooks'}
              </Button>

              {generatedHooks.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <h4 className="font-display font-bold text-xs uppercase text-muted-foreground">Generated Hooks:</h4>
                  {generatedHooks.map((hook, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-muted/40 border border-border/40 flex items-start justify-between gap-3">
                      <p className="text-xs font-serif text-foreground/90 leading-relaxed flex-1">{hook}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(hook);
                          sounds.playPop();
                          toast.success('Hook copied to clipboard!');
                        }}
                        className="rounded-xl h-8 px-2.5 text-xs text-primary hover:bg-primary/10 shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
