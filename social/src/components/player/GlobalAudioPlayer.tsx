import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Music, Maximize2, Minimize2, Sparkles, Disc, Radio, ListMusic, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { sounds } from '@/lib/sound';

export interface SoundtrackTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  coverUrl: string;
  durationSec: number;
  freqProfile: number[]; // Frequencies for visualizer simulation
}

export const SOUNDTRACK_PLAYLIST: SoundtrackTrack[] = [
  {
    id: 'track-1',
    title: 'Bengaluru Midnight Cyberpunk (140 BPM)',
    artist: 'Elena Rostova & Ayush Roy',
    genre: 'Cyber Ambient / Sitar Synth',
    coverUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop',
    durationSec: 184,
    freqProfile: [45, 68, 85, 92, 74, 60, 80, 95, 70, 55, 65, 88]
  },
  {
    id: 'track-2',
    title: 'Mumbai Synthwave Monsoon',
    artist: 'Bandra Sound Labs',
    genre: 'Lo-Fi / Retrowave',
    coverUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
    durationSec: 210,
    freqProfile: [30, 45, 60, 75, 85, 90, 65, 50, 40, 55, 70, 60]
  },
  {
    id: 'track-3',
    title: 'Delhi Electro Sitar Fusion',
    artist: 'Anya & The Cyber Guild',
    genre: 'Electro Fusion / Tabla Beats',
    coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=400&auto=format&fit=crop',
    durationSec: 165,
    freqProfile: [60, 80, 95, 100, 85, 70, 90, 85, 60, 75, 95, 90]
  },
  {
    id: 'track-4',
    title: 'Vedic Ambient Resonance (432Hz)',
    artist: 'Yor Spatial Soundscapes',
    genre: 'Deep Focus / Spatial 3D',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
    durationSec: 240,
    freqProfile: [20, 35, 45, 50, 55, 60, 50, 45, 40, 35, 30, 25]
  }
];

export function GlobalAudioPlayer() {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progressSec, setProgressSec] = useState(42);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  const currentTrack = SOUNDTRACK_PLAYLIST[currentTrackIndex];

  // Playback timer ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgressSec(p => (p >= currentTrack.durationSec ? 0 : p + 1));
    }, 1000 / speed);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack, speed]);

  const handleTogglePlay = () => {
    sounds.playPop();
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    sounds.playSwoosh();
    setCurrentTrackIndex((i) => (i + 1) % SOUNDTRACK_PLAYLIST.length);
    setProgressSec(0);
  };

  const handlePrev = () => {
    sounds.playSwoosh();
    setCurrentTrackIndex((i) => (i - 1 + SOUNDTRACK_PLAYLIST.length) % SOUNDTRACK_PLAYLIST.length);
    setProgressSec(0);
  };

  // Real-time Canvas Equalizer animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barCount = 24;
      const barWidth = canvas.width / barCount - 2;

      for (let i = 0; i < barCount; i++) {
        let height = 4;
        if (isPlaying) {
          const profileVal = currentTrack.freqProfile[i % currentTrack.freqProfile.length] || 50;
          const osc = Math.sin(phase + i * 0.4) * 0.5 + 0.5;
          height = Math.max(4, (profileVal / 100) * canvas.height * osc);
        }

        const x = i * (barWidth + 2);
        const y = canvas.height - height;

        // Gradient bar
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        gradient.addColorStop(0, '#06b6d4'); // Cyan
        gradient.addColorStop(0.5, '#a855f7'); // Purple
        gradient.addColorStop(1, '#ec4899'); // Pink

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, height, 2);
        ctx.fill();
      }

      if (isPlaying) phase += 0.08;
      animRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, currentTrack]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* Floating Bottom Ambient Music Dock */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[440px] z-50 rounded-3xl surface-1 border border-border/60 backdrop-blur-2xl shadow-2xl p-3 font-sans text-foreground select-none"
      >
        <div className="flex items-center gap-3">
          {/* Spinning Album Artwork */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative cursor-pointer group shrink-0"
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl overflow-hidden border border-border/40 shadow-md transition-transform",
              isPlaying && "animate-[spin_8s_linear_infinite]"
            )}>
              <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
              <Disc className="w-5 h-5" />
            </div>
          </div>

          {/* Track Info & Equalizer */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h5 className="font-display font-bold text-xs text-foreground truncate">{currentTrack.title}</h5>
              <span className="text-[0.62rem] font-mono text-muted-foreground shrink-0">{formatTime(progressSec)} / {formatTime(currentTrack.durationSec)}</span>
            </div>
            <p className="text-[0.68rem] text-muted-foreground font-mono truncate">{currentTrack.artist}</p>

            {/* Real-time Canvas Waveform */}
            <div className="h-4 w-full mt-1">
              <canvas ref={canvasRef} width={280} height={16} className="w-full h-full block" />
            </div>
          </div>

          {/* Player Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={handleTogglePlay}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center shadow-md glow-neon-primary hover:scale-105 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <button
              onClick={handleNext}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowQueue(!showQueue)}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <ListMusic className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable Playlist Drawer */}
        <AnimatePresence>
          {showQueue && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border/40 mt-3 pt-3 space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold text-muted-foreground uppercase px-1">
                <span>Ambient Audio Stream Queue ({SOUNDTRACK_PLAYLIST.length})</span>
                <button onClick={() => setShowQueue(false)} className="hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {SOUNDTRACK_PLAYLIST.map((t, idx) => {
                  const isCurrent = idx === currentTrackIndex;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        sounds.playPop();
                        setCurrentTrackIndex(idx);
                        setProgressSec(0);
                        setIsPlaying(true);
                      }}
                      className={cn(
                        "p-2 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-all",
                        isCurrent ? "bg-primary/20 border border-primary/40 font-bold" : "hover:bg-muted/40"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="w-7 h-7 rounded-lg shrink-0">
                          <AvatarImage src={t.coverUrl} />
                          <AvatarFallback>{t.title.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-foreground leading-tight">{t.title}</div>
                          <div className="text-[0.62rem] text-muted-foreground font-mono">{t.artist}</div>
                        </div>
                      </div>

                      <span className="text-[0.65rem] font-mono text-muted-foreground shrink-0">{formatTime(t.durationSec)}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
