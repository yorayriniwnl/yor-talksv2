import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OperatorPanelProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean;
  interactive?: boolean;
}

export function OperatorPanel({ raised = false, interactive = false, className, ...props }: OperatorPanelProps) {
  return (
    <div
      className={cn(
        'operator-panel',
        raised && 'operator-panel--raised',
        interactive && 'operator-panel--interactive',
        className,
      )}
      {...props}
    />
  );
}
