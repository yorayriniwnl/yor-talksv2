import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bird, Bot, Check, ChevronDown, Palette, Sparkles, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

const STORAGE_KEY = 'yor-companion-pet';
const CHANGE_EVENT = 'yor-companion-pet-change';

export type CompanionPetKind = 'bird' | 'robot';
export type CompanionPetColor = 'sunrise' | 'ocean' | 'violet' | 'mint';
export type CompanionPetSize = 'small' | 'medium' | 'large';

export interface CompanionPetPreferences {
  enabled: boolean;
  kind: CompanionPetKind;
  color: CompanionPetColor;
  size: CompanionPetSize;
}

export const DEFAULT_COMPANION_PET: CompanionPetPreferences = {
  enabled: true,
  kind: 'bird',
  color: 'sunrise',
  size: 'medium',
};

export const COMPANION_PET_OPTIONS: Array<{ kind: CompanionPetKind; label: string; description: string }> = [
  { kind: 'bird', label: 'Sky bird', description: 'A curious little signal scout' },
  { kind: 'robot', label: 'Orbit bot', description: 'A tiny helper from the next world' },
];

export const COMPANION_PET_COLORS: Array<{ value: CompanionPetColor; label: string; className: string }> = [
  { value: 'sunrise', label: 'Sunrise', className: 'bg-gradient-to-br from-amber-300 to-rose-500' },
  { value: 'ocean', label: 'Ocean', className: 'bg-gradient-to-br from-cyan-300 to-blue-600' },
  { value: 'violet', label: 'Violet', className: 'bg-gradient-to-br from-fuchsia-300 to-violet-700' },
  { value: 'mint', label: 'Mint', className: 'bg-gradient-to-br from-emerald-200 to-teal-600' },
];

export const COMPANION_PET_SIZES: Array<{ value: CompanionPetSize; label: string }> = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

function isPetKind(value: unknown): value is CompanionPetKind {
  return value === 'bird' || value === 'robot';
}

function isPetColor(value: unknown): value is CompanionPetColor {
  return value === 'sunrise' || value === 'ocean' || value === 'violet' || value === 'mint';
}

function isPetSize(value: unknown): value is CompanionPetSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

function readPreferences(): CompanionPetPreferences {
  if (typeof window === 'undefined') return DEFAULT_COMPANION_PET;
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') as Partial<CompanionPetPreferences>;
    return {
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_COMPANION_PET.enabled,
      kind: isPetKind(raw.kind) ? raw.kind : DEFAULT_COMPANION_PET.kind,
      color: isPetColor(raw.color) ? raw.color : DEFAULT_COMPANION_PET.color,
      size: isPetSize(raw.size) ? raw.size : DEFAULT_COMPANION_PET.size,
    };
  } catch {
    return DEFAULT_COMPANION_PET;
  }
}

function persistPreferences(preferences: CompanionPetPreferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Private browsing and storage quotas can make local persistence unavailable.
  }
  window.dispatchEvent(new CustomEvent<CompanionPetPreferences>(CHANGE_EVENT, { detail: preferences }));
}

export function useCompanionPetPreferences() {
  const [preferences, setPreferences] = useState<CompanionPetPreferences>(readPreferences);
  const preferencesRef = useRef(preferences);

  useEffect(() => {
    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<CompanionPetPreferences>).detail;
      if (detail && isPetKind(detail.kind) && isPetColor(detail.color) && isPetSize(detail.size)) {
        preferencesRef.current = detail;
        setPreferences(detail);
      } else {
        const next = readPreferences();
        preferencesRef.current = next;
        setPreferences(next);
      }
    };
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleChange);
  }, []);

  const updatePreferences = useCallback((patch: Partial<CompanionPetPreferences>) => {
    const next = { ...preferencesRef.current, ...patch };
    preferencesRef.current = next;
    setPreferences(next);
    persistPreferences(next);
  }, []);

  return { preferences, updatePreferences };
}

function PetIcon({ kind, className }: { kind: CompanionPetKind; className?: string }) {
  const Icon = kind === 'bird' ? Bird : Bot;
  return <Icon className={className} aria-hidden="true" />;
}

function petCopy(kind: CompanionPetKind) {
  return kind === 'bird'
    ? { name: 'Sky', status: 'Scout online', greeting: 'A little room for your next idea?' }
    : { name: 'Orbit', status: 'Helper online', greeting: 'Systems warm. What are we making?' };
}

interface CompanionPetSettingsProps {
  className?: string;
}

