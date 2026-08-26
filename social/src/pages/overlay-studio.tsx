import { useState } from 'react';
import { 
  Video, Sparkles, Sliders, Monitor, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { toast } from 'sonner';

export default function OverlayStudio() {
  const [streamerName, setStreamerName] = useState('AYUSH_PRO_LIVE');
  const [accentColor, setAccentColor] = useState('#06b6d4');
  const [showDonationAlert, setShowDonationAlert] = useState(true);
  const [showGoalBar, setShowGoalBar] = useState(true);

  const exportOverlayPreset = () => {
    const preset = {
      version: 1,
      streamerName: streamerName.trim() || 'YOUR_CHANNEL_TAG',
      accentColor,
      showDonationAlert,
      showGoalBar,
    };
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(preset.streamerName || 'yor-overlay').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-overlay.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    sounds.playChime();
    toast.success('Overlay preset downloaded');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Yor Overlay Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Design a broadcast preset for OBS, Twitch, YouTube, or Kick</p>
          </div>
        </div>

        <Button
          onClick={exportOverlayPreset}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export preset
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* OBS Stream Preview Frame */}
        <div className="surface-1 rounded-3xl border border-border/40 overflow-hidden shadow-2xl p-6 relative">
          <div className="relative w-full aspect-video rounded-2xl bg-zinc-950 overflow-hidden border-2 border-zinc-800 flex items-center justify-center">
            {/* Local preview canvas */}
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop" 
              alt="" 
              className="w-full h-full object-cover opacity-30" 
            />

            {/* Webcam Frame Widget */}
            <div 
              style={{ borderColor: accentColor }}
              className="absolute top-6 left-6 w-48 h-36 rounded-2xl border-2 bg-black/60 backdrop-blur-sm flex items-center justify-center shadow-2xl"
            >
              <span className="text-[0.65rem] font-mono text-zinc-400">CAMERA HUD FEED</span>
            </div>

            {/* Donation alert preview */}
            {showDonationAlert && (
              <div className="absolute top-6 right-6 p-3 rounded-2xl bg-gradient-to-r from-amber-500/90 to-orange-600/90 text-black font-display font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
                <Sparkles className="w-4 h-4" /> Donation alert preview · provider not connected
              </div>
            )}

            {/* Bottom Streamer Tag & Sub Goal Bar */}
            {showGoalBar && (
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between p-3 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <strong className="text-white">{streamerName}</strong>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400">Sample goal · connect a provider for live progress</span>
                  <div className="w-32 h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div style={{ backgroundColor: accentColor }} className="w-[84%] h-full rounded-full" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Studio Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
            <div className="showcase-section-title">
              <Sliders className="w-4 h-4 text-primary" />
              <h3>Streamer Identity & Tag</h3>
            </div>

            <Input
              value={streamerName}
              onChange={(e) => setStreamerName(e.target.value.toUpperCase())}
              placeholder="YOUR_CHANNEL_TAG"
              className="rounded-xl font-mono text-xs font-bold uppercase h-11"
            />
            <p className="text-[0.68rem] leading-relaxed text-muted-foreground">This name is embedded into the exported preset. Live events remain disabled until a streaming provider is connected.</p>
          </div>

          <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
            <div className="showcase-section-title">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3>Widget Neon Accent</h3>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { name: 'Cyan', hex: '#06b6d4' },
                { name: 'Purple', hex: '#a855f7' },
                { name: 'Saffron', hex: '#f59e0b' },
                { name: 'Emerald', hex: '#10b981' },
              ].map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    sounds.playPop();
                    setAccentColor(c.hex);
                  }}
                  className={cn(
                    "p-3 rounded-2xl border text-xs font-bold transition-all text-center",
                    accentColor === c.hex ? "border-white bg-white/10 shadow" : "border-border/40 hover:bg-muted/40"
                  )}
                >
                  <span style={{ backgroundColor: c.hex }} className="w-4 h-4 rounded-full mx-auto block mb-1" />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="surface-1 rounded-3xl border border-border/40 p-6 shadow-sm">
          <div className="showcase-section-title">
            <Monitor className="w-4 h-4 text-primary" />
            <h3>Preview layers</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/30 px-4 py-3 text-xs font-semibold transition-colors hover:bg-muted/60">
              <span><strong className="block">Donation alert</strong><small className="mt-1 block font-normal text-muted-foreground">Show the provider-ready preview layer</small></span>
              <input type="checkbox" checked={showDonationAlert} onChange={(event) => setShowDonationAlert(event.target.checked)} className="h-4 w-4 accent-primary" />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/40 bg-muted/30 px-4 py-3 text-xs font-semibold transition-colors hover:bg-muted/60">
              <span><strong className="block">Goal bar</strong><small className="mt-1 block font-normal text-muted-foreground">Show the sample progress layer</small></span>
              <input type="checkbox" checked={showGoalBar} onChange={(event) => setShowGoalBar(event.target.checked)} className="h-4 w-4 accent-primary" />
            </label>
          </div>
          <p className="mt-4 text-[0.68rem] leading-relaxed text-muted-foreground">Exporting saves the selected layers and colors as a portable preset. It does not publish a live browser source or transmit account data.</p>
        </div>
      </div>
    </div>
  );
}
