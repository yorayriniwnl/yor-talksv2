import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Image as ImageIcon, Download, Share2, 
  Sliders, RefreshCw, Layers, CheckCircle2, Flame, Wand2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

const ART_PRESETS = [
  { 
    id: 'p1', 
    name: 'Ancient Indian Cyberpunk 🔱', 
    prompt: 'Lord Shiva futuristic cyberpunk avatar with glowing neon trishul, volumetric holographic aura, 8k render, unreal engine 5.4, vibrant saffron and cyan lighting',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop' 
  },
  { 
    id: 'p2', 
    name: 'Bengaluru Silicon Neon 🏙️', 
    prompt: 'Futuristic Bengaluru 2040 smart city with flying autonomous ISRO shuttles, neon street food carts, cyber rains, cinematic lighting',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop' 
  },
  { 
    id: 'p3', 
    name: 'BGMI Esports Grand Finals 🏆', 
    prompt: 'Hyper-realistic Indian esports athlete celebrating with championship trophy in packed stadium, confetti rain, dramatic stage lighting, 4k',
    url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200&auto=format&fit=crop' 
  },
  { 
    id: 'p4', 
    name: 'Bollywood Neo-Noir Detective 🎬', 
    prompt: 'Cinematic Mumbai rains, neon signboards in Hindi and Marathi, classic vintage ambassador cyber car, dramatic shadows, 35mm film grain',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop' 
  },
];

export default function AIArtStudio() {
  const addPost = useAppStore((s) => s.addPost);
  const [selectedPreset, setSelectedPreset] = useState(ART_PRESETS[0]);
  const [prompt, setPrompt] = useState(ART_PRESETS[0].prompt);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState(ART_PRESETS[0].url);

  const handleGenerate = () => {
    sounds.playPop();
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      sounds.playChime();
      triggerConfetti();
      toast.success('🎨 AI Visual Art & Thumbnail generated in 4K resolution!');
    }, 1200);
  };

  const handlePostToFeed = () => {
    sounds.playChime();
    triggerConfetti();
    addPost(`🎨 Generated with Bharat AI Art Studio:\n\n"${prompt}"`, [currentImage]);
    toast.success('🎉 Published AI artwork directly to your Yor Talks feed!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat AI Visual & Thumbnail Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Neural Generative Art & Esports YouTube Thumbnails</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handlePostToFeed}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary"
          >
            <Share2 className="w-3.5 h-3.5 mr-1" /> Post to Feed
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Image Preview Canvas Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="surface-1 rounded-3xl p-4 border border-border/40 shadow-2xl overflow-hidden relative group">
              <div className={cn(
                "w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center relative",
                aspectRatio === '16:9' && "aspect-video",
                aspectRatio === '9:16' && "aspect-[9/16] max-h-[500px]",
                aspectRatio === '1:1' && "aspect-square max-h-[440px]"
              )}>
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-3">
                    <Sparkles className="w-10 h-10 text-primary animate-spin" />
                    <span className="text-xs font-mono font-bold text-foreground">Synthesizing Neural Latent Diffusion…</span>
                  </div>
                ) : (
                  <img src={currentImage} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                )}
              </div>
            </div>
          </div>

          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            {/* Prompt Input Card */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3>Creative Prompt</h3>
              </div>

              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your visual concept..."
                className="rounded-2xl h-28 text-xs font-serif leading-relaxed"
              />

              {/* Aspect Ratio Switcher */}
              <div className="space-y-2">
                <Label className="text-xs font-mono uppercase text-muted-foreground">Aspect Ratio</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['16:9', '9:16', '1:1'] as const).map((ar) => (
                    <Button
                      key={ar}
                      size="sm"
                      variant={aspectRatio === ar ? 'default' : 'outline'}
                      onClick={() => setAspectRatio(ar)}
                      className={cn("rounded-xl font-mono text-xs", aspectRatio === ar && "bg-primary text-primary-foreground")}
                    >
                      {ar}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full rounded-2xl font-bold text-xs h-12 bg-primary text-primary-foreground glow-neon-primary shadow-lg"
              >
                <Wand2 className="w-4 h-4 mr-2" /> Generate AI Visual
              </Button>
            </div>

            {/* Presets Grid */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-3 shadow-sm">
              <div className="showcase-section-title">
                <Layers className="w-4 h-4 text-amber-400" />
                <h3>Curated Bharat Style Presets</h3>
              </div>

              <div className="space-y-2">
                {ART_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      sounds.playPop();
                      setSelectedPreset(p);
                      setPrompt(p.prompt);
                      setCurrentImage(p.url);
                    }}
                    className={cn(
                      "w-full p-3 rounded-2xl border text-left transition-all text-xs font-bold flex items-center justify-between",
                      selectedPreset.id === p.id ? "border-primary bg-primary/20 shadow-md" : "border-border/40 hover:bg-muted/40"
                    )}
                  >
                    <span>{p.name}</span>
                    <span className="text-[0.62rem] font-mono text-muted-foreground">Apply Preset</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
