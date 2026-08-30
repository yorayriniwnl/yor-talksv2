import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

const currentDir = import.meta.dirname || path.dirname(fileURLToPath(import.meta.url));
const envDir = path.resolve(currentDir, '..');
type BuildEnvironment = Record<string, string | undefined>;

function readBooleanEnv(environment: BuildEnvironment, name: string, fallback = false): boolean {
  const raw = environment[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  throw new Error(`[Vite Config Error] ${name} must be true or false`);
}

function assertPublicBetaBuildConfiguration(environment: BuildEnvironment): void {
  if (!readBooleanEnv(environment, 'VITE_PUBLIC_BETA')) return;
  const required = [
    'VITE_TERMS_VERSION',
    'VITE_LEGAL_OPERATOR_NAME',
    'VITE_LEGAL_OPERATOR_ADDRESS',
    'VITE_LEGAL_EFFECTIVE_DATE',
    'VITE_LEGAL_GOVERNING_LAW',
    'VITE_PRIVACY_CONTACT_EMAIL',
    'VITE_SUPPORT_EMAIL',
    'VITE_GRIEVANCE_OFFICER_NAME',
    'VITE_GRIEVANCE_CONTACT_EMAIL',
    'VITE_GOOGLE_CLIENT_ID',
  ];
  const placeholder = /change[_-]?me|replace-with|your-domain\.example|^development$/i;
  const missing = required.filter((key) => {
    const value = environment[key];
    return !value || placeholder.test(value);
  });
  if (missing.length) {
    throw new Error(`[Vite Config Error] VITE_PUBLIC_BETA requires: ${missing.join(', ')}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(environment.VITE_LEGAL_EFFECTIVE_DATE || '') || Number.isNaN(Date.parse(environment.VITE_LEGAL_EFFECTIVE_DATE || ''))) {
    throw new Error('[Vite Config Error] VITE_LEGAL_EFFECTIVE_DATE must be an ISO date (YYYY-MM-DD)');
  }
  for (const key of ['VITE_PRIVACY_CONTACT_EMAIL', 'VITE_SUPPORT_EMAIL', 'VITE_GRIEVANCE_CONTACT_EMAIL']) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(environment[key] || '')) {
      throw new Error(`[Vite Config Error] ${key} must be a valid email address`);
    }
  }
}

export default defineConfig(async ({ mode }) => {
  // Vite loads .env files after evaluating the config unless we do it here.
  // Merge those values with the real process environment so a beta build from
  // .env.production receives the same fail-closed checks as Docker/CI builds.
  const environment = { ...loadEnv(mode, envDir, ''), ...process.env };
  const rawPort = environment.PORT || '5173';
  const parsedPort = parseInt(rawPort, 10);
  const port = !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : 5173;
  const basePath = environment.BASE_PATH || '/';

  assertPublicBetaBuildConfiguration(environment);

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),

      ...(environment.ANALYZE === 'true'
        ? [
            await import('rollup-plugin-visualizer').then((m) =>
              m.visualizer({ filename: 'dist/visualizer.html' }),
            ),
          ]
        : []),
      ...(environment.NODE_ENV !== 'production' &&
      environment.REPL_ID !== undefined
        ? [
            await import('@replit/vite-plugin-cartographer').then((m) =>
              m.cartographer({
                root: path.resolve(currentDir, '..'),
              }),
            ),
            await import('@replit/vite-plugin-dev-banner').then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(currentDir, 'src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: path.resolve(currentDir),
    envDir,
    build: {
      outDir: path.resolve(currentDir, 'dist/public'),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // Animation framework
            'vendor-motion': ['framer-motion'],
            // Date utilities
            'vendor-date': ['date-fns'],
            // Heavy charting (used by dashboard)
            'vendor-charts': ['recharts'],
            // Icon library
            'vendor-icons': ['lucide-react'],
            // State management + data
            'vendor-state': ['zustand'],
            // Socket transport is used by the shell; keep its payload separate.
            'vendor-socket': ['socket.io-client'],
            // Live calling is route-level and should not block first paint.
            'vendor-livekit': ['livekit-client'],
          },
        },
      },
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      fs: {
        strict: true,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          ws: true,
        }
      }
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
