import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LevelBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  level: number;
  size?: 'small' | 'default';
}

export function LevelBadge({ level, size = 'default', className, ...props }: LevelBadgeProps) {
  return (
    <span className={cn('operator-level-badge', className)} data-size={size} aria-label={`Level ${level}`} {...props}>
      {level}
    </span>
  );
}
