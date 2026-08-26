import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { PhoneOff, Mic, MicOff, Video, VideoOff, RotateCcw, Shield, Phone, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sounds } from '@/lib/sound';
import { cn } from '@/lib/utils';
import { connectSocket } from '@/lib/socket-client';

interface CallPeer {
  id: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

interface IncomingCall {
  callId: string;
  callType: 'video' | 'audio';
  offer: RTCSessionDescriptionInit;
}

interface WebRtcCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerUser: CallPeer;
  callType?: 'video' | 'audio';
  incomingCall?: IncomingCall;
}

type CallStatus = 'incoming' | 'calling' | 'connecting' | 'connected' | 'ended';

function createCallId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `call-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getIceServers(): RTCIceServer[] {
  const configured = import.meta.env.VITE_RTC_ICE_SERVERS;
  if (configured) {
    try {
      const parsed = JSON.parse(configured) as RTCIceServer[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // A malformed optional configuration should fall back to the public STUN server.
    }
  }
  return [{ urls: 'stun:stun.l.google.com:19302' }];
}

export function WebRtcCallModal({ isOpen, onClose, peerUser, callType = 'video', incomingCall }: WebRtcCallModalProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>(incomingCall ? 'incoming' : 'calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [remoteReady, setRemoteReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof connectSocket>>(null);
  const callIdRef = useRef(incomingCall?.callId ?? createCallId());
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const endedRef = useRef(false);

  const flushPendingIce = async () => {
    const peerConnection = peerConnectionRef.current;
    if (!peerConnection?.remoteDescription) return;
    const pending = pendingIceRef.current.splice(0);
    await Promise.all(pending.map((candidate) => peerConnection.addIceCandidate(candidate).catch(() => undefined)));
  };

  useEffect(() => {
    if (!isOpen) return;
    const socket = connectSocket();
    socketRef.current = socket;
    endedRef.current = false;
    callIdRef.current = incomingCall?.callId ?? createCallId();
    setCallStatus(incomingCall ? 'incoming' : 'calling');
    setMediaReady(false);
    setRemoteReady(false);
    setMediaError(null);
    sounds.playChime();

    if (!socket) {
      setMediaError('Realtime calling is unavailable on this deployment.');
      setCallStatus('ended');
      return;
    }

    const peerConnection = new RTCPeerConnection({ iceServers: getIceServers() });
    peerConnectionRef.current = peerConnection;
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) socket.emit('call:ice', { callId: callIdRef.current, candidate: event.candidate.toJSON() });
    };
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        void remoteVideoRef.current.play().catch(() => undefined);
        setRemoteReady(true);
      }
    };
    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === 'connected') setCallStatus('connected');
      if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        setMediaError('The call connection was lost. Check your network and try again.');
        setCallStatus('ended');
      }
    };

    const handleAccepted = (payload: { callId?: unknown }) => {
      if (payload.callId === callIdRef.current) setCallStatus('connecting');
    };
    const handleAnswer = async (payload: { callId?: unknown; answer?: RTCSessionDescriptionInit }) => {
      if (payload.callId !== callIdRef.current || !payload.answer) return;
      try {
        await peerConnection.setRemoteDescription(payload.answer);
        await flushPendingIce();
        setCallStatus('connecting');
      } catch {
        setMediaError('The other device sent an invalid call response.');
      }
    };
    const handleIce = async (payload: { callId?: unknown; candidate?: RTCIceCandidateInit }) => {
      if (payload.callId !== callIdRef.current || !payload.candidate) return;
      if (!peerConnection.remoteDescription) {
        pendingIceRef.current.push(payload.candidate);
        return;
      }
      await peerConnection.addIceCandidate(payload.candidate).catch(() => undefined);
    };
    const handleRejected = (payload: { callId?: unknown }) => {
      if (payload.callId !== callIdRef.current) return;
      setMediaError('The call was declined.');
      setCallStatus('ended');
      window.setTimeout(onClose, 450);
    };
    const handleEnded = (payload: { callId?: unknown }) => {
      if (payload.callId !== callIdRef.current) return;
      setCallStatus('ended');
      window.setTimeout(onClose, 450);
    };
    const handleError = (payload: { error?: unknown }) => {
      if (typeof payload.error === 'string') {
        setMediaError(payload.error);
        setCallStatus('ended');
        window.setTimeout(onClose, 450);
      }
    };
    socket.on('call:accepted', handleAccepted);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice', handleIce);
    socket.on('call:rejected', handleRejected);
    socket.on('call:ended', handleEnded);
    socket.on('call:error', handleError);

    const initialize = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Your browser does not support microphone or camera access.');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video' ? { facingMode } : false,
          audio: true,
        });
        localStreamRef.current = stream;
        stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));
        setMediaReady(true);

        if (incomingCall) {
          await peerConnection.setRemoteDescription(incomingCall.offer);
          await flushPendingIce();
          setCallStatus('incoming');
          return;
        }

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('call:invite', {
          callId: callIdRef.current,
          targetUserId: peerUser.id,
          callType,
          offer: peerConnection.localDescription?.toJSON() ?? offer,
        });
      } catch (error) {
        setMediaError(error instanceof Error ? error.message : 'Your microphone/camera could not be opened.');
        setCallStatus('ended');
      }
    };
    void initialize();

    return () => {
      socket.off('call:accepted', handleAccepted);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice', handleIce);
      socket.off('call:rejected', handleRejected);
      socket.off('call:ended', handleEnded);
      socket.off('call:error', handleError);
      peerConnection.close();
      peerConnectionRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  // A call's media session should be recreated only for a new open/incoming call.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, incomingCall?.callId]);

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      void localVideoRef.current.play().catch(() => undefined);
    }
  }, [mediaReady]);

  useEffect(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => { track.enabled = !isMuted; });
    stream.getVideoTracks().forEach((track) => { track.enabled = !isVideoOff; });
  }, [isMuted, isVideoOff, mediaReady]);

  const closeCall = (rejectIncoming = false) => {
    if (endedRef.current) return;
    endedRef.current = true;
    const socket = socketRef.current;
    if (socket) {
      socket.emit(rejectIncoming ? 'call:reject' : 'call:end', { callId: callIdRef.current });
    }
    sounds.playPop();
    setCallStatus('ended');
    window.setTimeout(onClose, 450);
  };

  const acceptCall = async () => {
    const socket = socketRef.current;
    const peerConnection = peerConnectionRef.current;
    if (!socket || !peerConnection || !mediaReady) {
      setMediaError('Your microphone/camera is not ready yet.');
      return;
    }
    try {
      socket.emit('call:accept', { callId: callIdRef.current });
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('call:answer', { callId: callIdRef.current, answer: peerConnection.localDescription?.toJSON() ?? answer });
      setCallStatus('connecting');
    } catch {
      setMediaError('Could not accept this call.');
    }
  };

  const flipCamera = async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    const track = localStreamRef.current?.getVideoTracks()[0];
    await track?.applyConstraints({ facingMode: next }).catch(() => undefined);
  };

  const displayName = peerUser.displayName || peerUser.username || 'Friend';
  const initialLetter = displayName.charAt(0).toUpperCase();
  const isIncoming = Boolean(incomingCall);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeCall(isIncoming && callStatus === 'incoming'); }}>
      <DialogContent className="max-w-md h-[88vh] max-h-[720px] p-0 overflow-hidden rounded-3xl glass-heavy border border-primary/40 flex flex-col font-sans text-white bg-black">
        <div className="relative w-full h-full flex flex-col justify-between p-6">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-purple-950/40 to-black overflow-hidden pointer-events-none"><div className="absolute inset-0 aurora-bg opacity-30" /><div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" /></div>
          <div className="relative z-20 flex items-center justify-between"><div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs font-mono"><span className={cn('w-2 h-2 rounded-full', callStatus === 'ended' ? 'bg-zinc-500' : callStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping')} />{callStatus === 'incoming' ? 'Incoming call' : callStatus === 'calling' ? 'Calling…' : callStatus === 'connecting' ? 'Connecting…' : callStatus === 'connected' ? 'Connected' : 'Call ended'}</div><div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-[0.68rem] font-mono font-bold"><Shield className="w-3 h-3" /> WebRTC encrypted</div></div>

          {remoteReady ? <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 z-10 w-full h-full object-cover" /> : <div className="relative z-20 flex flex-col items-center justify-center text-center space-y-4 py-8 m-auto"><div className="relative"><Avatar className="w-28 h-28 border-4 border-primary shadow-2xl ring-8 ring-primary/20"><AvatarImage src={peerUser.avatarUrl} /><AvatarFallback className="font-display font-black text-3xl">{initialLetter}</AvatarFallback></Avatar>{callStatus !== 'ended' && <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping opacity-40" />}</div><div><h3 className="font-display font-black text-2xl text-white">{displayName}</h3><p className="text-xs text-white/70 font-mono mt-1">@{peerUser.username}</p><p className="mt-3 max-w-[18rem] text-xs leading-relaxed text-white/70">{callStatus === 'incoming' ? 'Accept to connect your microphone and camera.' : 'Waiting for the other device to join.'}</p>{mediaError && <p className="mt-2 max-w-[18rem] text-xs leading-relaxed text-amber-300">{mediaError}</p>}</div></div>}

          {mediaReady && !isVideoOff && <motion.div drag dragConstraints={{ left: -100, right: 100, top: -200, bottom: 200 }} className="absolute top-16 right-4 z-30 w-28 h-40 rounded-2xl overflow-hidden border-2 border-primary/50 shadow-2xl bg-zinc-900 cursor-grab"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></motion.div>}

          <div className="relative z-20 flex items-center justify-center gap-3 pt-6">{isIncoming && callStatus === 'incoming' && <><button onClick={() => closeCall(true)} className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center"><X className="w-5 h-5" /></button><button onClick={() => void acceptCall()} className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-2xl"><Phone className="w-6 h-6 fill-white" /></button></>}{!isIncoming || callStatus !== 'incoming' ? <><button onClick={() => { setIsMuted(!isMuted); sounds.playPop(); }} className={cn('w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20', isMuted ? 'bg-red-500' : 'bg-black/60')}>{isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</button><button onClick={() => { setIsVideoOff(!isVideoOff); sounds.playPop(); }} className={cn('w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20', isVideoOff ? 'bg-red-500' : 'bg-black/60')}>{isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}</button>{callType === 'video' && <button onClick={() => void flipCamera()} className="w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20"><RotateCcw className="w-5 h-5" /></button>}<button onClick={() => closeCall(false)} className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-2xl"><PhoneOff className="w-6 h-6 fill-white" /></button></> : null}{callStatus === 'ended' && mediaError && <span className="sr-only">{mediaError}</span>}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
