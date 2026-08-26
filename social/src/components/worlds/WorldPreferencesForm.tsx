import { Globe2, Languages, MapPinned, Radio, Wifi } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  COUNTRY_OPTIONS,
  CURRENCY_OPTIONS,
  DISCOVERY_RADIUS_OPTIONS,
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  WORLD_OPTIONS,
  type WorldPreferences,
} from '@/lib/world-preferences';
import { cn } from '@/lib/utils';

interface WorldPreferencesFormProps {
  value: WorldPreferences;
  onChange: (patch: Partial<WorldPreferences>) => void;
  idPrefix?: string;
  compact?: boolean;
}

const fieldClassName = 'mt-1.5 h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm font-semibold outline-none transition focus:border-primary/60';

export function WorldPreferencesForm({ value, onChange, idPrefix = 'world', compact = false }: WorldPreferencesFormProps) {
  const setWorld = (worldId: string) => {
    const option = WORLD_OPTIONS.find((item) => item.id === worldId);
    onChange({ worldId, worldLabel: option?.label ?? worldId });
  };

  return (
    <div className={cn('space-y-5', compact && 'space-y-4')}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="yor-field">
          <span className="flex items-center gap-2"><Globe2 className="h-3.5 w-3.5 text-primary" /> Starting world</span>
          <select id={`${idPrefix}-world`} value={value.worldId} onChange={(event) => setWorld(event.target.value)} className={fieldClassName}>
            {WORLD_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
          <small>{WORLD_OPTIONS.find((option) => option.id === value.worldId)?.description}</small>
        </label>
        <label className="yor-field">
          <span><MapPinned className="mr-2 inline h-3.5 w-3.5 text-primary" />Country</span>
          <select id={`${idPrefix}-country`} value={value.country} onChange={(event) => onChange({ country: event.target.value })} className={fieldClassName}>
            {COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}
          </select>
        </label>
        <label className="yor-field">
          <span>City or region</span>
          <input id={`${idPrefix}-city`} value={value.city} onChange={(event) => onChange({ city: event.target.value })} className={fieldClassName} placeholder="Bhubaneswar" maxLength={80} />
        </label>
        <label className="yor-field">
          <span><Languages className="mr-2 inline h-3.5 w-3.5 text-primary" />Interface language</span>
          <select id={`${idPrefix}-language`} value={value.language} onChange={(event) => onChange({ language: event.target.value })} className={fieldClassName}>
            {LANGUAGE_OPTIONS.map((language) => <option key={language} value={language}>{language}</option>)}
          </select>
        </label>
        <label className="yor-field">
          <span>Timezone</span>
          <select id={`${idPrefix}-timezone`} value={value.timezone} onChange={(event) => onChange({ timezone: event.target.value })} className={fieldClassName}>
            {TIMEZONE_OPTIONS.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
          </select>
        </label>
        <label className="yor-field">
          <span>Display currency</span>
          <select id={`${idPrefix}-currency`} value={value.currency} onChange={(event) => onChange({ currency: event.target.value })} className={fieldClassName}>
            {CURRENCY_OPTIONS.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Discovery radius</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {DISCOVERY_RADIUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ discoveryRadius: option.value })}
              className={cn('rounded-2xl border p-3 text-left transition-all', value.discoveryRadius === option.value ? 'border-primary bg-primary/10' : 'border-border/40 bg-background/30 hover:border-primary/40')}
              aria-pressed={value.discoveryRadius === option.value}
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="mt-1 block text-[0.68rem] leading-relaxed text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {([
          ['autoTranslate', 'Instant translation', 'Show a translation-ready reading layer for global conversations.', value.autoTranslate, Languages],
          ['captions', 'Captions first', 'Prefer captions and transcripts whenever media supports them.', value.captions, Radio],
          ['lowBandwidth', 'Low-bandwidth mode', 'Reduce decorative media and preserve the core experience on slower networks.', value.lowBandwidth, Wifi],
        ] as const).map(([key, label, description, checked, Icon]) => (
          <label key={key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/40 bg-background/30 p-3">
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', checked ? 'text-primary' : 'text-muted-foreground')} />
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="mt-1 block text-[0.68rem] leading-relaxed text-muted-foreground">{description}</span></span>
            <Switch checked={checked} onCheckedChange={(next) => onChange({ [key]: next } as Partial<WorldPreferences>)} aria-label={label} />
          </label>
        ))}
      </div>
    </div>
  );
}
