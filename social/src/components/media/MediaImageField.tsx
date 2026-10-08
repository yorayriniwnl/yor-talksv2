import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp';
const IMAGE_TYPES = new Set(IMAGE_UPLOAD_ACCEPT.split(','));

export function MediaImageField({ id, label, files, onChange, multiple = false, disabled = false, maxBytes = 2 * 1024 * 1024 }: {
  id: string;
  label: string;
  files: readonly File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  maxBytes?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  return <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Input ref={inputRef} id={id} type="file" accept={IMAGE_UPLOAD_ACCEPT} multiple={multiple} disabled={disabled}
      aria-describedby={error ? `${id}-error` : `${id}-help`}
      onChange={event => {
        const selected = Array.from(event.target.files ?? []);
        if (selected.some(file => !IMAGE_TYPES.has(file.type))) {
          setError('Choose a static JPEG, PNG or WebP image. Animated images are unavailable.');
          event.target.value = '';
          return;
        }
        if (selected.length > 10 || selected.some(file => file.size === 0 || file.size > maxBytes)) {
          setError(`Choose up to ten images containing data, each ${maxBytes / 1024 / 1024} MB or smaller.`);
          event.target.value = '';
          return;
        }
        setError('');
        onChange(multiple ? selected : selected.slice(0, 1));
      }} />
    <p id={`${id}-help`} className="text-xs text-muted-foreground">Static JPEG, PNG or WebP images are checked before publication. Each file can be up to {maxBytes / 1024 / 1024} MB.</p>
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{error}</p>}
    {files.length > 0 && <div className="flex flex-wrap gap-2">
      {files.map((file, index) => <figure key={`${file.name}-${file.lastModified}-${index}`} className="space-y-1">
        {previews[index] && <img src={previews[index]} alt={`Selected ${label.toLowerCase()}`} className="h-20 w-20 rounded-lg object-cover" />}
        <figcaption className="max-w-40 truncate text-xs text-muted-foreground">{file.name}</figcaption>
      </figure>)}
      <button type="button" disabled={disabled} className="text-xs underline" onClick={() => {
        onChange([]);
        setError('');
        if (inputRef.current) inputRef.current.value = '';
      }}>Remove {files.length === 1 ? 'image' : 'images'}</button>
    </div>}
  </div>;
}
