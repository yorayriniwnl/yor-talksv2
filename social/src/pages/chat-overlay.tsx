import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Copy, Sparkles, CheckCircle2, 
  Flame, Sliders, ShieldCheck, Heart, Radio 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  sender: string;
  badge: string;
  message: string;
  isSuperchat: boolean;
  amount?: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'm-1', sender: 'DelhiGamer99', badge: '👑 VIP', message: 'BHAI KYA CLUTCH THA YE 🔥🔥🔥', isSuperchat: false },
  { id: 'm-2', sender: 'MumbaiSniper', badge: '💎 PRO', message: 'Direct lobby bhej diya! OP gameplay', isSuperchat: true, amount: '₹500 Superchat' },
  { id: 'm-3', sender: 'KolkataKnight', badge: '🛡️ MOD', message: 'Chat spam spam karo sab log! 🚀', isSuperchat: false },
];

export default function ChatOverlayStudio() {
  const [messages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [fontSize, setFontSize] = useState('Medium (14px)');
  const [showBadges, setShowBadges] = useState(true);

  const handleCopyOBSUrl = () => {
    sounds.playPop();
    triggerConfetti();
    navigator.clipboard.writeText('https://yor.talks/obs/chat/transparent?alpha=true&fps=60');
    toast.success('📋 OBS Transparent 60fps Chat Browser Source URL copied!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer OBS Chat Overlay Studio</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Transparent Broadcast Chat Box & Superchat Thermal Heatmap</p>
          </div>
        </div>

        <Button
          onClick={handleCopyOBSUrl}
          className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
        >
          <Copy className="w-3.5 h-3.5 mr-1" /> Copy OBS Browser URL
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* OBS Transparent Chat Preview */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-2xl">
            <div className="showcase-section-title">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3>Live Stream Overlay Preview</h3>
            </div>

            <div className="rounded-2xl p-4 bg-zinc-950/80 border border-border/40 space-y-3 font-sans">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "p-3 rounded-xl border flex flex-col gap-1 transition-all",
                    m.isSuperchat ? "bg-amber-500/10 border-amber-500/40" : "bg-zinc-900/60 border-border/20"
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      {showBadges && <span className="text-[0.65rem] font-bold">{m.badge}</span>}
                      <strong className="font-bold text-foreground">{m.sender}</strong>
                    </div>
                    {m.isSuperchat && (
                      <span className="font-mono font-bold text-[0.65rem] text-amber-400">{m.amount}</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-300 font-sans">{m.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Overlay Configuration Controls */}
          <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-4 shadow-xl font-sans">
            <div className="showcase-section-title">
              <Sliders className="w-4 h-4 text-primary" />
              <h3>Broadcast Overlay Settings</h3>
            </div>

            <div className="space-y-4 font-mono text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Typography Font Size:</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value)}
                  className="w-full h-10 rounded-xl bg-background border border-border/60 px-3 font-mono text-xs"
                >
                  <option>Compact (12px)</option>
                  <option>Medium (14px)</option>
                  <option>Large (16px)</option>
                </select>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => {
                    sounds.playPop();
                    setShowBadges(!showBadges);
                  }}
                  variant="outline"
                  className="w-full rounded-2xl text-xs font-mono"
                >
                  {showBadges ? '🛡️ VIP/Mod Badges: VISIBLE' : '⚪ Plain Chat Text Only'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
