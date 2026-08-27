import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type OperatorStatus = 'online' | 'offline' | 'busy' | 'away';

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: OperatorStatus;
}

export function StatusBadge({ status = 'offline', className, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn('operator-status-badge', className)} data-status={status} {...props}>
      {children ?? status}
    </span>
  );
}
