import { Label } from '@/components/ui/label';
import { CONTENT_RATING_OPTIONS, type ContentRating } from '@/lib/content-rating';

interface ContentRatingSelectProps {
  id: string;
  value: ContentRating;
  onChange: (value: ContentRating) => void;
  label?: string;
}

export function ContentRatingSelect({ id, value, onChange, label = 'Safety rating' }: ContentRatingSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-mono uppercase text-muted-foreground">{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as ContentRating)}
        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm font-medium"
      >
        {CONTENT_RATING_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label} · {option.description}</option>
        ))}
      </select>
    </div>
  );
}
