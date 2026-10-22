import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const generatedDirectories = [
  'lib/api-client-react/src/generated',
  'lib/api-zod/src/generated',
];

function readGeneratedFiles(directory) {
  const files = new Map();
  if (!fs.existsSync(directory)) return files;
  const visit = (current, prefix = '') => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute, relative);
      else if (entry.isFile()) files.set(relative, fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n'));
      else throw new Error(`Generated output must contain regular files only: ${absolute}`);
    }
  };
  visit(directory);
  return files;
}

/** Compare content as well as inventory; removed endpoints must remove artifacts. */
export function compareGeneratedArtifacts(currentRoot, expectedRoot) {
  const differences = [];
  let expectedFileCount = 0;
  for (const directory of generatedDirectories) {
    const current = readGeneratedFiles(path.join(currentRoot, directory));
    const expected = readGeneratedFiles(path.join(expectedRoot, directory));
    if (!expected.size) throw new Error(`Generator did not produce ${directory}`);
    expectedFileCount += expected.size;
    const names = [...new Set([...current.keys(), ...expected.keys()])].sort();
    for (const name of names) {
      const artifact = `${directory}/${name}`;
      if (!expected.has(name)) differences.push({ artifact, kind: 'unexpected' });
      else if (!current.has(name)) differences.push({ artifact, kind: 'missing' });
      else if (current.get(name) !== expected.get(name)) differences.push({ artifact, kind: 'changed' });
    }
  }
  return { differences, expectedFileCount };
}

function checkGeneratedClients() {
  const specRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const workspaceRoot = path.resolve(specRoot, '..', '..');
  const temporaryParent = fs.realpathSync(os.tmpdir());
  const temporaryPrefix = 'yor-api-clients-';
  const temporaryRoot = fs.mkdtempSync(path.join(temporaryParent, temporaryPrefix));
  try {
    // Preserve the mutator's relative path in generated imports. Orval also
    // inspects its exports, so copy the source into the isolated tree.
    const mutator = 'lib/api-client-react/src/custom-fetch.ts';
    fs.mkdirSync(path.dirname(path.join(temporaryRoot, mutator)), { recursive: true });
    fs.copyFileSync(path.join(workspaceRoot, mutator), path.join(temporaryRoot, mutator));

    const orvalPackage = fileURLToPath(import.meta.resolve('orval/package.json'));
    const orvalManifest = JSON.parse(fs.readFileSync(orvalPackage, 'utf8'));
    const orvalBin = typeof orvalManifest.bin === 'string' ? orvalManifest.bin : orvalManifest.bin.orval;
    const result = spawnSync(process.execPath, [
      path.resolve(path.dirname(orvalPackage), orvalBin), '--config', path.join(specRoot, 'orval.config.ts'),
    ], {
      cwd: specRoot,
      env: { ...process.env, YOR_API_GENERATION_ROOT: temporaryRoot },
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Orval generation failed (${result.signal || result.status})`);

    const { differences, expectedFileCount } = compareGeneratedArtifacts(workspaceRoot, temporaryRoot);
    if (differences.length) {
      for (const { artifact, kind } of differences) console.error(`[api clients] ${kind}: ${artifact}`);
      console.error('[api clients] Generated artifacts are stale. Run pnpm contract:clients:generate.');
      process.exitCode = 1;
    } else {
      console.log(`[api clients] Verified ${expectedFileCount} generated React and Zod artifacts.`);
    }
  } finally {
    const cleanupTarget = fs.realpathSync(temporaryRoot);
    if (path.dirname(cleanupTarget) !== temporaryParent || !path.basename(cleanupTarget).startsWith(temporaryPrefix)) {
      throw new Error('Refusing to remove an unexpected generation directory');
    }
    fs.rmSync(cleanupTarget, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { checkGeneratedClients(); }
  catch (error) {
    console.error(`[api clients] ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
