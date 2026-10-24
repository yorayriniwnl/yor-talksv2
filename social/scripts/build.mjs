import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const socialDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteCli = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');

// Establish this before Vite loads the shared development .env. Build mode alone
// does not prevent NODE_ENV=development from selecting React's development code.
const result = spawnSync(process.execPath, [viteCli, 'build', ...process.argv.slice(2)], {
  cwd: socialDir,
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
