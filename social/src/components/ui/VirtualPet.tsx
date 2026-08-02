import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Ghost, Sparkles } from 'lucide-react';
import { useInsanityStore } from '@/lib/insanityStore';

export function VirtualPet() {
  const isInsaneMode = useInsanityStore((state) => state.isInsaneMode);
  const controls = useAnimation();
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    if (!isInsaneMode) return;
    
    const interval = setInterval(() => {
      const newX = Math.random() * (window.innerWidth - 100);
      const newY = Math.random() * (window.innerHeight - 100);
      controls.start({
        x: newX,
        y: newY,
        transition: { duration: 3, ease: 'easeInOut' }
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isInsaneMode, controls]);

  if (!isInsaneMode) return null;

  return (
    <motion.div
      initial={{ x: 100, y: 100, opacity: 0, scale: 0 }}
      animate={controls}
      whileInView={{ opacity: 1, scale: 1 }}
      className="fixed z-[9999] pointer-events-auto cursor-pointer"
      onClick={() => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 1000);
      }}
      drag
      dragConstraints={{ left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight }}
    >
      <motion.div
        animate={isBouncing ? { y: [0, -50, 0], rotate: [0, 180, 360] } : { y: [0, -10, 0] }}
        transition={{ duration: isBouncing ? 0.6 : 2, repeat: isBouncing ? 0 : Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div className="w-16 h-16 bg-primary/20 backdrop-blur-md rounded-full border-2 border-primary/50 flex items-center justify-center glow-neon-primary shadow-2xl overflow-visible">
          <Ghost className="w-8 h-8 text-primary animate-pulse" />
          {isBouncing && <Sparkles className="w-6 h-6 text-accent absolute -top-4 -right-4 animate-spin" />}
        </div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-background/80 text-foreground text-[0.55rem] font-mono px-2 py-1 rounded-full whitespace-nowrap border border-border">
          {isBouncing ? 'WHEEE!' : '*wanders*'}
        </div>
      </motion.div>
    </motion.div>
  );
}
