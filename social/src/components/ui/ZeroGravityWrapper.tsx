import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useInsanityStore } from '@/lib/insanityStore';

interface ZeroGravityWrapperProps {
  children: ReactNode;
  className?: string;
}

export function ZeroGravityWrapper({ children, className }: ZeroGravityWrapperProps) {
  const isInsaneMode = useInsanityStore((state) => state.isInsaneMode);

  if (!isInsaneMode) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      drag
      dragSnapToOrigin={false}
      dragElastic={1.5}
      whileDrag={{ 
        scale: 1.25, 
        rotate: Math.random() * 45 - 22.5,
        cursor: 'grabbing', 
        zIndex: 9999,
        filter: 'brightness(1.5) contrast(1.5) drop-shadow(0px 0px 30px rgba(255, 0, 255, 1))'
      }}
      whileHover={{ scale: 1.05, rotate: Math.random() * 10 - 5 }}
      animate={{
        y: [0, -40 + Math.random() * 80, 20 - Math.random() * 60, 0],
        x: [0, -30 + Math.random() * 60, 30 - Math.random() * 60, 0],
        rotateX: [0, Math.random() * 40 - 20, 0],
        rotateY: [0, Math.random() * 40 - 20, 0],
        rotateZ: [-10 + Math.random() * 20, 10 - Math.random() * 20, -10 + Math.random() * 20],
        scale: [1, 1.05 + Math.random() * 0.1, 0.9 + Math.random() * 0.1, 1],
        filter: [
          'hue-rotate(0deg)', 
          `hue-rotate(${Math.random() * 180 + 90}deg) drop-shadow(0 0 15px rgba(0, 255, 255, 0.6))`, 
          'hue-rotate(360deg)'
        ],
      }}
      transition={{
        duration: 2 + Math.random() * 2, // Faster, chaotic!
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
      }}
      style={{ cursor: 'grab', transformStyle: 'preserve-3d', perspective: '1000px' }}
    >
      {children}
    </motion.div>
  );
}
