/**
 * Motion System — Yor Talks
 *
 * Spring presets, transition configurations, and animation utilities
 * that create the "expensive" feel throughout the app.
 *
 * Every animation serves a purpose:
 * - Guide attention to state changes
 * - Provide tactile feedback
 * - Create spatial continuity
 */

import type { Transition, Variants } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════════
   SPRING PRESETS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Quick, snappy — for UI responses (buttons, toggles, indicators) */
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.8,
};

/** Default — for most transitions (cards, panels, nav) */
export const springGentle: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 28,
  mass: 1,
};

/** Bouncy — for delightful moments (reactions, achievements) */
export const springBouncy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 15,
  mass: 0.8,
};

/** Slow — for dramatic reveals (page transitions, modals) */
export const springSlow: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 30,
  mass: 1.2,
};

/* ═══════════════════════════════════════════════════════════════════════════
   EASING
   ═══════════════════════════════════════════════════════════════════════════ */

/** Apple-style ease out */
export const easeOut: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Smooth ease in-out */
export const easeInOut: [number, number, number, number] = [0.4, 0, 0.2, 1];

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSITION PRESETS
   ═══════════════════════════════════════════════════════════════════════════ */

/** For list items appearing one after another */
export function staggerChildren(staggerDelay = 0.05): Transition & { staggerChildren: number } {
  return {
    staggerChildren: staggerDelay,
    type: 'spring',
    stiffness: 300,
    damping: 28,
  };
}

/** For page-level transitions */
export const pageTransition: Transition = {
  type: 'tween',
  ease: easeOut,
  duration: 0.35,
};

/** For modal/dialog entry */
export const modalTransition: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
  mass: 0.9,
};

/* ═══════════════════════════════════════════════════════════════════════════
   VARIANT PRESETS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Fade in + slide up — for cards, sections */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springGentle,
  },
};

/** Fade in + scale — for modals, popovers */
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springSnappy,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

/** Slide in from right — for panels, sheets */
export const slideInRight: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: springGentle,
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: easeOut },
  },
};

/** Slide in from left — for sidebar */
export const slideInLeft: Variants = {
  hidden: { x: -20, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: springGentle,
  },
};

/** Staggered list container */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.06,
    },
  },
};

/** Staggered list item */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springGentle,
  },
};

/** Scale tap — for buttons, interactive elements */
export const tapScale = {
  whileTap: { scale: 0.96 },
  transition: springSnappy,
};

/** Hover lift — for cards */
export const hoverLift = {
  whileHover: { y: -2, transition: springSnappy },
  whileTap: { y: 0, scale: 0.98, transition: springSnappy },
};

/* ═══════════════════════════════════════════════════════════════════════════
   LAYOUT ANIMATION IDS
   ═══════════════════════════════════════════════════════════════════════════ */

export const layoutIds = {
  navIndicator: 'nav-active-indicator',
  tabIndicator: 'tab-active-indicator',
  avatar: (userId: string) => `avatar-${userId}`,
  postCard: (postId: string) => `post-${postId}`,
} as const;
