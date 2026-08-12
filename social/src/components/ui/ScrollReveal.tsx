import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

const directionMap = {
  up: { y: 24, x: 0 },
  down: { y: -24, x: 0 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
};

export function ScrollReveal({ children, className, delay = 0, direction = 'up' }: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const reduceMotion = useReducedMotion();
  const offset = directionMap[direction];

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial={reduceMotion ? false : { opacity: 0, x: offset.x, y: offset.y }}
      animate={reduceMotion || isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: offset.x, y: offset.y }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
