import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff, 
  RotateCcw, Sparkles, Volume2, VolumeX, Shield, Maximize2 
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';

interface WebRtcCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerUser: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
  callType?: 'video' | 'audio';
}

export function WebRtcCallModal({ isOpen, onClose, peerUser, callType = 'video' }: WebRtcCallModalProps) {
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize camera for video call
  useEffect(() => {
    if (!isOpen) return;

    setCallStatus('calling');
    setCallDuration(0);

    // Play ringing chime
    sounds.playChime();

    // Auto-connect simulated call after 3 seconds
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
      sounds.playPop();
    }, 2800);

    // Setup local media if available
    const initLocalMedia = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && callType === 'video') {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode },
            audio: true,
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play();
          }
        }
      } catch {
        // Fallback simulated call
      }
    };

    initLocalMedia();

    return () => {
      clearTimeout(connectTimer);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [isOpen, callType, facingMode]);

  // Call duration counter
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const handleEndCall = () => {
    sounds.playPop();
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const displayName = peerUser.displayName || peerUser.username || 'Friend';
  const initialLetter = (displayName || 'U').charAt(0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleEndCall(); }}>
      <DialogContent className="max-w-md h-[88vh] max-h-[720px] p-0 overflow-hidden rounded-3xl glass-heavy border border-primary/40 flex flex-col font-sans text-white bg-black">
        
        {/* Call Canvas Container */}
        <div className="relative w-full h-full flex flex-col justify-between p-6">
          
          {/* Background simulated remote video stream */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-purple-950/40 to-black overflow-hidden pointer-events-none">
            {callStatus === 'connected' && !isVideoOff ? (
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop"
                className="w-full h-full object-cover opacity-80"
                alt="Remote Peer Video"
              />
            ) : (
              <div className="absolute inset-0 aurora-bg opacity-30" />
            )}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          </div>

          {/* Top Call Info & Timer */}
          <div className="relative z-20 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-mono">
              <span className={cn("w-2 h-2 rounded-full", callStatus === 'connected' ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping")} />
              {callStatus === 'connected' ? formatTimer(callDuration) : 'Calling encrypted WebRTC…'}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-[0.68rem] font-mono font-bold">
              <Shield className="w-3 h-3" /> E2EE P2P 🇮🇳
            </div>
          </div>

          {/* Center Peer Identity Card (When Calling or Audio Mode) */}
          {(callStatus === 'calling' || isVideoOff) && (
            <div className="relative z-20 flex flex-col items-center justify-center text-center space-y-4 py-8">
              <div className="relative">
                <Avatar className="w-28 h-28 border-4 border-primary shadow-2xl ring-8 ring-primary/20">
                  <AvatarImage src={peerUser.avatarUrl} />
                  <AvatarFallback className="font-display font-black text-3xl">{initialLetter}</AvatarFallback>
                </Avatar>
                {callStatus === 'calling' && (
                  <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-40" />
                )}
              </div>

              <div>
                <h3 className="font-display font-black text-2xl text-white">{displayName}</h3>
                <p className="text-xs text-white/70 font-mono mt-1">@{peerUser.username}</p>
              </div>
            </div>
          )}

          {/* PiP Local Camera Preview */}
          {callStatus === 'connected' && !isVideoOff && (
            <motion.div
              drag
              dragConstraints={{ left: -100, right: 100, top: -200, bottom: 200 }}
              className="absolute top-16 right-4 z-30 w-28 h-40 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-2xl bg-zinc-900 cursor-grab"
            >
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </motion.div>
          )}

          {/* Bottom Action Controls Bar */}
          <div className="relative z-20 flex items-center justify-center gap-4 pt-6">
            {/* Toggle Mute */}
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                sounds.playPop();
              }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer",
                isMuted ? "bg-red-500 text-white" : "bg-black/60 text-white hover:bg-black/80"
              )}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Toggle Video */}
            <button
              onClick={() => {
                setIsVideoOff(!isVideoOff);
                sounds.playPop();
              }}
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer",
                isVideoOff ? "bg-red-500 text-white" : "bg-black/60 text-white hover:bg-black/80"
              )}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Flip Camera */}
            <button
              onClick={() => setFacingMode((f) => (f === 'user' ? 'environment' : 'user'))}
              className="w-12 h-12 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <PhoneOff className="w-6 h-6 fill-white" />
            </button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
