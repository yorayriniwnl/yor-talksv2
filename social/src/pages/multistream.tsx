import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, Tv, Video, Sparkles, CheckCircle2, 
  Activity, Sliders, Play, Pause, Flame, Share2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { toast } from 'sonner';

interface StreamDestination {
  id: string;
  platform: string;
  rtmpUrl: string;
  enabled: boolean;
  status: 'live' | 'idle';
  viewers: number;
}

const INITIAL_DESTS: StreamDestination[] = [
  { id: 'yt', platform: 'YouTube Live 🔴', rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2', enabled: true, status: 'live', viewers: 1420 },
  { id: 'tw', platform: 'Twitch TV 💜', rtmpUrl: 'rtmp://live.twitch.tv/app', enabled: true, status: 'live', viewers: 890 },
  { id: 'kc', platform: 'Kick Gaming 🟢', rtmpUrl: 'rtmp://fa723178d21c.global-contribute.live-video.net', enabled: false, status: 'idle', viewers: 0 },
  { id: 'fb', platform: 'Facebook Gaming 🔵', rtmpUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/', enabled: false, status: 'idle', viewers: 0 },
];

export default function MultistreamStudio() {
  const [destinations, setDestinations] = useState<StreamDestination[]>(INITIAL_DESTS);
  const [isBroadcasting, setIsBroadcasting] = useState(true);

  const toggleDestination = (id: string) => {
    sounds.playPop();
    setDestinations(prev => prev.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d));
  };

  const handleToggleBroadcast = () => {
    sounds.playChime();
    setIsBroadcasting(!isBroadcasting);
    if (!isBroadcasting) {
      triggerConfetti();
      toast.success('🚀 Multistream broadcast engaged to all enabled RTMP endpoints!');
    } else {
      toast.info('🛑 Restream pipeline paused.');
    }
  };

  const totalViewers = destinations
    .filter(d => d.enabled)
    .reduce((sum, d) => sum + d.viewers, 0);

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-foreground">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-30 glass-heavy px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md glow-neon-primary">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-foreground">Bharat Multistream & RTMP Restreamer</h1>
            <p className="text-[0.68rem] text-muted-foreground font-mono">Broadcast Simultaneously to YouTube, Twitch & Kick with Zero Dropped Frames</p>
          </div>
        </div>

        <Button
          onClick={handleToggleBroadcast}
          className={cn("rounded-2xl font-bold text-xs shadow-lg", isBroadcasting ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-primary text-primary-foreground")}
        >
          {isBroadcasting ? <><Pause className="w-3.5 h-3.5 mr-1" /> Stop Restream</> : <><Play className="w-3.5 h-3.5 mr-1" /> Go Live Everywhere</>}
        </Button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Telemetry Bar */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-3xl surface-1 border border-border/40 text-center font-mono text-xs shadow-xl">
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Aggregated Viewers</span>
            <strong className="font-display font-black text-2xl text-emerald-400">{isBroadcasting ? totalViewers.toLocaleString() : 0}</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Ingest Bitrate</span>
            <strong className="font-display font-black text-2xl text-primary">{isBroadcasting ? '6000 Kbps' : '0 Kbps'}</strong>
          </div>
          <div>
            <span className="text-muted-foreground uppercase text-[0.6rem] block">Frame Stability</span>
            <strong className="font-display font-black text-2xl text-emerald-400">{isBroadcasting ? '60.0 FPS (0% Drop)' : 'Offline'}</strong>
          </div>
        </div>

        {/* RTMP Destination Cards */}
        <div className="space-y-4">
          <div className="showcase-section-title">
            <Video className="w-4 h-4 text-primary" />
            <h3>Active RTMP Endpoints</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {destinations.map((d) => (
              <div
                key={d.id}
                className={cn(
                  "surface-1 p-5 rounded-3xl border flex items-center justify-between shadow-md transition-all",
                  d.enabled && isBroadcasting ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/40"
                )}
              >
                <div className="space-y-1 font-sans">
                  <div className="flex items-center gap-2">
                    <h4 className="font-display font-bold text-base text-foreground">{d.platform}</h4>
                    {d.enabled && isBroadcasting && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[0.62rem] font-mono font-bold">
                        LIVE ({d.viewers})
                      </span>
                    )}
                  </div>
                  <p className="text-[0.65rem] font-mono text-muted-foreground truncate max-w-[200px]">{d.rtmpUrl}</p>
                </div>

                <Switch
                  checked={d.enabled}
                  onCheckedChange={() => toggleDestination(d.id)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
