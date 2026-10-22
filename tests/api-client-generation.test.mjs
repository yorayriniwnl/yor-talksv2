import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { compareGeneratedArtifacts, generatedDirectories } from '../lib/api-spec/scripts/check-generated.mjs';

function fixture(t) {
  const temporaryParent = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporaryParent, 'yor-client-drift-test-'));
  t.after(() => {
    const cleanupTarget = fs.realpathSync(root);
    assert.equal(path.dirname(cleanupTarget), temporaryParent);
    assert.ok(path.basename(cleanupTarget).startsWith('yor-client-drift-test-'));
    fs.rmSync(cleanupTarget, { recursive: true, force: true });
  });
  const current = path.join(root, 'current');
  const expected = path.join(root, 'expected');
  const write = (base, directory, name, text) => {
    const target = path.join(base, directory, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, text);
  };
  for (const directory of generatedDirectories) {
    write(current, directory, 'api.ts', 'export const version = 1;\r\n');
    write(expected, directory, 'api.ts', 'export const version = 1;\n');
  }
  return { current, expected, write };
}

test('generated client comparison accepts equivalent Windows line endings without rewriting sources', t => {
  const { current, expected } = fixture(t);
  const before = fs.readFileSync(path.join(current, generatedDirectories[0], 'api.ts'), 'utf8');
  assert.deepEqual(compareGeneratedArtifacts(current, expected), { differences: [], expectedFileCount: 2 });
  assert.equal(fs.readFileSync(path.join(current, generatedDirectories[0], 'api.ts'), 'utf8'), before);
});

test('generated client comparison detects schema drift, missing models and removed endpoint artifacts', t => {
  const { current, expected, write } = fixture(t);
  write(expected, generatedDirectories[0], 'api.ts', 'export const version = 2;\n');
  write(expected, generatedDirectories[1], 'types/newDecision.ts', 'export type Decision = string;\n');
  write(current, generatedDirectories[1], 'types/removedEndpoint.ts', 'export type Removed = string;\n');
  assert.deepEqual(compareGeneratedArtifacts(current, expected), {
    expectedFileCount: 3,
    differences: [
      { artifact: `${generatedDirectories[0]}/api.ts`, kind: 'changed' },
      { artifact: `${generatedDirectories[1]}/types/newDecision.ts`, kind: 'missing' },
      { artifact: `${generatedDirectories[1]}/types/removedEndpoint.ts`, kind: 'unexpected' },
    ],
  });
});

test('a missing generator output fails instead of accepting an empty comparison', t => {
  const { current, expected } = fixture(t);
  const missingRoot = path.join(expected, 'missing-generator-output');
  assert.throws(() => compareGeneratedArtifacts(current, missingRoot), /Generator did not produce/);
});
