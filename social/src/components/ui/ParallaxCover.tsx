import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ParallaxCoverProps {
  children: ReactNode;
  className?: string;
  speed?: number;
}

export function ParallaxCover({ children, className, speed = 0.3 }: ParallaxCoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = -rect.top * speed;
      setOffset(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          transform: `translateY(${offset}px)`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
