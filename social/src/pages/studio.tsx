import { useState } from 'react';
import { useLocation } from 'wouter';
import { Video, Sliders, Wand2, Sparkles, Mic, Radio, Volume2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

const VISUAL_FILTERS = [
  { id: 'f-normal', name: 'Original', css: 'none', desc: 'No color filter' },
  { id: 'f-cyber', name: 'Neon tint', css: 'hue-rotate(180deg) saturate(1.8) contrast(1.2)', desc: 'Cyan and magenta tones' },
  { id: 'f-sunset', name: 'Mumbai Sunset', css: 'sepia(0.5) saturate(2) hue-rotate(-20deg)', desc: 'Warm golden tones' },
  { id: 'f-retro', name: 'Retro color', css: 'contrast(1.4) saturate(1.4) brightness(1.1)', desc: 'Higher contrast and saturation' },
  { id: 'f-noir', name: 'Desi Noir', css: 'grayscale(1) contrast(1.6)', desc: 'High drama monochrome' },
];

export default function Studio() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'broadcast' | 'vfx' | 'hooks'>('broadcast');
  const [selectedFilter, setSelectedFilter] = useState(VISUAL_FILTERS[0]);
  
  // Local preview values only; no audio device or stream encoder is connected.
  const [micVolume, setMicVolume] = useState(85);
  const [bgmVolume, setBgmVolume] = useState(40);
  const [bitrate, setBitrate] = useState(6200);

  // Local topic-based copy templates; this page has no AI generation endpoint.
  const [hookTopic, setHookTopic] = useState('');
  const [localHookDrafts, setLocalHookDrafts] = useState<string[]>([]);

  const createLocalHookDrafts = () => {
    const topic = hookTopic.trim().replace(/\s+/g, ' ');
    if (!topic) return;
    sounds.playPop();
    setLocalHookDrafts([
      `A quick guide to ${topic}`,
      `What I learned while exploring ${topic}`,
      `Three ideas to try with ${topic}`,
    ]);
    toast.info('Created three local hook drafts. No AI provider was used.');
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
            <h1 className="text-xl font-bold font-display text-foreground">Creator Studio Preview</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Local visual controls and draft tools; live output is not connected</p>
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
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 text-xs leading-relaxed text-muted-foreground" role="note">
          This workspace is a local preview. Audio controls and bitrate settings do not affect a live stream. Visual filters are not applied to saved media.
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl surface-1 border border-border/40 w-fit">
          <Button
            size="sm"
            variant={activeTab === 'broadcast' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('broadcast')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'broadcast' && "bg-primary text-primary-foreground shadow-md")}
          >
            <Radio className="w-3.5 h-3.5 mr-1.5" /> Broadcast preview
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'vfx' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('vfx')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'vfx' && "bg-primary text-primary-foreground shadow-md")}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Visual filter preview
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'hooks' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('hooks')}
            className={cn("rounded-xl font-bold text-xs px-5", activeTab === 'hooks' && "bg-amber-600 text-white shadow-md")}
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" /> Local hook drafts
          </Button>
        </div>

        {activeTab === 'broadcast' && (
          /* Local broadcast stage and audio control preview */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Stage View */}
            <div className="lg:col-span-8 space-y-4">
              <div className="relative aspect-video rounded-3xl overflow-hidden bg-black border border-border/40 shadow-2xl group">
                <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950" style={{ filter: selectedFilter.css }} aria-hidden="true">
                  <div className="absolute -right-12 -top-16 h-72 w-72 rounded-full bg-fuchsia-500/40 blur-3xl" />
                  <div className="absolute -bottom-20 -left-8 h-80 w-64 rounded-full bg-cyan-400/30 blur-3xl" />
                  <div className="absolute left-[28%] top-[28%] h-[44%] w-[44%] rounded-[2rem] border border-white/20 bg-white/5 shadow-2xl backdrop-blur-sm" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Preview overlays */}
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
                    <div>Bitrate preview: <strong className="text-emerald-400">{bitrate} kbps</strong></div>
                    <div className="text-zinc-400 text-[0.65rem]">No live stream is connected.</div>
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

            {/* Local audio and bitrate controls */}
            <div className="lg:col-span-4 space-y-6">
              <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm space-y-6">
                <div className="showcase-section-title">
                  <Sliders className="w-4 h-4 text-primary" />
                  <h3>Audio controls preview</h3>
                </div>

                {/* Mic Volume Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-1.5 font-bold"><Mic className="w-3.5 h-3.5 text-primary" /> Microphone level preview</span>
                    <span className="text-primary font-bold">{micVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={micVolume}
                    onChange={(e) => setMicVolume(Number(e.target.value))}
                    aria-label="Microphone volume preview"
                    className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                  />
                </div>

                {/* BGM Volume Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center gap-1.5 font-bold"><Volume2 className="w-3.5 h-3.5 text-cyan-400" /> Background music level preview</span>
                    <span className="text-cyan-400 font-bold">{bgmVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume(Number(e.target.value))}
                    aria-label="Background music volume preview"
                    className="w-full accent-cyan-400 h-2 bg-muted rounded-lg cursor-pointer"
                  />
                </div>

                {/* Stream Bitrate Config */}
                <div className="space-y-2 pt-4 border-t border-border/30">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <label htmlFor="studio-bitrate-preview" className="font-bold text-foreground">Target bitrate preview</label>
                    <span className="text-emerald-400 font-bold">{bitrate} kbps</span>
                  </div>
                  <select
                    id="studio-bitrate-preview"
                    value={bitrate}
                    onChange={(e) => setBitrate(Number(e.target.value))}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-xs font-medium"
                  >
                    <option value={8000}>8000 kbps</option>
                    <option value={6200}>6200 kbps</option>
                    <option value={4500}>4500 kbps</option>
                    <option value={3000}>3000 kbps</option>
                  </select>
                  <p className="text-xs leading-relaxed text-muted-foreground">These settings only update the preview and are not sent to an encoder.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vfx' && (
          /* CSS visual filter previews */
          <div className="space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40">
              <div className="showcase-section-title mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3>Visual filter presets</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono mb-6">These CSS filters preview on a local abstract sample. They are not applied to camera input, live output, or saved media.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {VISUAL_FILTERS.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    aria-pressed={selectedFilter.id === f.id}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedFilter(f);
                    }}
                    className={cn(
                      "w-full appearance-none p-4 rounded-3xl border bg-transparent font-sans text-left cursor-pointer transition-all duration-300 flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      selectedFilter.id === f.id ? "border-primary bg-primary/10 shadow-lg" : "surface-1 border-border/40 hover:border-border"
                    )}
                  >
                    <span className="block h-36 rounded-2xl overflow-hidden mb-3 relative bg-black" aria-hidden="true">
                      <span className="absolute inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-cyan-950 transition-transform duration-300 group-hover:scale-105" style={{ filter: f.css }}>
                        <span className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-fuchsia-500/50 blur-3xl" />
                        <span className="absolute -bottom-12 -left-6 h-44 w-36 rounded-full bg-cyan-400/40 blur-3xl" />
                        <span className="absolute left-[28%] top-[28%] h-[44%] w-[44%] rounded-[1.5rem] border border-white/20 bg-white/5" />
                      </span>
                      {selectedFilter.id === f.id && (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-mono text-[0.62rem] font-bold">Selected</span>
                      )}
                    </span>

                    <span className="block">
                      <span className="block font-display font-bold text-sm text-foreground">{f.name}</span>
                      <span className="mt-1 block text-xs text-muted-foreground font-serif">{f.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hooks' && (
          /* Local hook templates */
          <div className="space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 shadow-sm max-w-3xl mx-auto space-y-6">
              <div className="showcase-section-title">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <h3>Local hook drafts</h3>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">Creates three text suggestions from local templates. No AI provider is contacted, and these drafts do not predict engagement.</p>

              <div className="space-y-2">
                <Label htmlFor="studio-hook-topic" className="text-xs font-mono uppercase text-muted-foreground">Topic or idea</Label>
                <Input
                  id="studio-hook-topic"
                  value={hookTopic}
                  onChange={(e) => setHookTopic(e.target.value)}
                  maxLength={240}
                  placeholder="What is your post about?"
                  className="rounded-2xl h-12 text-sm"
                />
              </div>

              <Button
                onClick={createLocalHookDrafts}
                disabled={!hookTopic.trim()}
                className="w-full rounded-2xl font-bold text-xs h-12 glow-neon-primary bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Create sample drafts
              </Button>

              {localHookDrafts.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border/30">
                  <h4 className="font-display font-bold text-xs uppercase text-muted-foreground">Local drafts for your topic</h4>
                  {localHookDrafts.map((hook, i) => (
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
