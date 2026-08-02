import { useInsanityStore } from '@/lib/insanityStore';
import { useEffect } from 'react';

export function CyberpunkOverlay() {
  const isInsaneMode = useInsanityStore((state) => state.isInsaneMode);

  useEffect(() => {
    if (isInsaneMode) {
      document.body.classList.add('insane-cyberpunk');
    } else {
      document.body.classList.remove('insane-cyberpunk');
    }
  }, [isInsaneMode]);

  if (!isInsaneMode) return null;

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none opacity-20 mix-blend-overlay">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] animate-[scanlines_10s_linear_infinite]" />
    </div>
  );
}
