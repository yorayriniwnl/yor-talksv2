import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const image = process.argv[2];
assert.ok(image && !image.startsWith('-'), 'Usage: node ops/ingress/check-web-image.mjs <built-web-image>');
const run = value => spawnSync('docker', ['run', '--rm', '--add-host', 'api:127.0.0.1',
  '-e', `TRUSTED_EDGE_CIDRS=${value}`, image, 'nginx', '-t', '-q'], { encoding: 'utf8', timeout: 30_000 });
for (const value of ['', '127.0.0.2/32', '127.0.0.2/32,::1/128']) {
  const result = run(value);
  if (result.error || result.status !== 0) throw new Error(`Native Nginx rejected valid edge configuration: ${result.error?.message ?? result.stderr}`);
}
for (const value of ['0.0.0.0/0', '::/0', '127.0.0.1/0000', '::FFFF:0.0.0.0/96',
  'localhost', '127.0.0.1/33', '127.0.0.1;include /tmp/evil;', '127.0.0.1\ninclude /tmp/evil;']) {
  const result = run(value);
  if (result.error) throw result.error;
  assert.notEqual(result.status, 0, 'Native Nginx accepted an invalid/unrestricted edge configuration');
}
console.log('Native web-image config acceptance passed: 3 valid and 8 rejected edge configurations.');
