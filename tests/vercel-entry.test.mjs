import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

test('the emitted Vercel entry loads lazily, returns 503 on runtime init failure, and keeps dispatch failures internal', async () => {
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
    const verification = `import handler, { createVercelHandler, resolveExpressHandler } from './api/index.js';
      import assert from 'node:assert/strict';
      import { EventEmitter } from 'node:events';
      const makeResponse = () => {
        const response = new EventEmitter();
        response.headersSent = false;
        response.statusCode = 200;
        response.status = function(status) { this.statusCode = status; return this; };
        response.json = function(body) { this.body = body; this.headersSent = true; this.emit('finish'); return this; };
        response.setHeader = () => {};
        response.end = (body) => { response.body = body; response.headersSent = true; response.emit('finish'); };
        return response;
      };
      const response = makeResponse();
      await handler({}, response);
      assert.equal(response.body, 'live');

      let initializationAttempts = 0;
      const recoverable = createVercelHandler(async () => {
        initializationAttempts += 1;
        if (initializationAttempts === 1) throw new Error('sensitive configuration detail');
        return (_req, res) => res.end('recovered');
      });
      const unavailable = makeResponse();
      await recoverable({}, unavailable);
      assert.equal(unavailable.statusCode, 503);
      assert.equal(unavailable.body.message, 'API runtime is unavailable');
      assert.deepEqual(unavailable.body.errors, ['Service unavailable']);
      assert.doesNotMatch(JSON.stringify(unavailable.body), /sensitive configuration detail/);
      const recovered = makeResponse();
      await recoverable({}, recovered);
      assert.equal(recovered.body, 'recovered');
      assert.equal(initializationAttempts, 2);

      const dispatchFailure = createVercelHandler(async () => (_req, _res, next) => next(new Error('sensitive request detail')));
      const failedResponse = makeResponse();
      await dispatchFailure({}, failedResponse);
      assert.equal(failedResponse.statusCode, 500);
      assert.deepEqual(failedResponse.body.errors, ['Internal server error']);
      assert.doesNotMatch(JSON.stringify(failedResponse.body), /sensitive request detail/);
      assert.throws(() => resolveExpressHandler({default: {}}), TypeError);

      // Startup failures are diagnosable from the function log by setting
      // name, while values and arbitrary error text never reach the log.
      const logged = [];
      const originalError = console.error;
      console.error = (...parts) => { logged.push(parts.join(' ')); };
      try {
        const failWith = async (error) => {
          const failing = createVercelHandler(async () => { throw error; });
          const failingResponse = makeResponse();
          await failing({}, failingResponse);
          assert.equal(failingResponse.statusCode, 503);
          assert.deepEqual(failingResponse.body.errors, ['Service unavailable']);
          return logged.at(-1);
        };
        const configLine = await failWith(new Error('[Config Error] Production requires deployed values for: DATABASE_URL, REDIS_URL'));
        assert.match(configLine, /Production requires deployed values for: DATABASE_URL, REDIS_URL/);
        const opaqueLine = await failWith(new Error('postgres://admin:hunter2@db.internal/yor'));
        assert.doesNotMatch(opaqueLine, /hunter2|postgres:/);
        assert.match(opaqueLine, /: Error$/);
        const missingBundle = Object.assign(new Error('Cannot find module /var/task/api-server/dist/app.cjs'), { code: 'ERR_MODULE_NOT_FOUND' });
        assert.match(await failWith(missingBundle), /Error \\(ERR_MODULE_NOT_FOUND\\)$/);
        const schemaFailure = Object.assign(new Error('[{"input":"sk_live_secret"}]'), { issues: [{ code: 'too_small', path: ['JWT_SECRET'], input: 'sk_live_secret' }] });
        const schemaLine = await failWith(schemaFailure);
        assert.match(schemaLine, /invalid environment settings: JWT_SECRET \\(too_small\\)/);
        assert.doesNotMatch(schemaLine, /sk_live_secret/);
      } finally {
        console.error = originalError;
      }`;
    execFileSync(process.execPath, ['--input-type=module', '-e', verification], { cwd: directory, timeout: 10000, stdio: 'pipe' });
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith('yor-vercel-entry-'));
    await rm(directory, { recursive: true });
  }
});