export function CompanionPetSettings({ className }: CompanionPetSettingsProps) {
  const { preferences, updatePreferences } = useCompanionPetPreferences();

  return (
    <section className={cn('surface-1 rounded-2xl border border-border/40 p-6 space-y-5', className)}>
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-bold">On-screen companion</h3>
          <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">Give your world a small personality. Choose a bird or robot, tune its look, or hide it whenever you want.</p>
        </div>
        <Switch checked={preferences.enabled} onCheckedChange={(enabled) => updatePreferences({ enabled })} aria-label="Show on-screen companion" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Choose a companion">
        {COMPANION_PET_OPTIONS.map((option) => {
          const selected = preferences.kind === option.kind;
          return (
            <button
              key={option.kind}
              type="button"
              onClick={() => updatePreferences({ kind: option.kind, enabled: true })}
              aria-pressed={selected}
              className={cn('companion-choice-card', selected && 'companion-choice-card--selected')}
            >
              <span className={cn('companion-choice-card__icon', `yor-companion-pet--${preferences.color}`)}><PetIcon kind={option.kind} className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1 text-left"><strong>{option.label}</strong><small>{option.description}</small></span>
              {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 border-t border-border/30 pt-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-bold"><Palette className="h-3.5 w-3.5 text-primary" /> Companion glow</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose companion color">
            {COMPANION_PET_COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                title={color.label}
                aria-label={`${color.label} companion glow`}
                aria-pressed={preferences.color === color.value}
                onClick={() => updatePreferences({ color: color.value })}
                className={cn('h-8 w-8 rounded-full border-2 border-transparent p-0.5 transition-transform hover:scale-110', preferences.color === color.value && 'border-foreground/70')}
              >
                <span className={cn('block h-full w-full rounded-full', color.className)} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold">Companion size</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose companion size">
            {COMPANION_PET_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                aria-pressed={preferences.size === size.value}
                onClick={() => updatePreferences({ size: size.value })}
                className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors', preferences.size === size.value ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/50 text-muted-foreground hover:text-foreground')}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-[0.68rem] leading-relaxed text-muted-foreground">Your companion is saved on this browser only. It never reads, records, or sends your activity.</p>
    </section>
  );
}

export function CompanionPet() {
  const { preferences, updatePreferences } = useCompanionPetPreferences();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const copy = useMemo(() => petCopy(preferences.kind), [preferences.kind]);

  if (!preferences.enabled) {
    return (
      <button type="button" onClick={() => updatePreferences({ enabled: true })} className="yor-companion__wake" aria-label="Show your on-screen companion">
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Wake companion</span>
      </button>
    );
  }

  return (
    <aside className="yor-companion" aria-label="On-screen companion">
      {open && (
        <div className="yor-companion__panel" role="dialog" aria-label={`${copy.name} companion controls`}>
          <div className="flex items-start gap-3">
            <span className={cn('yor-companion__panel-icon', `yor-companion-pet--${preferences.color}`)}><PetIcon kind={preferences.kind} className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><p className="text-sm font-bold">{copy.name} is with you</p><p className="mt-0.5 text-[0.68rem] text-muted-foreground">{copy.greeting}</p></div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground" aria-label="Close companion controls"><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {COMPANION_PET_OPTIONS.map((option) => (
              <button key={option.kind} type="button" onClick={() => updatePreferences({ kind: option.kind })} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[0.68rem] font-bold', preferences.kind === option.kind ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/40 text-muted-foreground hover:text-foreground')} aria-pressed={preferences.kind === option.kind}>
                <PetIcon kind={option.kind} className="h-3.5 w-3.5" /> {option.kind === 'bird' ? 'Bird' : 'Robot'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { setOpen(false); setLocation('/settings'); }} className="mt-3 flex w-full items-center justify-between rounded-xl border border-border/40 px-3 py-2 text-[0.68rem] font-bold text-muted-foreground hover:border-primary/30 hover:text-foreground"><span className="flex items-center gap-2"><Palette className="h-3.5 w-3.5" /> Customize in Settings</span><ChevronDown className="h-3.5 w-3.5 -rotate-90" /></button>
          <button type="button" onClick={() => { updatePreferences({ enabled: false }); setOpen(false); }} className="mt-2 w-full rounded-xl px-3 py-2 text-left text-[0.68rem] font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive">Hide companion</button>
        </div>
      )}

      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className={cn('yor-companion__trigger', `yor-companion-pet--${preferences.color}`, `yor-companion__trigger--${preferences.size}`)}>
        <span className="yor-companion__sparkle" aria-hidden="true"><Sparkles className="h-3 w-3" /></span>
        <span className="yor-companion__avatar"><PetIcon kind={preferences.kind} className="h-6 w-6" /></span>
        <span className="min-w-0 text-left"><strong>{copy.name}</strong><small>{copy.status}</small></span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>
    </aside>
  );
}
