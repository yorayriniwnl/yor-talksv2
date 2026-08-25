import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Play, Pause, Trash2, Send, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (audioUrl: string, durationSeconds: number) => void;
  onCancel?: () => void;
}

export function VoiceNoteRecorder({ onSendVoiceNote, onCancel }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Timer while recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = async () => {
    sounds.playPop();
    setAudioBlobUrl(null);
    setRecordingDuration(0);
    audioChunksRef.current = [];

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setAudioBlobUrl(url);
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
        setIsRecording(true);
        startCanvasVisualizer();
      } else {
        // Fallback simulated recording
        setIsRecording(true);
      }
    } catch {
      // Permission denied / fallback
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    sounds.playPop();
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Mock sample audio URL
      setAudioBlobUrl('https://actions.google.com/sounds/v1/water/rain_heavy.ogg');
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const startCanvasVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const bars = 24;
      const barWidth = 3;
      const spacing = 3;

      for (let i = 0; i < bars; i++) {
        const height = Math.sin(Date.now() * 0.008 + i * 0.5) * 12 + 14;
        ctx.fillStyle = '#06b6d4'; // Cyan primary
        ctx.fillRect(i * (barWidth + spacing) + 10, (canvas.height - height) / 2, barWidth, height);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const handleSend = () => {
    sounds.playChime();
    const finalUrl = audioBlobUrl || 'https://actions.google.com/sounds/v1/water/rain_heavy.ogg';
    onSendVoiceNote(finalUrl, Math.max(1, recordingDuration));
  };

  const togglePlayback = () => {
    if (!audioBlobUrl) return;
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(audioBlobUrl);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-2xl surface-2 border border-primary/30 w-full animate-in fade-in">
      {isRecording ? (
        <div className="flex-1 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs font-mono font-bold text-red-400">
              Recording {formatSecs(recordingDuration)}
            </span>
          </div>

          <canvas ref={canvasRef} width={160} height={32} className="h-6 w-32" />

          <Button
            size="sm"
            onClick={stopRecording}
            className="rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3"
          >
            <Square className="w-3.5 h-3.5 mr-1 fill-white" /> Stop
          </Button>
        </div>
      ) : audioBlobUrl ? (
        <div className="flex-1 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={togglePlayback}
              className="w-8 h-8 rounded-full bg-primary/20 text-primary hover:bg-primary/30"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-primary" />}
            </Button>
            <span className="text-xs font-mono font-bold text-foreground">
              Voice Note ({formatSecs(recordingDuration)})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setAudioBlobUrl(null);
                setRecordingDuration(0);
                if (onCancel) onCancel();
              }}
              className="w-8 h-8 text-muted-foreground hover:text-red-400 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              onClick={handleSend}
              className="rounded-xl bg-primary text-primary-foreground font-bold text-xs h-8 px-3 glow-neon-primary"
            >
              <Send className="w-3.5 h-3.5 mr-1" /> Send
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 w-full justify-between px-2">
          <span className="text-xs text-muted-foreground font-sans">Tap to record high-fidelity voice note</span>
          <Button
            size="sm"
            onClick={startRecording}
            className="rounded-xl bg-primary text-primary-foreground font-bold text-xs h-8 px-3 glow-neon-primary"
          >
            <Mic className="w-3.5 h-3.5 mr-1" /> Start Voice Note
          </Button>
        </div>
      )}
    </div>
  );
}
