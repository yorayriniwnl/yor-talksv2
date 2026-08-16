import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface TextRevealProps {
  text: string;
  className?: string;
  delay?: number;
  speed?: number;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*';

export function TextReveal({ text, className, delay = 0, speed = 30 }: TextRevealProps) {
  const [display, setDisplay] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.disconnect();

          setTimeout(() => {
            let iteration = 0;
            const maxIterations = text.length;

            const interval = setInterval(() => {
              setDisplay(
                text
                  .split('')
                  .map((char, i) => {
                    if (char === ' ') return ' ';
                    if (i < iteration) return text[i];
                    return CHARS[Math.floor(Math.random() * CHARS.length)];
                  })
                  .join('')
              );

              iteration += 1 / 2;
              if (iteration >= maxIterations) {
                clearInterval(interval);
                setDisplay(text);
              }
            }, speed);
          }, delay);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [text, delay, speed]);

  return (
    <span ref={ref} className={cn('inline-block', className)} aria-label={text}>
      {display}
    </span>
  );
}
