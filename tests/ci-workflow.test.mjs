import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';

// Reuse the pinned code generator's explicit parser dependency, rather than
// adding another parser or tolerating duplicate YAML mappings as JSON.parse does.
const specRequire = createRequire(new URL('../lib/api-spec/package.json', import.meta.url));
const generatorRequire = createRequire(specRequire.resolve('orval/package.json'));
const yaml = generatorRequire('js-yaml');
const read = name => fs.readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

test('repository workflow, lockfile and manifests reject duplicate mapping keys', () => {
  assert.throws(() => yaml.load('run: first\nrun: second\n'), /duplicated mapping key/);
  for (const filename of [
    '.github/workflows/ci.yml', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
    'package.json', 'api-server/package.json', 'social/package.json',
  ]) assert.doesNotThrow(() => yaml.load(read(filename)), filename);
});

test('CI pins actions, matches the toolchain and retains all-scope dependency auditing', () => {
  const workflow = yaml.load(read('.github/workflows/ci.yml'));
  const manifest = JSON.parse(read('package.json'));
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  const steps = workflow.jobs.verify.steps;
  for (const step of steps.filter(step => step.uses)) {
    assert.match(step.uses, /@[a-f0-9]{40}$/, step.name);
  }
  assert.equal(steps.find(step => step.uses?.startsWith('pnpm/action-setup@')).with.version,
    manifest.packageManager.slice('pnpm@'.length));
  assert.equal(steps.find(step => step.uses?.startsWith('actions/setup-node@')).with['node-version'], 24);
  assert.ok(steps.some(step => step.run?.trim() === 'pnpm audit'), 'all dependency scopes must be audited');
});
