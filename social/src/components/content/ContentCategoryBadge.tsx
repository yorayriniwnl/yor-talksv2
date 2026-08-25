import { cn } from '@/lib/utils';
import { resolveContentCategory } from '@/lib/content-category';

interface ContentCategoryBadgeProps {
  value?: string;
  className?: string;
}

export function ContentCategoryBadge({ value, className }: ContentCategoryBadgeProps) {
  const category = resolveContentCategory(value);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[0.62rem] font-semibold text-primary',
        className,
      )}
    >
      <span aria-hidden="true">{category.emoji}</span>
      {category.label}
    </span>
  );
}
