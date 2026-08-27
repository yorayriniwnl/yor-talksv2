import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricProps extends HTMLAttributes<HTMLDivElement> {
  value: ReactNode;
  label: ReactNode;
}

export function Metric({ value, label, className, ...props }: MetricProps) {
  return (
    <div className={cn('operator-metric', className)} {...props}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
