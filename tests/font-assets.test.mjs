import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

test('font delivery uses local complete WOFF2 assets and ships their pinned source license notices', async () => {
  const root = path.resolve(import.meta.dirname, '..');
  const folder = path.join(root, 'social/public/fonts');
  const html = await fs.readFile(path.join(root, 'social/index.html'), 'utf8');
  const css = await fs.readFile(path.join(folder, 'fonts.css'), 'utf8');
  const manifest = JSON.parse(await fs.readFile(path.join(folder, 'sources.json'), 'utf8'));
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.doesNotMatch(html, /https:\/\/fonts\.(?:googleapis|gstatic)\.com/);
  assert.ok(html.includes(`/fonts/fonts.css?v=${sha(css).slice(0, 16)}`), 'stylesheet updates must bypass the old service-worker cache key');
  assert.doesNotMatch(css, /url\(https?:/);
  const referenced = [...new Set([...css.matchAll(/url\(\/fonts\/([^)]+)\)/g)].map(match => match[1]))].sort();
  assert.deepEqual(referenced, manifest.fonts.map(font => font.file).sort());
  for (const item of manifest.fonts) {
    const bytes = await fs.readFile(path.join(folder, item.file));
    assert.equal(bytes.toString('ascii', 0, 4), 'wOF2');
    assert.equal(sha(bytes), item.sha256);
    assert.equal(bytes.length, item.bytes);
    assert.equal(new URL(item.source).origin, 'https://fonts.gstatic.com');
  }
  assert.equal(manifest.licenses.length, 6);
  for (const item of manifest.licenses) {
    const bytes = await fs.readFile(path.join(folder, item.file));
    assert.equal(sha(bytes), item.sha256);
    assert.match(bytes.toString(), /SIL OPEN FONT LICENSE Version 1.1/);
    assert.ok(item.source.includes(`/${manifest.licenseRevision}/ofl/`));
  }
});
