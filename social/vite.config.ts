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
  build: {
    outDir: path.resolve(currentDir, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — changes rarely, cache aggressively
          'vendor-react': ['react', 'react-dom'],
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
          // Mock data (heavy, isolate it)
          'app-mock-data': ['./src/lib/mockData.ts'],
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
