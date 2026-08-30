import path from 'path';
import { fileURLToPath } from 'url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const currentDir = import.meta.dirname || path.dirname(fileURLToPath(import.meta.url));
const rawPort = process.env.PORT || '5173';
const parsedPort = parseInt(rawPort, 10);
const port = !isNaN(parsedPort) && parsedPort > 0 ? parsedPort : 5173;

const basePath = process.env.BASE_PATH || '/';

function assertPublicBetaBuildConfiguration(): void {
  if (process.env.VITE_PUBLIC_BETA !== 'true') return;
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
    const value = process.env[key];
    return !value || placeholder.test(value);
  });
  if (missing.length) {
    throw new Error(`[Vite Config Error] VITE_PUBLIC_BETA requires: ${missing.join(', ')}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(process.env.VITE_LEGAL_EFFECTIVE_DATE || '') || Number.isNaN(Date.parse(process.env.VITE_LEGAL_EFFECTIVE_DATE || ''))) {
    throw new Error('[Vite Config Error] VITE_LEGAL_EFFECTIVE_DATE must be an ISO date (YYYY-MM-DD)');
  }
  for (const key of ['VITE_PRIVACY_CONTACT_EMAIL', 'VITE_SUPPORT_EMAIL', 'VITE_GRIEVANCE_CONTACT_EMAIL']) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env[key] || '')) {
      throw new Error(`[Vite Config Error] ${key} must be a valid email address`);
    }
  }
}

assertPublicBetaBuildConfiguration();

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),

    ...(process.env.ANALYZE === 'true'
      ? [
          await import('rollup-plugin-visualizer').then((m) =>
            m.visualizer({ filename: 'dist/visualizer.html' }),
          ),
        ]
      : []),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
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
  envDir: path.resolve(currentDir, '..'),
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
});
