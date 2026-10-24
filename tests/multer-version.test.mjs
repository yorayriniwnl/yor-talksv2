import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

test('Multer remains on a release patched against aborted-upload disk writes and torn-down async file filters', () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../api-server/node_modules/multer/package.json', import.meta.url), 'utf8'));
  const [major, minor] = packageJson.version.split('.').map(Number);
  assert.ok(major > 2 || (major === 2 && minor >= 5), `Expected Multer >=2.5.0, got ${packageJson.version}`);
});