import { defineConfig } from '@playwright/test';
import path from 'node:path';
import baseline from '../playwright.config';

// Explicit synthetic build profiles. These flags affect local browser fixtures
// only; all providers and API writes remain intercepted by the tests.
const payments = process.env.FRONTEND_COMPLIANCE_PAYMENTS === 'true';
const push = process.env.FRONTEND_COMPLIANCE_PUSH === 'true';
const port = Number(process.env.PLAYWRIGHT_PORT || '4173');
const output = `dist/frontend-compliance-${port}`;
const root = path.resolve(import.meta.dirname, '..');
const originalServer = baseline.webServer as { env: Record<string, string> };

export default defineConfig({
  ...baseline,
  testDir: '.',
  outputDir: path.join(root, `test-results/frontend-compliance-${port}`),
  workers: 2,
  webServer: {
    cwd: root,
    command: `node social/scripts/build.mjs --outDir ${output} && node social/node_modules/vite/bin/vite.js preview --config social/vite.config.ts --outDir ${output} --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      ...originalServer.env,
      VITE_PAYMENTS_ENABLED: String(payments),
      VITE_WEB_PUSH_ENABLED: String(push),
      VITE_LIVE_ROOMS_ENABLED: 'false',
      VITE_RTC_CALLS_ENABLED: 'false',
    },
  },
});
