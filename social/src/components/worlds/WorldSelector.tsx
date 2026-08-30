import { useEffect, useState } from 'react';
import { Globe2, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WorldPreferencesForm } from '@/components/worlds/WorldPreferencesForm';
import { useAppStore } from '@/lib/store';
import type { WorldPreferences } from '@/lib/world-preferences';
import { cn } from '@/lib/utils';

interface WorldSelectorProps {
  compact?: boolean;
}

export function WorldSelector({ compact = false }: WorldSelectorProps) {
  const preferences = useAppStore((state) => state.worldPreferences);
  const updateWorldPreferences = useAppStore((state) => state.updateWorldPreferences);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WorldPreferences>(preferences);

  useEffect(() => {
    if (open) setDraft(preferences);
  }, [open, preferences]);

  const save = () => {
    updateWorldPreferences(draft);
    setOpen(false);
    toast.success(`Your ${draft.worldLabel} world is ready`, { description: `${draft.language} · ${draft.timezone} · ${draft.discoveryRadius} discovery` });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('world-selector-button inline-flex min-w-0 items-center gap-2 rounded-2xl border border-border/50 bg-background/45 text-left text-xs font-bold transition hover:border-primary/50 hover:bg-primary/5', compact ? 'px-2.5 py-2' : 'px-3 py-2.5')}
        aria-label={`Open world settings for ${preferences.worldLabel}`}
        data-compact={compact || undefined}
      >
        <Globe2 className="h-4 w-4 shrink-0 text-primary" />
        <span className={cn('world-selector-button__label truncate', compact && 'max-w-20 sm:max-w-28')}>{preferences.worldLabel}</span>
        <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="yor-dialog sm:max-w-[720px]">
          <DialogHeader>
            <span className="yor-eyebrow"><Globe2 className="h-3.5 w-3.5" /> World layer</span>
            <DialogTitle className="text-2xl font-display">Choose how wide Yor feels.</DialogTitle>
            <DialogDescription>Move between nearby life and the wider internet without losing your language, time, or access preferences.</DialogDescription>
          </DialogHeader>
          <div className="pt-3">
            <WorldPreferencesForm value={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} idPrefix="selector-world" compact />
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)} className="rounded-2xl">Cancel</Button>
              <Button onClick={save} className="rounded-2xl font-bold">Save world settings</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
