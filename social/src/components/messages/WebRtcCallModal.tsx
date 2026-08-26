import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PhoneOff, Mic, MicOff, Video, VideoOff, RotateCcw, Shield
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  const [callStatus, setCallStatus] = useState<'calling' | 'ended'>('calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize camera for video call
  useEffect(() => {
    if (!isOpen) return;

    setCallStatus('calling');

    // Play ringing chime
    sounds.playChime();

    setMediaReady(false);
    setMediaError(null);

    // Only request a local preview. Direct-call signaling is intentionally not
    // No remote peer is shown until a signaling provider establishes a real connection.
    const initLocalMedia = async () => {
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: callType === 'video' ? { facingMode } : false,
            audio: true,
          });
          localStreamRef.current = stream;
          setMediaReady(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play();
          }
        }
      } catch (error) {
        setMediaError(error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Allow microphone/camera access to preview your media.'
          : 'Your microphone/camera could not be opened.');
      }
    };

    initLocalMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [isOpen, callType, facingMode]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => { track.enabled = !isMuted; });
    stream.getVideoTracks().forEach((track) => { track.enabled = !isVideoOff; });
  }, [isMuted, isVideoOff, mediaReady]);

  const handleEndCall = () => {
    sounds.playPop();
    setCallStatus('ended');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const displayName = peerUser.displayName || peerUser.username || 'Friend';
  const initialLetter = (displayName || 'U').charAt(0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleEndCall(); }}>
      <DialogContent className="max-w-md h-[88vh] max-h-[720px] p-0 overflow-hidden rounded-3xl glass-heavy border border-primary/40 flex flex-col font-sans text-white bg-black">
        
        {/* Call Canvas Container */}
        <div className="relative w-full h-full flex flex-col justify-between p-6">
          
          {/* No remote stream is rendered until a peer connection is established. */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-purple-950/40 to-black overflow-hidden pointer-events-none">
            <div className="absolute inset-0 aurora-bg opacity-30" />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          </div>

          {/* Top Call Info & Timer */}
          <div className="relative z-20 flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-mono">
            <span className={cn("w-2 h-2 rounded-full", callStatus === 'ended' ? "bg-zinc-500" : "bg-amber-400 animate-ping")} />
              {callStatus === 'ended' ? 'Call ended' : 'Waiting for peer…'}
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-[0.68rem] font-mono font-bold">
              <Shield className="w-3 h-3" /> Signaling required
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
                <p className="mt-3 max-w-[18rem] text-xs leading-relaxed text-white/70">Direct calls are waiting for a signaling service. This screen will not pretend that a remote participant connected.</p>
                {mediaError && <p className="mt-2 max-w-[18rem] text-xs leading-relaxed text-amber-300">{mediaError}</p>}
              </div>
            </div>
          )}

          {/* PiP Local Camera Preview */}
          {mediaReady && !isVideoOff && (
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

            {/* Close the honest waiting state until direct-call signaling is configured. */}
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
