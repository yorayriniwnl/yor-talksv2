import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  as?: 'div' | 'button';
  onClick?: () => void;
}

export function MagneticButton({ children, className, intensity = 0.3, as: Tag = 'div', onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement | HTMLButtonElement>(null);
  const [transform, setTransform] = useState('');

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * intensity;
    const deltaY = (e.clientY - centerY) * intensity;
    setTransform(`translate(${deltaX}px, ${deltaY}px)`);
  };

  const handleMouseLeave = () => {
    setTransform('');
  };

  return (
    <Tag
      ref={ref as any}
      className={cn('transition-transform duration-300 ease-out will-change-transform', className)}
      style={{ transform: transform || undefined }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}
