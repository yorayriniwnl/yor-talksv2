import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type SignalTone = 'signal' | 'online' | 'muted' | 'ember';

interface SignalLabelProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: SignalTone;
}

export function SignalLabel({ tone = 'signal', className, ...props }: SignalLabelProps) {
  return <span className={cn('operator-signal-label', className)} data-tone={tone} {...props} />;
}
