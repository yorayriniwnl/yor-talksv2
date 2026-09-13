export const PREMIUM_BIO_STYLES = [
  { id: "default", label: "YOR Sans", cssFamily: "system" },
  { id: "editorial", label: "Editorial Serif", cssFamily: "serif" },
  { id: "mono", label: "Signal Mono", cssFamily: "monospace" },
] as const;

export const PREMIUM_MESSAGE_STYLES = [
  { id: "default", label: "YOR Sans", cssFamily: "system" },
  { id: "mono", label: "Signal Mono", cssFamily: "monospace" },
  { id: "rounded", label: "Rounded", cssFamily: "rounded" },
] as const;

export const PREMIUM_STORY_STYLES = [
  { id: "default", label: "YOR Sans", cssFamily: "system" },
  { id: "cinematic", label: "Cinematic", cssFamily: "serif" },
  { id: "mono", label: "Signal Mono", cssFamily: "monospace" },
] as const;

export const PREMIUM_APP_ICONS = [
  { id: "yor-default", label: "YOR Default", platforms: ["web", "PWA"] },
  { id: "crimson", label: "Crimson Signal", platforms: ["web", "PWA"] },
  { id: "monochrome", label: "Monochrome", platforms: ["web", "PWA"] },
] as const;

export function isPremiumMessageStyle(value: string): boolean {
  return PREMIUM_MESSAGE_STYLES.some((style) => style.id === value);
}

export function isPremiumStoryStyle(value: string): boolean {
  return PREMIUM_STORY_STYLES.some((style) => style.id === value);
}

export type PremiumProfileSelection = {
  bioStyleId: string;
  messageFontId: string;
  storyFontId: string;
  appIconId: string;
};

function assertCatalogValue<T extends readonly { id: string }[]>(catalog: T, value: string | undefined, field: string): T[number]["id"] {
  const normalized = value ?? catalog[0].id;
  if (!catalog.some((item) => item.id === normalized)) throw new Error(`${field} uses an unsupported option`);
  return normalized as T[number]["id"];
}

export function assertPremiumProfileSelection(input: Partial<PremiumProfileSelection>): PremiumProfileSelection {
  return {
    bioStyleId: assertCatalogValue(PREMIUM_BIO_STYLES, input.bioStyleId, "bioStyleId"),
    messageFontId: assertCatalogValue(PREMIUM_MESSAGE_STYLES, input.messageFontId, "messageFontId"),
    storyFontId: assertCatalogValue(PREMIUM_STORY_STYLES, input.storyFontId, "storyFontId"),
    appIconId: assertCatalogValue(PREMIUM_APP_ICONS, input.appIconId, "appIconId"),
  };
}

export function requiredPremiumFeatures(input: Partial<PremiumProfileSelection>): PremiumFeature[] {
  const selection = assertPremiumProfileSelection(input);
  const required: PremiumFeature[] = [];
  if (selection.bioStyleId !== "default") required.push("CUSTOM_BIO_FONT");
  if (selection.messageFontId !== "default") required.push("MESSAGE_FONT");
  if (selection.storyFontId !== "default") required.push("STORY_FONT");
  if (selection.appIconId !== "yor-default") required.push("CUSTOM_APP_ICON");
  return required;
}

export function canAddProfilePin(existingPinCount: number, maximum = 6): boolean {
  return Number.isInteger(existingPinCount) && existingPinCount >= 0 && existingPinCount < maximum;
}
import type { PremiumFeature } from "./premium-features.js";
