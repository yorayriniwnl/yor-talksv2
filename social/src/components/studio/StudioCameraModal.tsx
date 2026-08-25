import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Video, Sparkles, Music, Sliders, RotateCcw, 
  Check, X, Zap, Radio, Smile, Type, Volume2, VolumeX, 
  Send, Layers, Wand2, Flame, Heart, Compass, MapPin, 
  HelpCircle, BarChart2, Clock, Globe, ArrowRight, Play, Square
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import { sounds } from '@/lib/sound';
import { triggerConfetti } from '@/components/ui/ConfettiBlast';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ContentRatingSelect } from '@/components/content/ContentRatingSelect';
import { DEFAULT_CONTENT_RATING, type ContentRating } from '@/lib/content-rating';
import { ContentCategorySelect } from '@/components/content/ContentCategorySelect';
import { type ContentCategory } from '@/lib/content-category';

interface StudioCameraModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: 'reel' | 'story' | 'post';
  initialAudioTrack?: { title: string; artist: string; url?: string };
}

const CINEMATIC_FILTERS = [
  { id: 'normal', name: 'Original', css: '', icon: '✨' },
  { id: 'cyberpunk', name: 'Cyber Neon', css: 'contrast(125%) saturate(150%) hue-rotate(330deg) brightness(105%)', icon: '🌆' },
  { id: 'bharat_gold', name: 'Bharat Gold', css: 'sepia(35%) saturate(140%) contrast(110%) brightness(108%)', icon: '🌅' },
  { id: 'film_35mm', name: '35mm Analog', css: 'contrast(115%) brightness(95%) saturate(85%) sepia(20%)', icon: '🎞️' },
  { id: 'emerald_noir', name: 'Emerald Noir', css: 'contrast(140%) saturate(130%) hue-rotate(90deg) brightness(95%)', icon: '💎' },
  { id: 'prism_dream', name: 'Prism Bloom', css: 'brightness(115%) saturate(160%) contrast(105%)', icon: '🌈' },
];

const MUSIC_PRESETS = [
  { id: 'm1', title: 'Bharat Cyberpunk Anthem', artist: 'Yor Music AI', duration: '0:30', bpm: 128 },
  { id: 'm2', title: 'Mumbai Sunset Lo-Fi', artist: 'Rooftop Beats', duration: '0:45', bpm: 84 },
  { id: 'm3', title: 'Tabla & Modular Synth Fusion', artist: 'Vedic Pulse', duration: '0:30', bpm: 135 },
  { id: 'm4', title: 'High-Octane Drift Telemetry', artist: 'Apex Sound', duration: '0:15', bpm: 140 },
];

const STICKER_TYPES = [
  { id: 'poll', label: '📊 Interactive Poll', desc: 'Ask viewers to vote' },
  { id: 'question', label: '❓ Ask Me Anything', desc: 'Anonymous Q&A sticker' },
  { id: 'countdown', label: '⏳ Live Countdown', desc: 'Build launch hype' },
  { id: 'location', label: '📍 Bharat Pin', desc: 'Tag your city/region' },
  { id: 'badge', label: '🇮🇳 Bharat Pride', desc: '#BharatMultiverse tag' },
];

