import { Label } from '@/components/ui/label';
import { CONTENT_CATEGORIES, type ContentCategory } from '@/lib/content-category';

interface ContentCategorySelectProps {
  id: string;
  value: ContentCategory | '';
  onChange: (value: ContentCategory | '') => void;
}

export function ContentCategorySelect({ id, value, onChange }: ContentCategorySelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-mono uppercase text-muted-foreground">
        Category <span className="text-destructive">*</span>
      </Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as ContentCategory | '')}
        required
        className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-medium"
      >
        <option value="">Choose a category before publishing…</option>
        {CONTENT_CATEGORIES.map((category) => (
          <option key={category.value} value={category.value}>
            {category.emoji} {category.label}
          </option>
        ))}
      </select>
    </div>
  );
}

