import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Briefcase, IndianRupee, Sparkles, Trophy, Calendar, 
  ExternalLink, CheckCircle2, Send, Github, Video, ShieldCheck, Clock 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface BountyItem {
  id: string;
  title: string;
  sponsor: string;
  sponsorLogo: string;
  grantAmountINR: number;
  category: 'WebGL & Shaders' | 'Game Dev / Unreal' | 'AI & LLMs' | 'Mobile & UX';
  deadline: string;
  applicantsCount: number;
  tags: string[];
  description: string;
  status: 'active' | 'reviewing' | 'awarded';
}

const BOUNTIES: BountyItem[] = [
  {
    id: 'bounty-1',
    title: 'Bharat Spatial 3D UI & WebGL Shaders Innovation Grant',
    sponsor: 'Yor Labs & Bengaluru Foundation',
    sponsorLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop',
    grantAmountINR: 1000000,
    category: 'WebGL & Shaders',
    deadline: 'Sep 15, 2026 (28 Days Left)',
    applicantsCount: 48,
    tags: ['Three.js', 'WebGL', 'GLSL', 'Spatial Audio'],
    description: 'Build open-source real-time spatial computing surfaces, 3D hologram cards, and WebGL physics engines optimized for 60FPS on Indian mobile devices.',
    status: 'active'
  },
  {
    id: 'bounty-2',
    title: 'Unreal Engine 5.4 Indie Bharat Game Jam (Theme: Ancient Lore Meets Cyberpunk)',
    sponsor: 'Mumbai Game Dev Guild',
    sponsorLogo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200&auto=format&fit=crop',
    grantAmountINR: 500000,
    category: 'Game Dev / Unreal',
    deadline: 'Sep 30, 2026',
    applicantsCount: 82,
    tags: ['UE 5.4', 'Nanite', 'Lumen', 'Indie Game'],
    description: 'A 48-hour prototype game jam challenging game developers across India to build playable demos blending Indian mythology with futuristic cyberpunk aesthetics.',
    status: 'active'
  },
  {
    id: 'bounty-3',
    title: 'Multimodal Indic AI Agent & Real-Time Voice Translation Engine',
    sponsor: 'Cyberabad AI Research',
    sponsorLogo: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=200&auto=format&fit=crop',
    grantAmountINR: 250000,
    category: 'AI & LLMs',
    deadline: 'Oct 10, 2026',
    applicantsCount: 34,
    tags: ['Hindi / Tamil / Bengali', 'Voice AI', 'Sub-100ms Latency'],
    description: 'Develop low-latency on-device voice translation agents for Indian regional languages integrated into live gaming voice chat.',
    status: 'active'
  }
];

export default function Bounties() {
  const [bounties, setBounties] = useState<BountyItem[]>(BOUNTIES);
  const [selectedBounty, setSelectedBounty] = useState<BountyItem | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [pitchText, setPitchText] = useState('');

  const handleSubmitApplication = () => {
    if (!githubUrl.trim()) {
      toast.error('Please provide a GitHub Repository link');
      return;
    }
    sounds.playChime();
    triggerConfetti();
    toast.success(`🎉 Proposal submitted for "${selectedBounty?.title}"! Grant committee review takes 48 hours.`);
    setIsSubmitOpen(false);
    setGithubUrl('');
    setDemoUrl('');
    setPitchText('');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Creator Grants & Bounties</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">₹17,50,000 in Active Grants for Indian Engineers & Creators</p>
          </div>
        </div>

        <div className="level-badge shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Escrow Verified Grants
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Bounties List Grid */}
        <div className="space-y-4">
          {bounties.map((b) => (
            <div
              key={b.id}
              className="surface-1 rounded-3xl p-6 sm:p-7 border border-border/40 hover:border-primary/40 transition-all duration-300 shadow-md flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-[0.68rem] font-mono font-bold">
                      {b.category}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" /> {b.deadline}
                    </span>
                  </div>

                  <div className="font-display font-black text-2xl text-emerald-400">
                    ₹{b.grantAmountINR.toLocaleString()} INR
                  </div>
                </div>

                <h3 className="font-display font-bold text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors leading-snug">
                  {b.title}
                </h3>

                <p className="text-sm font-serif text-muted-foreground leading-relaxed">
                  {b.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {b.tags.map(tag => (
                    <span key={tag} className="text-[0.62rem] font-mono px-2.5 py-1 rounded-full bg-muted border border-border/30 text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-5 mt-4 border-t border-border/30">
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <span>Sponsored by <strong>{b.sponsor}</strong></span>
                  <span>&middot;</span>
                  <span>{b.applicantsCount} Proposals Submitted</span>
                </div>

                <Button
                  onClick={() => {
                    sounds.playPop();
                    setSelectedBounty(b);
                    setIsSubmitOpen(true);
                  }}
                  className="rounded-2xl font-bold text-xs px-6 h-10 bg-primary text-primary-foreground glow-neon-primary shadow-md"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Proposal
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Proposal Dialog */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="sm:max-w-[560px] rounded-3xl font-sans text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Apply for Grant
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-2xl bg-muted/40 border border-border/40 text-xs font-mono">
              <span className="text-muted-foreground block text-[0.65rem] uppercase">Target Grant</span>
              <strong className="text-foreground">{selectedBounty?.title}</strong>
              <div className="text-emerald-400 font-bold mt-1">₹{selectedBounty?.grantAmountINR.toLocaleString()} INR Total Escrow Fund</div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5 text-primary" /> GitHub Repository URL
              </Label>
              <Input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/username/project"
                className="rounded-xl h-11 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" /> Live Demo URL / Prototype
              </Label>
              <Input
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://project.vercel.app"
                className="rounded-xl h-11 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase text-muted-foreground">Proposal Abstract & Technical Architecture</Label>
              <Textarea
                value={pitchText}
                onChange={(e) => setPitchText(e.target.value)}
                placeholder="Briefly describe your technical implementation, milestones, and deliverables…"
                className="rounded-xl h-28 text-xs font-serif leading-relaxed"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSubmitApplication}
              className="w-full rounded-2xl font-bold text-xs h-11 bg-emerald-500 hover:bg-emerald-600 text-black glow-neon-primary"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submit Grant Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
