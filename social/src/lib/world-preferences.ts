export type WorldDiscoveryRadius = 'nearby' | 'region' | 'world';

export type WorldPreferences = {
  worldId: string;
  worldLabel: string;
  country: string;
  city: string;
  language: string;
  timezone: string;
  currency: string;
  discoveryRadius: WorldDiscoveryRadius;
  autoTranslate: boolean;
  captions: boolean;
  lowBandwidth: boolean;
};

export const DEFAULT_WORLD_PREFERENCES: WorldPreferences = {
  worldId: 'global',
  worldLabel: 'Global',
  country: 'India',
  city: 'Bhubaneswar',
  language: 'English',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  discoveryRadius: 'world',
  autoTranslate: true,
  captions: true,
  lowBandwidth: false,
};

export const WORLD_OPTIONS = [
  { id: 'global', label: 'Global', description: 'Meet people and ideas across borders.' },
  { id: 'country', label: 'India', description: 'Tune discovery to your country.' },
  { id: 'city', label: 'Bhubaneswar', description: 'Find nearby people, places, and events.' },
  { id: 'campus', label: 'Campus', description: 'A focused world for your local community.' },
  { id: 'interest', label: 'Tech & AI', description: 'Follow a shared obsession anywhere.' },
  { id: 'private', label: 'Private Circle', description: 'A smaller space for people you trust.' },
] as const;

export const COUNTRY_OPTIONS = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Japan', 'Brazil', 'Nigeria', 'Germany', 'Singapore'] as const;
export const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Odia', 'Spanish', 'French', 'Portuguese', 'Arabic', 'Japanese', 'Swahili'] as const;
export const TIMEZONE_OPTIONS = ['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Tokyo', 'Australia/Sydney'] as const;
export const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BRL', 'NGN', 'SGD'] as const;

export const DISCOVERY_RADIUS_OPTIONS: Array<{ value: WorldDiscoveryRadius; label: string; description: string }> = [
  { value: 'nearby', label: 'Nearby', description: 'Prioritize your city and local events.' },
  { value: 'region', label: 'Region', description: 'Expand to your country and neighboring signals.' },
  { value: 'world', label: 'World', description: 'Let the best ideas travel anywhere.' },
];
