import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Kept as a compatibility wrapper for existing feed cards. Perspective tilt
 * makes reading and hitting controls less comfortable, so the premium shell
 * uses a small, stable elevation instead.
 */
export function TiltCard({ children, className }: TiltCardProps) {
  return <div className={cn('premium-interactive-card', className)}>{children}</div>;
}
