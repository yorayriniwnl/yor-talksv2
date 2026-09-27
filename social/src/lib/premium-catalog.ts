import type { PremiumProfileOptions } from './api-client';

/** Optional catalog failures must not take down privacy/account controls. */
export function isPremiumProfileCatalog(value: unknown): value is PremiumProfileOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const catalog = value as Partial<PremiumProfileOptions>;
  if (!catalog.selection || !catalog.options || !catalog.enabledFeatures || Array.isArray(catalog.enabledFeatures)) return false;
  if (!['bioStyleId', 'messageFontId', 'storyFontId', 'appIconId'].every(key => typeof (catalog.selection as any)[key] === 'string')) return false;
  if (!Object.values(catalog.enabledFeatures).every(flag => typeof flag === 'boolean')) return false;
  return ['bioStyles', 'messageStyles', 'storyStyles', 'appIcons'].every(key => {
    const options = (catalog.options as any)[key];
    return Array.isArray(options) && options.length > 0 && options.length <= 100 && options.every(option =>
      option && typeof option.id === 'string' && option.id.length > 0 && typeof option.label === 'string'
      && (option.platforms === undefined || (Array.isArray(option.platforms) && option.platforms.every((platform: unknown) => typeof platform === 'string'))));
  });
}
