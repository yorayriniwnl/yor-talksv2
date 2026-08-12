import { useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
}

export function TiltCard({ children, className, intensity = 6 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || reduceMotion) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateX = (0.5 - y) * intensity;
    const rotateY = (x - 0.5) * intensity;
    ref.current.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
  };

  const handleMouseLeave = () => {
    if (!ref.current) return;
    ref.current.style.transform = '';
    ref.current.style.willChange = '';
  };

  const handleMouseEnter = () => {
    if (ref.current && !reduceMotion) ref.current.style.willChange = 'transform';
  };

  return (
    <div
      ref={ref}
      className={cn('transition-transform duration-300 ease-out', className)}
      onMouseEnter={reduceMotion ? undefined : handleMouseEnter}
      onMouseMove={reduceMotion ? undefined : handleMouseMove}
      onMouseLeave={reduceMotion ? undefined : handleMouseLeave}
    >
      {children}
    </div>
  );
}
