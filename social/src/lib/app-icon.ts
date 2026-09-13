export const APP_ICON_CONFIG = {
  'yor-default': {
    href: '/favicon.svg',
    lightThemeColor: '#6c3aed',
    darkThemeColor: '#8b5cf6',
  },
  crimson: {
    href: '/favicon-crimson.svg',
    lightThemeColor: '#b4233c',
    darkThemeColor: '#ff664f',
  },
  monochrome: {
    href: '/favicon-monochrome.svg',
    lightThemeColor: '#111827',
    darkThemeColor: '#f3f4f6',
  },
} as const;

export type AppIconId = keyof typeof APP_ICON_CONFIG;

let runtimeManifestUrl: string | null = null;

function resolveAppIconId(value: string | undefined): AppIconId {
  return value && value in APP_ICON_CONFIG ? (value as AppIconId) : 'yor-default';
}

function updateThemeColors(config: (typeof APP_ICON_CONFIG)[AppIconId]): void {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = meta.media.includes('dark') ? config.darkThemeColor : config.lightThemeColor;
  });
}

function updateInstallManifest(iconId: AppIconId, config: (typeof APP_ICON_CONFIG)[AppIconId]): void {
  const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifestLink || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;

  const manifest = {
    name: 'Yor Talks',
    short_name: 'Yor',
    description: 'A living internet for turning ideas, people, and shared worlds into real momentum.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0b0b12',
    theme_color: config.darkThemeColor,
    orientation: 'portrait-primary',
    icons: [{
      src: new URL(config.href, window.location.origin).toString(),
      sizes: '180x180',
      type: 'image/svg+xml',
      purpose: 'any maskable',
    }],
    yor_app_icon_id: iconId,
  };

  const nextManifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
  if (runtimeManifestUrl) URL.revokeObjectURL(runtimeManifestUrl);
  runtimeManifestUrl = nextManifestUrl;
  manifestLink.href = nextManifestUrl;
  manifestLink.dataset.yorRuntimeManifest = 'true';
}

/** Apply the account's web identity without pretending to mutate native bundles. */
export function applyAppIcon(value?: string): void {
  if (typeof document === 'undefined') return;

  const iconId = resolveAppIconId(value);
  const config = APP_ICON_CONFIG[iconId];
  document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach((link) => {
    link.href = config.href;
  });
  updateThemeColors(config);
  updateInstallManifest(iconId, config);
}
