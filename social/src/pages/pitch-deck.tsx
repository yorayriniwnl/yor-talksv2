import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Presentation, Download, Sparkles, CheckCircle2, 
  Briefcase, IndianRupee, Eye, Users, Award, ChevronRight, ChevronLeft 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  metrics: { label: string; val: string }[];
}

const SLIDES: Slide[] = [
  {
    id: 1,
    title: 'Audience Reach & Demographic Matrix 🇮🇳',
    subtitle: '78% Gen-Z Gaming Enthusiasts across Tier-1 & Tier-2 Indian Cities',
    metrics: [
      { label: 'Monthly Impressions', val: '4.8 Million' },
      { label: 'Avg Stream Retention', val: '42.5 Mins' },
      { label: 'Core Age Group', val: '18 - 24 Yrs' },
    ]
  },
  {
    id: 2,
    title: 'Proven Brand ROI & Past Campaign ROAS 🚀',
    subtitle: 'Delivered 3.4x average Return on Ad Spend for Boat Audio & OnePlus Bharat',
    metrics: [
      { label: 'Boat Audio Campaign', val: '₹14.2L Sales' },
      { label: 'OnePlus 12 Launch', val: '850+ Pre-orders' },
      { label: 'CTR Engagement Rate', val: '8.4% (Top 1%)' },
    ]
  },
  {
    id: 3,
    title: 'Deliverables, CPM Packages & Escrow Terms 💼',
    subtitle: 'Transparent pricing with automated GST tax invoices & escrow delivery protection',
    metrics: [
      { label: 'Dedicated Stream Integration', val: '₹1,25,000' },
      { label: '30s Mid-Roll Reel Burn-In', val: '₹45,000' },
      { label: 'Social Shoutout Bundle', val: '₹35,000' },
    ]
  }
];

export default function PitchDeckStudio() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    sounds.playPop();
    setCurrentSlide((c) => (c + 1) % SLIDES.length);
  };

  const prevSlide = () => {
    sounds.playPop();
    setCurrentSlide((c) => (c - 1 + SLIDES.length) % SLIDES.length);
  };

  const handleExportPDF = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('📄 4K Creator Sponsorship Pitch Deck PDF Exported! Ready to dispatch to brand marketing teams.');
  };

  const slide = SLIDES[currentSlide];

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Creator Brand Pitch Deck & Media Presentation Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Interactive Sponsor Slides, Demographic Analytics & 4K PDF Export</p>
          </div>
        </div>

        <Button
          onClick={handleExportPDF}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export 4K Pitch PDF
        </Button>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Slide Canvas */}
        <div className="surface-1 rounded-3xl p-8 border border-border/40 shadow-2xl space-y-6 min-h-[380px] flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="px-3 py-1 rounded-full bg-primary/20 text-primary font-bold">
              SLIDE {slide.id} OF {SLIDES.length}
            </span>
            <span className="text-muted-foreground">YOR TALKS CERTIFIED CREATOR</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-display font-black text-2xl text-foreground">{slide.title}</h2>
            <p className="text-sm font-mono text-muted-foreground">{slide.subtitle}</p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {slide.metrics.map((m, i) => (
              <div key={i} className="p-4 rounded-2xl bg-zinc-950 border border-border/40 text-center font-mono">
                <span className="text-[0.65rem] text-muted-foreground uppercase block">{m.label}</span>
                <strong className="font-display font-black text-xl text-emerald-400 mt-1 block">{m.val}</strong>
              </div>
            ))}
          </div>

          {/* Slide Navigation Controls */}
          <div className="flex justify-between items-center pt-4 border-t border-border/40">
            <Button onClick={prevSlide} variant="outline" size="sm" className="rounded-xl font-bold text-xs">
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous Slide
            </Button>
            <div className="flex gap-1.5">
              {SLIDES.map((_, idx) => (
                <span
                  key={idx}
                  className={cn("w-2.5 h-2.5 rounded-full transition-all", currentSlide === idx ? "bg-primary w-6" : "bg-muted")}
                />
              ))}
            </div>
            <Button onClick={nextSlide} variant="outline" size="sm" className="rounded-xl font-bold text-xs">
              Next Slide <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
