import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useInsanityStore } from '@/lib/insanityStore';

export function TerminalInsanity() {
  const isInsaneMode = useInsanityStore((state) => state.isInsaneMode);
  const [showBSOD, setShowBSOD] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isInsaneMode) {
      setShowBSOD(false);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      return;
    }

    // --- FEATURE 1: THE MIRROR (Webcam) ---
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => console.log("Webcam access denied. Good."));

    // --- FEATURE 2: SYMPHONY OF CHAOS (Web Audio API) ---
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtxRef.current && AudioContext) {
      audioCtxRef.current = new AudioContext();
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!audioCtxRef.current || Math.random() > 0.1) return; // Only trigger 10% of the time to avoid immediate crash
      
      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      
      osc.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
      // Map mouse X to frequency (chaotic range)
      osc.frequency.setValueAtTime(100 + (e.clientX % 1000), audioCtxRef.current.currentTime);
      
      gain.gain.setValueAtTime(0.05, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      
      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.5);
    };

    window.addEventListener('mousemove', handleMouseMove);

    // --- FEATURE 3: HARLEM SHAKE ---
    const audio = new Audio('https://s3.amazonaws.com/moovweb-marketing/playground/harlem-shake.mp3');
    audio.volume = 1.0;
    audio.play().catch(() => console.log('Audio autoplay prevented'));

    // --- EXISTING DOM CHAOS ---
    const interval = setInterval(() => {
      const elements = document.querySelectorAll('div, p, span, h1, h2, h3, img, button');
      if (elements.length > 0) {
        const randomEl = elements[Math.floor(Math.random() * elements.length)] as HTMLElement;
        if (randomEl && randomEl.style && !randomEl.classList.contains('do-not-destroy')) {
          randomEl.style.transform = `rotate(${Math.random() * 720 - 360}deg) scale(${0.5 + Math.random() * 2}) skew(${Math.random() * 45}deg)`;
          randomEl.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
          randomEl.style.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
          randomEl.style.filter = `blur(${Math.random() * 5}px) invert(${Math.random() > 0.5 ? 1 : 0})`;
          randomEl.style.transition = 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          randomEl.style.position = 'relative';
          randomEl.style.zIndex = `${Math.floor(Math.random() * 50)}`;
        }
      }
    }, 50);

    document.body.style.animation = 'barrelRoll 3s infinite linear';

    // Trigger BSOD after 15 seconds (when the bass drops)
    const bsodTimer = setTimeout(() => {
      setShowBSOD(true);
      document.body.style.animation = '';
      if (audioCtxRef.current) audioCtxRef.current.close();
      audio.pause();
    }, 15000);

    return () => {
      clearInterval(interval);
      clearTimeout(bsodTimer);
      document.body.style.animation = '';
      window.removeEventListener('mousemove', handleMouseMove);
      audio.pause();
      if (audioCtxRef.current) {
         audioCtxRef.current.close();
         audioCtxRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
          tracks.forEach(track => track.stop());
      }
    };
  }, [isInsaneMode]);

  if (!isInsaneMode) return null;

  if (showBSOD) {
    return (
      <div className="fixed inset-0 z-[9999999] bg-[#0000AA] text-white font-mono p-12 sm:p-24 flex flex-col justify-start overflow-hidden do-not-destroy">
        <div className="max-w-4xl mx-auto w-full space-y-8 do-not-destroy">
          <div className="bg-white text-[#0000AA] inline-block px-2 py-0.5 font-bold mb-8 do-not-destroy">Windows</div>
          <p className="text-xl sm:text-2xl leading-relaxed do-not-destroy">
            A fatal exception 0E has occurred at 028:C0011E36 in UXD <br/>
            YOR_TALKS_INSANITY_MODE. The current application will be terminated.
          </p>
          <ul className="list-disc pl-8 space-y-4 text-lg sm:text-xl do-not-destroy">
            <li className="do-not-destroy">Press CTRL+ALT+DEL again to restart your computer. You will lose any unsaved information in all applications.</li>
            <li className="do-not-destroy">You asked if it could be made more insane. We warned you.</li>
          </ul>
          <p className="pt-12 text-center text-lg do-not-destroy">
            Press any key to continue _
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-none flex items-center justify-center mix-blend-exclusion do-not-destroy overflow-hidden">
       {/* THE MIRROR */}
       <video 
         ref={videoRef} 
         autoPlay 
         playsInline 
         muted 
         className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay do-not-destroy"
       />

       {/* THE VOID (Iframe recursion - limited to 1 for safety, styled infinitely) */}
       <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none do-not-destroy">
         <iframe src="/" className="w-1/2 h-1/2 border-4 border-red-500 animate-spin do-not-destroy" style={{ animationDuration: '10s' }} />
       </div>

       <motion.div 
         animate={{ scale: [1, 3, 1], rotate: [0, -360, 0] }}
         transition={{ duration: 0.8, repeat: Infinity }}
         className="do-not-destroy relative z-50"
       >
         <h1 className="text-[12vw] font-black text-red-500 whitespace-nowrap do-not-destroy drop-shadow-[0_0_100px_rgba(255,0,0,1)] text-center leading-none">
           APOCALYPSE<br/>MODE
         </h1>
       </motion.div>
    </div>
  );
}
