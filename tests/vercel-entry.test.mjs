import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

test('the emitted Vercel .js entry loads as ESM and rejects invalid Express exports', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'yor-vercel-entry-'));
  try {
    await mkdir(path.join(directory, 'api'));
    await mkdir(path.join(directory, 'api-server/dist'), { recursive: true });
    const manifest = JSON.parse(await readFile('package.json', 'utf8'));
    assert.equal(manifest.type, 'module');
    await writeFile(path.join(directory, 'package.json'), JSON.stringify({ type: manifest.type }));
    await writeFile(path.join(directory, 'api-server/dist/app.cjs'), 'exports.default = (req, res) => res.end("live");');
    const source = await readFile('api/index.ts', 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    await writeFile(path.join(directory, 'api/index.js'), outputText);
    const verification = `import handler, { resolveExpressHandler } from './api/index.js';
      import assert from 'node:assert/strict';
      import { EventEmitter } from 'node:events';
      const response = new EventEmitter();
      response.end = (body) => { assert.equal(body, 'live'); response.emit('finish'); };
      await handler({}, response);
      assert.throws(() => resolveExpressHandler({default: {}}), TypeError);`;
    execFileSync(process.execPath, ['--input-type=module', '-e', verification], { cwd: directory, timeout: 10000, stdio: 'pipe' });
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('yor-vercel-entry-'));
    await rm(directory, { recursive: true });
  }
});
