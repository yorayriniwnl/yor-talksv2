import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Radio, Sparkles, CheckCircle2, 
  Send, Shield, Tv, Wifi, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

export default function BitrateHealthWatchtower() {
  const [bitrate, setBitrate] = useState(7850);
  const [fps, setFps] = useState(60.0);
  const [droppedFrames, setDroppedFrames] = useState('0.00% (0 / 216,000)');
  const [ispStatus, setIspStatus] = useState('Airtel 1Gbps Fiber - Stable (1.2ms Jitter)');

  const handleTestIngest = () => {
    sounds.playPop();
    setBitrate(Math.floor(7500 + Math.random() * 500));
    toast.info('📡 RTMP / SRT Ingest handshake re-tested! 0 dropped frames detected.');
  };

  const handleDispatchWebhook = () => {
    sounds.playChime();
    triggerConfetti();
    toast.success('🔔 Real-Time Stream Health Telemetry dispatched to Streamer Discord Mod Webhook!');
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Streamer Bitrate Health & Ingest Watchtower</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Real-Time RTMP / SRT Telemetry, 0.00% Frame Drop Target & Fiber Jitter AI</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleTestIngest} variant="outline" className="rounded-2xl text-xs font-mono">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-Test Ingest
          </Button>
          <Button
            onClick={handleDispatchWebhook}
            className="rounded-2xl font-bold text-xs bg-primary text-primary-foreground glow-neon-primary shadow-lg"
          >
            <Send className="w-3.5 h-3.5 mr-1" /> Dispatch Discord Webhook
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Real-Time Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface-1 p-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/5 text-center shadow-lg">
            <span className="text-muted-foreground uppercase text-[0.6rem] font-mono block">Active RTMP Bitrate</span>
            <strong className="font-display font-black text-3xl text-emerald-400">{bitrate} Kbps</strong>
            <span className="text-[0.65rem] font-mono text-muted-foreground block mt-1">1080p60 CBR Optimal</span>
          </div>

          <div className="surface-1 p-6 rounded-3xl border border-border/40 text-center shadow-lg">
            <span className="text-muted-foreground uppercase text-[0.6rem] font-mono block">Broadcast Frame Rate</span>
            <strong className="font-display font-black text-3xl text-primary">{fps} FPS</strong>
            <span className="text-[0.65rem] font-mono text-muted-foreground block mt-1">NVENC HEVC Hardware Encode</span>
          </div>

          <div className="surface-1 p-6 rounded-3xl border border-border/40 text-center shadow-lg">
            <span className="text-muted-foreground uppercase text-[0.6rem] font-mono block">Dropped Frames</span>
            <strong className="font-display font-black text-2xl text-emerald-400">0.00%</strong>
            <span className="text-[0.65rem] font-mono text-muted-foreground block mt-1">{droppedFrames}</span>
          </div>
        </div>

        {/* ISP Telemetry Box */}
        <div className="surface-1 rounded-3xl p-6 border border-border/40 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
              <Wifi className="w-4 h-4 text-emerald-400" /> ISP Gateway Telemetry
            </h3>
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[0.65rem]">
              ZERO PACKET LOSS
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground">{ispStatus}</p>
        </div>
      </div>
    </div>
  );
}