export function StudioCameraModal({ isOpen, onOpenChange, defaultMode = 'reel', initialAudioTrack }: StudioCameraModalProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const addPost = useAppStore((s) => s.addPost);
  const addStory = useAppStore((s) => s.addStory);
  const createVideo = useAppStore((s) => s.createVideo);

  const [mode, setMode] = useState<'reel' | 'story' | 'post'>(defaultMode);
  const [selectedFilter, setSelectedFilter] = useState(CINEMATIC_FILTERS[0]);
  const [selectedMusic, setSelectedMusic] = useState(initialAudioTrack || MUSIC_PRESETS[0]);
  const [musicDrawerOpen, setMusicDrawerOpen] = useState(false);
  const [stickersDrawerOpen, setStickersDrawerOpen] = useState(false);

  // Active stickers placed on preview
  const [activeStickers, setActiveStickers] = useState<{ id: string; type: string; data: any; x: number; y: number }[]>([]);
  const [pollQuestion, setPollQuestion] = useState('Which vibe is superior?');
  const [pollOpt1, setPollOpt1] = useState('Cyberpunk 🤖');
  const [pollOpt2, setPollOpt2] = useState('Classic Desi 🪷');
  const [qaPrompt, setQaPrompt] = useState('Ask me anything about this drop…');
  const [locationTag, setLocationTag] = useState('Bengaluru Tech Hub 🇮🇳');

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Publishing form
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [contentCategory, setContentCategory] = useState<ContentCategory | ''>('');
  const [contentRating, setContentRating] = useState<ContentRating>(DEFAULT_CONTENT_RATING);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize camera stream
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      }
    } catch {
      // Camera permission denied or unsupported — smooth fallback preview mode
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 30) {
            handleStopRecording();
            return 30;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = () => {
    sounds.playPop();
    setRecordedChunks([]);
    setRecordedPreviewUrl(null);
    setRecordingSeconds(0);

    if (streamRef.current) {
      try {
        const recorder = new MediaRecorder(streamRef.current);
        mediaRecorderRef.current = recorder;
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setRecordedPreviewUrl(url);
        };
        recorder.start();
      } catch {
        // Mock fallback
      }
    }

    setIsRecording(true);
  };

  const handleStopRecording = () => {
    sounds.playChime();
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    // Set fallback sample URL if camera was not available
    if (!recordedPreviewUrl) {
      setRecordedPreviewUrl('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?q=80&w=1200&auto=format&fit=crop');
    }
  };

  const handleAddSticker = (typeId: string) => {
    sounds.playPop();
    let data: any = {};
    if (typeId === 'poll') data = { question: pollQuestion, opt1: pollOpt1, opt2: pollOpt2, votes1: 0, votes2: 0 };
    if (typeId === 'question') data = { prompt: qaPrompt };
    if (typeId === 'location') data = { location: locationTag };
    if (typeId === 'countdown') data = { title: 'Multiverse Launch', time: '24h 00m' };
    if (typeId === 'badge') data = { tag: '#BharatCreators' };

    setActiveStickers((prev) => [
      ...prev,
      { id: `stk_${Date.now()}`, type: typeId, data, x: 50, y: 50 }
    ]);
    setStickersDrawerOpen(false);
    toast.success('Interactive sticker placed on canvas!');
  };

  const handlePublish = async () => {
    if (!contentCategory) {
      toast.error('Choose a category before publishing.');
      return;
    }
    setPublishing(true);
    sounds.playChime();
    triggerConfetti();

    try {
      const mediaUrl = recordedPreviewUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop';

      if (mode === 'reel') {
        createVideo({
          title: caption.trim() || 'New Cinematic Reel ✨',
          videoUrl: mediaUrl,
          thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
          type: 'short',
          contentCategory,
          contentRating,
        });
        toast.success('🎬 Reel published to the Bharat Reel Swiper!');
      } else if (mode === 'story') {
        addStory({
          type: 'video',
          mediaUrl,
          textContent: caption.trim() || undefined,
          backgroundGradient: 'from-purple-900 via-indigo-900 to-black',
          contentCategory,
          contentRating,
        });
        toast.success('✨ Story added to your 24h highlights!');
      } else {
        addPost(caption.trim() || 'Shared via Yor Talks Studio 🚀', [mediaUrl], undefined, contentRating, contentCategory);
        toast.success('🚀 Published to the global feed!');
      }

      onOpenChange(false);
      // Reset
      setRecordedPreviewUrl(null);
      setCaption('');
      setContentCategory('');
      setContentRating(DEFAULT_CONTENT_RATING);
      setActiveStickers([]);
    } catch {
      toast.error('Failed to publish. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[92vh] max-h-[850px] p-0 overflow-hidden rounded-3xl glass-heavy border border-primary/40 flex flex-col font-sans">
        
        {/* ── TOP ACTION BAR ─────────────────────────────────────────────── */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border/30 glass-heavy z-20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary via-purple-500 to-accent text-white flex items-center justify-center font-bold font-display shadow-md glow-neon-primary text-sm">
              YT
            </div>
            <span className="font-display font-extrabold text-sm text-foreground">Ultra Studio Camera</span>
            <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              PRO 4K 🇮🇳
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 surface-1 p-1 rounded-xl border border-border/40">
            {(['reel', 'story', 'post'] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  sounds.playPop();
                }}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all",
                  mode === m ? "bg-primary text-primary-foreground shadow-md glow-neon-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m === 'reel' ? '🎬 Reel' : m === 'story' ? '⚡ Story' : '📷 Post'}
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 rounded-full hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── MAIN STUDIO WORKSPACE ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* CAMERA / VIEWPORT CANVAS */}
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
            
            {/* Live Video Feed or Fallback Studio Visualizer */}
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "w-full h-full object-cover transition-all duration-300",
                  !cameraActive && "hidden"
                )}
                style={{ filter: selectedFilter.css }}
              />

              {!cameraActive && (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-gradient-to-br from-zinc-950 via-purple-950/40 to-black">
                  <div className="absolute inset-0 aurora-bg opacity-30 pointer-events-none" />
                  <div className="w-24 h-24 rounded-3xl surface-2 border border-primary/30 flex items-center justify-center mb-4 shadow-2xl glow-neon-primary relative z-10 animate-pulse">
                    <Camera className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="font-display font-black text-xl text-foreground relative z-10">
                    Cinematic 4K Simulator Ready
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1 relative z-10 font-sans">
                    Live camera stream will render with real-time WebGL shaders, beats sync, and interactive Bharat stickers.
                  </p>
                </div>
              )}

              {/* Placed Interactive Stickers Overlays */}
              {activeStickers.map((sticker) => (
                <motion.div
                  key={sticker.id}
                  drag
                  dragConstraints={{ left: -150, right: 150, top: -200, bottom: 200 }}
                  className="absolute z-20 cursor-grab active:cursor-grabbing select-none"
                >
                  {sticker.type === 'poll' && (
                    <div className="surface-1/90 backdrop-blur-xl p-3.5 rounded-2xl border-2 border-primary shadow-2xl text-center min-w-[200px]">
                      <span className="text-[0.62rem] font-mono uppercase text-primary font-bold block mb-1">📊 LIVE POLL</span>
                      <h5 className="font-display font-black text-xs text-foreground mb-2">{sticker.data.question}</h5>
                      <div className="space-y-1.5">
                        <div className="p-2 rounded-xl bg-primary/20 text-xs font-bold text-primary border border-primary/40">{sticker.data.opt1}</div>
                        <div className="p-2 rounded-xl bg-muted/60 text-xs font-bold text-foreground border border-border/40">{sticker.data.opt2}</div>
                      </div>
                    </div>
                  )}

                  {sticker.type === 'question' && (
                    <div className="bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 p-3.5 rounded-2xl shadow-2xl text-center text-white min-w-[220px]">
                      <span className="text-[0.62rem] font-mono uppercase font-bold block opacity-80">❓ ANONYMOUS Q&A</span>
                      <h5 className="font-bold text-xs mt-1 mb-2">{sticker.data.prompt}</h5>
                      <div className="bg-white/20 backdrop-blur-md rounded-xl py-1 px-2 text-[0.68rem] text-white/90">
                        Type your question…
                      </div>
                    </div>
                  )}

                  {sticker.type === 'location' && (
                    <div className="surface-1/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/50 text-xs font-bold text-foreground flex items-center gap-1.5 shadow-xl">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" /> {sticker.data.location}
                    </div>
                  )}

                  {sticker.type === 'badge' && (
                    <div className="bg-gradient-to-r from-orange-500 via-white to-emerald-500 text-black px-3.5 py-1.5 rounded-full font-black text-xs shadow-xl tracking-wider uppercase flex items-center gap-1">
                      🇮🇳 {sticker.data.tag}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Recording Overlay & Timer Indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-mono font-bold shadow-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  REC {recordingSeconds}s / 30s
                </div>
              )}

              {/* Active Sound Track Pill */}
              {selectedMusic && (
                <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[0.72rem] font-mono border border-white/10 shadow-lg">
                  <Music className="w-3 h-3 text-primary animate-spin" />
                  <span className="truncate max-w-[140px] font-bold">{selectedMusic.title}</span>
                </div>
              )}
            </div>

            {/* Bottom Camera Trigger Controls */}
            <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-6 z-20">
              <button
                onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
                className="w-11 h-11 rounded-full surface-1/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer"
                title="Flip Camera"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Shutter Button */}
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={cn(
                  "w-18 h-18 rounded-full border-4 flex items-center justify-center shadow-2xl transition-all cursor-pointer",
                  isRecording 
                    ? "border-red-500 bg-red-600 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.8)]" 
                    : "border-white bg-white/20 hover:bg-white/30 backdrop-blur-md hover:scale-105"
                )}
              >
                {isRecording ? (
                  <Square className="w-6 h-6 text-white fill-white" />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-white shadow-inner block" />
                )}
              </button>

              <button
                onClick={() => setStickersDrawerOpen(true)}
                className="w-11 h-11 rounded-full surface-1/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer"
                title="Add Interactive Stickers"
              >
                <Smile className="w-5 h-5 text-amber-400" />
              </button>
            </div>
          </div>

          {/* ── RIGHT STUDIO CONTROLS & PUBLISHING PANEL ─────────────────── */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-border/30 surface-1 p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            
            <div className="space-y-5">
              {/* Filter Shader Selector */}
              <div>
                <label className="text-xs font-mono font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-primary" /> Cinematic Filter LUTs
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CINEMATIC_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => {
                        setSelectedFilter(filter);
                        sounds.playPop();
                      }}
                      className={cn(
                        "p-2 rounded-xl border text-center transition-all cursor-pointer text-xs flex flex-col items-center gap-1",
                        selectedFilter.id === filter.id
                          ? "bg-primary/20 border-primary text-primary font-bold shadow-md"
                          : "surface-2 border-border/40 hover:border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-base">{filter.icon}</span>
                      <span className="text-[0.65rem] truncate w-full">{filter.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Music Library Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-mono font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-primary" /> Background Sound
                  </label>
                  <span className="text-[0.65rem] font-mono text-primary font-bold">128 BPM</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {MUSIC_PRESETS.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => {
                        setSelectedMusic(track);
                        sounds.playPop();
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-xl text-left border text-xs transition-all cursor-pointer",
                        selectedMusic.title === track.title
                          ? "bg-primary/15 border-primary/50 text-foreground font-bold ring-1 ring-primary/30"
                          : "surface-2 border-border/30 hover:border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="truncate text-xs">{track.title}</div>
                        <div className="text-[0.62rem] text-muted-foreground font-mono">{track.artist}</div>
                      </div>
                      <span className="text-[0.65rem] font-mono text-muted-foreground shrink-0">{track.duration}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption & Metadata Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold uppercase text-muted-foreground">
                  Caption & #Tags
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder={`Write a description for this ${mode}… #BharatMultiverse #YorTalks`}
                  className="w-full h-20 rounded-xl surface-2 border border-border/40 p-2.5 text-xs outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground resize-none font-sans"
                />
              </div>
              <ContentCategorySelect id="studio-content-category" value={contentCategory} onChange={setContentCategory} />
              <ContentRatingSelect id="studio-content-rating" value={contentRating} onChange={setContentRating} />
            </div>

            {/* Publishing Footer Button */}
            <div className="pt-4 border-t border-border/30">
              <Button
                onClick={handlePublish}
                disabled={publishing || !contentCategory}
                className="w-full rounded-2xl font-display font-extrabold text-xs h-12 bg-gradient-to-r from-primary via-purple-600 to-accent text-white glow-neon-primary shadow-xl cursor-pointer"
              >
                <Send className="w-4 h-4 mr-1.5" />
                {publishing ? 'Rendering 4K…' : `Publish ${mode.toUpperCase()} 🚀`}
              </Button>
            </div>
          </div>
        </div>

        {/* ── STICKERS DRAWER POPUP ───────────────────────────────────────── */}
        <AnimatePresence>
          {stickersDrawerOpen && (
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              className="absolute inset-x-0 bottom-0 z-50 glass-heavy border-t border-primary/30 p-5 rounded-t-3xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                  <Smile className="w-4 h-4 text-amber-400" /> Choose Interactive Sticker
                </h4>
                <button onClick={() => setStickersDrawerOpen(false)} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {STICKER_TYPES.map((stk) => (
                  <button
                    key={stk.id}
                    onClick={() => handleAddSticker(stk.id)}
                    className="p-3 rounded-2xl surface-2 border border-border/50 hover:border-primary/50 text-left transition-all hover-lift cursor-pointer"
                  >
                    <span className="font-bold text-xs text-foreground block">{stk.label}</span>
                    <span className="text-[0.68rem] text-muted-foreground font-sans mt-0.5 block">{stk.desc}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </DialogContent>
    </Dialog>
  );
}
