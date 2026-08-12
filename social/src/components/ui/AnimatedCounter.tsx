import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (n: number) => string;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

export function AnimatedCounter({ value, duration = 1200, className, formatter = formatCompact }: AnimatedCounterProps) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLSpanElement>(null);
  const currentValue = useRef(0);
  const hasEnteredView = useRef(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;

    if (reduceMotion) {
      currentValue.current = value;
      setDisplay(formatter(value));
      return;
    }

    let animationFrame = 0;
    let observer: IntersectionObserver | undefined;

    const animateToValue = () => {
      const startValue = currentValue.current;
      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextValue = Math.round(startValue + (value - startValue) * eased);

        currentValue.current = nextValue;
        setDisplay(formatter(nextValue));

        if (progress < 1) {
          animationFrame = requestAnimationFrame(tick);
        } else {
          currentValue.current = value;
        }
      };

      animationFrame = requestAnimationFrame(tick);
    };

    if (hasEnteredView.current) {
      animateToValue();
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || hasEnteredView.current) return;

          hasEnteredView.current = true;
          observer?.disconnect();
          animateToValue();
        },
        { threshold: 0.3 }
      );

      observer.observe(ref.current);
    }

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(animationFrame);
    };
  }, [value, duration, formatter, reduceMotion]);

  return <span ref={ref} className={cn('tabular-nums', className)}>{display}</span>;
}
