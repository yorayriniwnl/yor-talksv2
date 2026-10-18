import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, openSync, closeSync, readFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const [label, ...selection] = process.argv.slice(2);
if (!label || !/^[a-z0-9-]+$/.test(label)) throw new Error('Provide a lowercase report label followed by Playwright selectors.');
const root = path.resolve(import.meta.dirname, '..');
const evidence = path.join(root, 'docs/audits/frontend-compliance-2026-10-17/evidence');
mkdirSync(evidence, { recursive: true });
const report = path.join(evidence, `${label}.json`);
const log = openSync(path.join(evidence, `${label}.log`), 'w');
const cli = path.join(path.dirname(require.resolve('@playwright/test/package.json')), 'cli.js');
console.log(`Running ${label}; reports: ${report}`);
const child = spawn(process.execPath, [cli, 'test', '--config', 'e2e/frontend-compliance.config.ts', '--reporter=json', ...selection], {
  cwd: root,
  env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: report },
  stdio: ['ignore', log, log],
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('close', code => {
  closeSync(log);
  try {
    const result = JSON.parse(readFileSync(report, 'utf8'));
    console.log(JSON.stringify(result.stats));
    function visit(suite) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests || []) {
          if (test.status !== 'expected' && test.status !== 'skipped') console.log(JSON.stringify({ title: spec.title, status: test.status, errors: test.results.flatMap(result => result.errors || []).map(error => error.message) }));
        }
      }
      for (const nested of suite.suites || []) visit(nested);
    }
    result.suites.forEach(visit);
    for (const error of result.errors || []) console.log(JSON.stringify(error));
  } catch (error) { console.error(`Report unavailable: ${error.message}`); }
  process.exitCode = code ?? 1;
});
