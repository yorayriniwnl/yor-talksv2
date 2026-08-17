import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Keyboard, Sparkles, Sliders, Volume2, Download, 
  CheckCircle2, Palette, Flame, Shield, Play 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function GearCustomizer() {
  const [rgbMode, setRgbMode] = useState<'wave' | 'breathing' | 'static' | 'cyber'>('cyber');
  const [switchType, setSwitchType] = useState<'red' | 'blue' | 'brown'>('red');
  const [keycapTheme, setKeycapTheme] = useState<'desi-cyber' | 'stealth' | 'saffron'>('desi-cyber');

  const handleTestKeypress = () => {
    sounds.playPop();
    toast.info(`⌨️ Sound Test: ${switchType.toUpperCase()} mechanical switch actuation triggered!`);
  };

  const handleExportProfile = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('💾 RGB Lighting & Macro Profile JSON exported for QMK / Razer Chroma / Corsair iCUE!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-purple-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Gamer Mechanical RGB Gear & Keycap Customizer</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Custom Switch Acoustics, RGB Wave Simulator & QMK Export</p>
          </div>
        </div>

        <Button
          onClick={handleExportProfile}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export QMK / Chroma Profile
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Visual Interactive Keyboard Simulator */}
          <div className="lg:col-span-7 space-y-4">
            <div className="surface-1 rounded-3xl p-6 border border-border/40 shadow-2xl space-y-4">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-primary font-bold">65% PRO ESPORTS KEYBOARD PREVIEW</span>
                <span className="text-muted-foreground">RGB: {rgbMode.toUpperCase()}</span>
              </div>

              {/* Keyboard Chassis */}
              <div className="p-5 rounded-3xl bg-zinc-950 border-4 border-zinc-800 shadow-2xl space-y-2 select-none">
                {/* Row 1 */}
                <div className="flex gap-1.5 justify-center">
                  {['ESC', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'DEL'].map((k) => (
                    <button
                      key={k}
                      onClick={handleTestKeypress}
                      className={cn(
                        "w-9 h-10 rounded-xl font-mono font-bold text-[0.65rem] border flex items-center justify-center transition-all active:scale-95 shadow-md",
                        keycapTheme === 'desi-cyber' ? "bg-zinc-900 border-cyan-500/50 text-cyan-300 hover:border-pink-500 hover:text-pink-300" :
                        keycapTheme === 'saffron' ? "bg-zinc-900 border-amber-500/50 text-amber-300" :
                        "bg-zinc-900 border-zinc-700 text-zinc-300"
                      )}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Row 2 */}
                <div className="flex gap-1.5 justify-center">
                  {['TAB', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'ENTER'].map((k) => (
                    <button
                      key={k}
                      onClick={handleTestKeypress}
                      className={cn(
                        "h-10 rounded-xl font-mono font-bold text-[0.65rem] border flex items-center justify-center transition-all active:scale-95 shadow-md",
                        k === 'ENTER' || k === 'TAB' ? "w-14" : "w-9",
                        keycapTheme === 'desi-cyber' ? "bg-zinc-900 border-cyan-500/50 text-cyan-300" : "bg-zinc-900 border-zinc-700 text-zinc-300"
                      )}
                    >
                      {k}
                    </button>
                  ))}
                </div>

                {/* Row 3 Spacebar */}
                <div className="flex gap-1.5 justify-center pt-1">
                  {['CTRL', 'WIN', 'ALT', 'SPACEBAR (THOCK)', 'ALT', 'FN'].map((k) => (
                    <button
                      key={k}
                      onClick={handleTestKeypress}
                      className={cn(
                        "h-10 rounded-xl font-mono font-bold text-[0.65rem] border flex items-center justify-center transition-all active:scale-95 shadow-md",
                        k.includes('SPACEBAR') ? "flex-1 bg-gradient-to-r from-primary/20 via-pink-500/20 to-cyan-500/20 text-primary border-primary" : "w-11 bg-zinc-900 border-zinc-700 text-zinc-400"
                      )}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-center">
                <Button onClick={handleTestKeypress} variant="outline" className="rounded-2xl text-xs font-mono">
                  <Volume2 className="w-3.5 h-3.5 mr-1 text-primary" /> Test Mechanical Thock Sound
                </Button>
              </div>
            </div>
          </div>

          {/* Configurator Controls Column */}
          <div className="lg:col-span-5 space-y-4 font-sans">
            {/* Switch Selector */}
            <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-3 shadow-sm">
              <div className="showcase-section-title">
                <Sliders className="w-4 h-4 text-primary" />
                <h3>Mechanical Switches</h3>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'red', name: 'Cherry MX Red (Linear)', desc: 'Smooth 45g actuation for rapid strafing' },
                  { id: 'blue', name: 'Gateron Blue (Clicky)', desc: 'Tactile bump & audible click acoustics' },
                  { id: 'brown', name: 'Holy Panda (Tactile Thock)', desc: 'Deep thock sound for pro typing' },
                ].map((sw) => (
                  <button
                    key={sw.id}
                    onClick={() => {
                      sounds.playPop();
                      setSwitchType(sw.id as any);
                    }}
                    className={cn(
                      "w-full p-3 rounded-2xl border text-left transition-all",
                      switchType === sw.id ? "border-primary bg-primary/20 shadow glow-neon-primary" : "surface-1 hover:bg-muted/40"
                    )}
                  >
                    <strong className="text-xs font-display text-foreground block">{sw.name}</strong>
                    <span className="text-[0.65rem] font-mono text-muted-foreground">{sw.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* RGB Lighting Modes */}
            <div className="surface-1 p-5 rounded-3xl border border-border/40 space-y-3 shadow-sm font-mono text-xs">
              <span className="text-muted-foreground uppercase text-[0.65rem] block">RGB Lighting FX:</span>
              <div className="grid grid-cols-2 gap-2">
                {['cyber', 'wave', 'breathing', 'static'].map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={rgbMode === mode ? 'default' : 'outline'}
                    onClick={() => {
                      sounds.playPop();
                      setRgbMode(mode as any);
                    }}
                    className={cn("rounded-xl text-xs uppercase font-bold", rgbMode === mode && "bg-primary text-primary-foreground")}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
