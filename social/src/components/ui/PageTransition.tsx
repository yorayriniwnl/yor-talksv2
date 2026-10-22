import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import type { ReactNode } from 'react';
import { useAppReducedMotion } from '@/components/accessibility/AccessibilityProvider';

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.16,
      ease: [0.4, 0, 1, 1],
    },
  },
};

export function PageTransition({ children }: PageTransitionProps) {
  const [location] = useLocation();
  const previousLocation = useRef(location);
  const reduceMotion = useAppReducedMotion();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (previousLocation.current === location) return;
    previousLocation.current = location;
    const frame = window.requestAnimationFrame(() => {
      if (!document.querySelector('[role="dialog"][data-state="open"]')) {
        document.getElementById('main-content')?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        variants={reduceMotion ? { enter: { opacity: 1, y: 0, transition: { duration: 0 } }, exit: { opacity: 1, transition: { duration: 0 } } } : pageVariants}
        initial={reduceMotion ? false : 'initial'}
        animate="enter"
        exit="exit"
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
