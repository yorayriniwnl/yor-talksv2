import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SignalLabel } from './SignalLabel';

interface SectionHeaderProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  headingLevel?: 1 | 2 | 3;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  headingLevel = 2,
  className,
  ...props
}: SectionHeaderProps) {
  const Heading = `h${headingLevel}` as const;

  return (
    <header className={cn('operator-section-header', className)} {...props}>
      <div className="operator-section-header__copy">
        {eyebrow && <SignalLabel>{eyebrow}</SignalLabel>}
        <Heading>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="operator-section-header__action">{action}</div>}
    </header>
  );
}
