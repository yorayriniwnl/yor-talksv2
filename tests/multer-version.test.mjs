import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

test('Multer remains on the patched 2.3.x line', () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../api-server/node_modules/multer/package.json', import.meta.url), 'utf8'));
  assert.match(packageJson.version, /^2\.(?:3|[4-9])\./);
});