import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const socialDir = path.join(root, 'social');
const require = createRequire(path.join(socialDir, 'package.json'));
const viteDir = path.dirname(require.resolve('vite/package.json'));

function fixture(t) {
  const tempRoot = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(tempRoot, 'yor-frontend-build-'));
  t.after(() => {
    const resolved = fs.realpathSync(directory);
    assert.equal(path.dirname(resolved), tempRoot);
    assert.ok(path.basename(resolved).startsWith('yor-frontend-build-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  return directory;
}

function node(script, args = [], env = {}) {
  const nodePath = [
    path.join(socialDir, 'node_modules'),
    path.join(root, 'node_modules'),
    process.env.NODE_PATH,
  ].filter(Boolean).join(path.delimiter);
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    env: { ...process.env, NODE_PATH: nodePath, ...env },
    encoding: 'utf8',
    // Windows antivirus and synced workspaces can spend over a minute loading
    // Vite's dependency tree. Keep the same assertions and a bounded deadline.
    timeout: process.platform === 'win32' ? 180_000 : 60_000,
  });
}

test('frontend build forces production code despite development shell and shared env', (t) => {
  const directory = fixture(t);
  fs.writeFileSync(path.join(directory, '.env'), 'NODE_ENV=development\n');
  fs.writeFileSync(path.join(directory, 'entry.js'),
    'globalThis.buildEnvironment = { production: import.meta.env.PROD, development: import.meta.env.DEV, node: process.env.NODE_ENV };');
  const config = path.join(directory, 'vite.config.mjs');
  fs.writeFileSync(config, `export default ${JSON.stringify({
    root: directory, envDir: directory,
    build: { minify: false, rollupOptions: { input: path.join(directory, 'entry.js') } },
  })};`);
  const output = path.join(directory, 'dist');
  const result = node(path.join(socialDir, 'scripts/build.mjs'), ['--config', config, '--outDir', output], { NODE_ENV: 'development' });
  assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stdout}\n${result.stderr}`);
  const bundle = fs.readdirSync(path.join(output, 'assets')).find((name) => name.endsWith('.js'));
  assert.ok(bundle);
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(output, 'assets', bundle), 'utf8'), context);
  assert.equal(context.buildEnvironment.production, true);
  assert.equal(context.buildEnvironment.development, false);
  assert.equal(context.buildEnvironment.node, 'production');
});

test('application config rejects a direct development-flavored release build', (t) => {
  const directory = fixture(t);
  const probe = path.join(directory, 'probe.mjs');
  const viteModule = pathToFileURL(path.join(viteDir, 'dist/node/index.js')).href;
  fs.writeFileSync(probe, `import { resolveConfig } from ${JSON.stringify(viteModule)};
await resolveConfig({ configFile: ${JSON.stringify(path.join(socialDir, 'vite.config.ts'))} }, 'build', 'production', 'production');`);
  const result = node(probe, [], { NODE_ENV: 'development', VITE_PUBLIC_BETA: 'false' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Production builds require NODE_ENV=production/);
});

test('public beta builds require a concrete HTTPS site origin for share previews', (t) => {
  const directory = fixture(t);
  const probe = path.join(directory, 'probe.mjs');
  const viteModule = pathToFileURL(path.join(viteDir, 'dist/node/index.js')).href;
  fs.writeFileSync(probe, `import { resolveConfig } from ${JSON.stringify(viteModule)};
await resolveConfig({ configFile: ${JSON.stringify(path.join(socialDir, 'vite.config.ts'))} }, 'build', 'production', 'production');`);
  const configuration = {
    NODE_ENV: 'production',
    VITE_PUBLIC_BETA: 'true',
    VITE_PUBLIC_ORIGIN: '',
    VITE_TERMS_VERSION: 'test-public-beta-1',
    VITE_LEGAL_CONTENT_REVIEWED: 'true',
    VITE_LEGAL_OPERATOR_NAME: 'Yor Talks Test Operator',
    VITE_LEGAL_OPERATOR_ADDRESS: '1 Test Street, Synthetic Test City',
    VITE_LEGAL_EFFECTIVE_DATE: '2026-10-15',
    VITE_LEGAL_GOVERNING_LAW: 'Synthetic CI fixture only',
    VITE_PRIVACY_CONTACT_EMAIL: 'privacy@example.test',
    VITE_SUPPORT_EMAIL: 'support@example.test',
    VITE_GRIEVANCE_OFFICER_NAME: 'Yor Talks Test Officer',
    VITE_GRIEVANCE_CONTACT_EMAIL: 'grievance@example.test',
    VITE_GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
  };
  const missing = node(probe, [], configuration);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /VITE_PUBLIC_ORIGIN/);

  const insecure = node(probe, [], { ...configuration, VITE_PUBLIC_ORIGIN: 'http://yor-talks.test' });
  assert.notEqual(insecure.status, 0);
  assert.match(insecure.stderr, /VITE_PUBLIC_ORIGIN must be an HTTPS origin/);

  const unreviewed = node(probe, [], { ...configuration, VITE_PUBLIC_ORIGIN: 'https://yor-talks.test', VITE_LEGAL_CONTENT_REVIEWED: 'false' });
  assert.notEqual(unreviewed.status, 0);
  assert.match(unreviewed.stderr, /VITE_LEGAL_CONTENT_REVIEWED|reviewed and approved/);

  const valid = node(probe, [], { ...configuration, VITE_PUBLIC_ORIGIN: 'https://yor-talks.test' });
  assert.equal(valid.status, 0, `${valid.error ?? ''}\n${valid.stdout}\n${valid.stderr}`);
});

test('artifact mirror replaces a previous release and fails when the build is absent', (t) => {
  const directory = fixture(t);
  const scripts = path.join(directory, 'scripts');
  const output = path.join(directory, 'dist');
  fs.mkdirSync(scripts);
  fs.mkdirSync(path.join(output, 'public'), { recursive: true });
  const syncScript = path.join(scripts, 'sync-dist.mjs');
  fs.copyFileSync(path.join(socialDir, 'scripts/sync-dist.mjs'), syncScript);
  fs.writeFileSync(path.join(output, 'index.html'), 'previous release');
  fs.writeFileSync(path.join(output, 'public/index.html'), 'current release');
  const result = node(syncScript);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), 'current release');
  fs.unlinkSync(path.join(output, 'public/index.html'));
  const missing = node(syncScript);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Frontend build output is missing/);
});
