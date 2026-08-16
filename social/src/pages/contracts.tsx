import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, ShieldCheck, IndianRupee, Download, 
  CheckCircle2, Sparkles, PenTool, Flame, Building2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function ContractsStudio() {
  const [playerName, setPlayerName] = useState('AYUSH VERMA');
  const [gamerTag, setGamerTag] = useState('CYBER_SHIVA');
  const [orgName, setOrgName] = useState('BHARAT TITANS ESPORTS');
  const [salary, setSalary] = useState(75000);
  const [prizeShare, setPrizeShare] = useState(85);
  const [isSigned, setIsSigned] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clearSignature = () => {
    sounds.playPop();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsSigned(false);
  };

  const handleSign = () => {
    sounds.playChime();
    triggerConfetti();
    setIsSigned(true);
    toast.success(`🎉 Official Pro Esports Contract Executed for ${gamerTag}!`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-black flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Esports Pro Contract & Roster Signing Maker</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Official Player Agreements, Salary Stipends & Legal Signatures</p>
          </div>
        </div>

        <Button
          onClick={handleSign}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Execute & Download Agreement
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Formal Contract Document Preview Column */}
          <div className="lg:col-span-7">
            <div className="surface-1 rounded-3xl p-8 border border-border/40 shadow-2xl space-y-6 font-serif bg-zinc-950/80">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <h3 className="font-display font-black text-xl text-primary uppercase">{orgName}</h3>
                  <span className="text-[0.65rem] font-mono text-muted-foreground">OFFICIAL PROFESSIONAL PLAYER CONTRACT</span>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LEGAL BINDING
                </span>
              </div>

              <div className="text-xs text-foreground/90 space-y-4 leading-relaxed">
                <p>
                  This Professional Athlete Agreement is entered into on <strong>{new Date().toLocaleDateString('en-IN')}</strong> between <strong>{orgName}</strong> (the &quot;Organization&quot;) and <strong>{playerName}</strong>, known professionally as <strong>&quot;{gamerTag}&quot;</strong> (the &quot;Athlete&quot;).
                </p>

                <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Guaranteed Stipend:</span>
                    <strong className="text-emerald-400">₹{salary.toLocaleString()} INR / Month</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tournament Prize Pool Share:</span>
                    <strong className="text-primary">{prizeShare}% (Athlete) / {100 - prizeShare}% (Org)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Official Roster Role:</span>
                    <strong className="text-amber-400">In-Game Leader (IGL) & Entry</strong>
                  </div>
                </div>

                <p className="text-[0.68rem] text-muted-foreground">
                  The Athlete agrees to represent the Organization in official BGMI, Valorant, and Free Fire national tournaments.
                </p>
              </div>

              {/* Signature Section */}
              <div className="pt-4 border-t border-border/40 space-y-3 font-sans">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-mono uppercase text-muted-foreground">Digital Cryptographic Signature</Label>
                  <button onClick={clearSignature} className="text-[0.65rem] font-mono text-rose-400 hover:underline">
                    Clear Pad
                  </button>
                </div>
                <div className="w-full h-24 rounded-2xl border border-dashed border-border/60 bg-black/60 flex items-center justify-center relative">
                  <span className="text-xs font-serif italic text-muted-foreground">
                    {isSigned ? `Signed Digitally by ${gamerTag} ✓ Verified on Polygon` : 'Click "Execute & Download" to sign'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Builder Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <Building2 className="w-4 h-4 text-primary" />
                <h3>Contract Parties</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-mono uppercase text-muted-foreground">Esports Organization</Label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value.toUpperCase())} className="rounded-xl font-bold text-xs uppercase" />
                </div>
                <div>
                  <Label className="text-xs font-mono uppercase text-muted-foreground">Athlete Full Name</Label>
                  <Input value={playerName} onChange={(e) => setPlayerName(e.target.value.toUpperCase())} className="rounded-xl font-bold text-xs uppercase" />
                </div>
                <div>
                  <Label className="text-xs font-mono uppercase text-muted-foreground">Athlete Gamer Tag</Label>
                  <Input value={gamerTag} onChange={(e) => setGamerTag(e.target.value.toUpperCase())} className="rounded-xl font-bold text-xs uppercase" />
                </div>
              </div>
            </div>

            {/* Compensation Modifiers */}
            <div className="surface-1 p-6 rounded-3xl border border-border/40 space-y-4 shadow-sm">
              <div className="showcase-section-title">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                <h3>Compensation & Stipend</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-muted-foreground">Monthly Salary</span>
                    <strong className="text-emerald-400 font-bold">₹{salary.toLocaleString()} / mo</strong>
                  </div>
                  <input
                    type="range"
                    min="25000"
                    max="250000"
                    step="5000"
                    value={salary}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-muted-foreground">Prize Pool Split</span>
                    <strong className="text-primary font-bold">{prizeShare}% Player</strong>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={prizeShare}
                    onChange={(e) => setPrizeShare(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
