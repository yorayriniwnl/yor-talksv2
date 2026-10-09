import { useEffect, useState } from 'react';
import { WebRtcCallModal } from './WebRtcCallModal';
import { connectSocket } from '@/lib/socket-client';
import { sounds } from '@/lib/sound';

interface IncomingCallState {
  callId: string;
  callType: 'audio' | 'video';
  offer: RTCSessionDescriptionInit;
  caller: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}

/** Keeps incoming calls visible even when the user is browsing another route. */
export function IncomingCallManager() {
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(null);

  useEffect(() => {
    if (!incomingCall) return;

    sounds.playRingtone();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([300, 150, 300]);
    }

    const interval = setInterval(() => {
      sounds.playRingtone();
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([300, 150, 300]);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [incomingCall]);

  useEffect(() => {
    const socket = connectSocket();
    if (!socket) return;

    const handleInvite = (payload: IncomingCallState) => {
      if (!payload?.callId || !payload?.caller?.id || !payload?.offer) return;
      setIncomingCall((current) => current ?? payload);
    };
    const handleEnded = (payload: { callId?: unknown }) => {
      if (payload.callId === incomingCall?.callId) setIncomingCall(null);
    };

    socket.on('call:invite', handleInvite);
    socket.on('call:ended', handleEnded);
    return () => {
      socket.off('call:invite', handleInvite);
      socket.off('call:ended', handleEnded);
    };
  }, [incomingCall?.callId]);

  if (!incomingCall) return null;
  return <WebRtcCallModal isOpen peerUser={incomingCall.caller} callType={incomingCall.callType} incomingCall={incomingCall} onClose={() => setIncomingCall(null)} />;
}
