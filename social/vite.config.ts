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
          // Shared dependencies must not be swept into a route-only chunk:
          // implicit chart dependencies previously placed ReactDOM in charts,
          // eagerly downloading the entire chart library on the feed.
          onlyExplicitManualChunks: true,
          manualChunks(id) {
            const module = id.replace(/\\/g, '/');
            // Match the actual package modules, including pnpm/CJS internals.
            // The object form still collects transitive entry dependencies.
            if (/\/node_modules\/(react|react-dom|scheduler)\//.test(module)) return 'vendor-react';
            if (/\/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(module)) return 'vendor-motion';
            if (/\/node_modules\/date-fns\//.test(module)) return 'vendor-date';
            if (/\/node_modules\/recharts\//.test(module)) return 'vendor-charts';
            if (/\/node_modules\/lucide-react\//.test(module)) return 'vendor-icons';
            if (/\/node_modules\/zustand\//.test(module)) return 'vendor-state';
            if (/\/node_modules\/socket.io-client\//.test(module)) return 'vendor-socket';
            if (/\/node_modules\/livekit-client\//.test(module)) return 'vendor-livekit';
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
