import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { renderAlertmanager } from './render-alertmanager.mjs';

// Real pinned runtimes and authenticated local receiver. No production receiver
// or provider credential is accepted by this isolated exercise.
const root = path.resolve(import.meta.dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'yor-monitoring-'));
const binaries = {
  amtool: process.env.AMTOOL_BIN || 'amtool',
  alertmanager: process.env.ALERTMANAGER_BIN || 'alertmanager',
  promtool: process.env.PROMTOOL_BIN || 'promtool',
  prometheus: process.env.PROMETHEUS_BIN || 'prometheus',
};
const children = [];
const accepted = [];
let rejected = 0, rejectCredentials = false;
const password = randomUUID(), token = randomUUID(), user = 'local-test';
const expected = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
const receiver = http.createServer(async (req, res) => {
  if (req.url === '/api/metrics') {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401).end(); return; }
    res.setHeader('content-type', 'text/plain'); res.end('yor_local_test_signal 1\n'); return;
  }
  if (req.url !== '/alerts' || req.method !== 'POST') { res.writeHead(404).end(); return; }
  if (rejectCredentials || req.headers.authorization !== expected) { rejected++; res.writeHead(401).end(); return; }
  let body = ''; for await (const part of req) body += part;
  accepted.push(JSON.parse(body)); res.writeHead(200).end('{}');
});
const run = (name, args, success = true) => {
  const result = spawnSync(binaries[name], args, { encoding: 'utf8', windowsHide: true });
  assert.equal(Boolean(result.error), false, `${name} executable unavailable`);
  assert.equal(result.status === 0, success, `${name} expected ${success ? 'success' : 'configuration rejection'}; exit ${result.status}`);
  return `${result.stdout}${result.stderr}`;
};
async function until(predicate, description, milliseconds = 30000) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    try { if (await predicate()) return; } catch { /* readiness is eventual */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Monitoring acceptance timed out: ${description}`);
}
function start(name, args) {
  const log = fs.openSync(path.join(temp, `${name}.log`), 'w', 0o600);
  const child = spawn(binaries[name], args, { stdio: ['ignore', log, log], windowsHide: true });
  children.push(child); child.on('error', () => {}); return child;
}
try {
  await new Promise(resolve => receiver.listen(0, '127.0.0.1', resolve));
  const receiverPort = receiver.address().port;
  assert.match(run('amtool', ['--version']), /0\.28\.1/);
  assert.match(run('promtool', ['--version']), /3\.5\.0/);
  const passwordPath = path.join(temp, 'password'); fs.writeFileSync(passwordPath, password, { mode: 0o600 });
  const tokenPath = path.join(temp, 'token'); fs.writeFileSync(tokenPath, token, { mode: 0o600 });
  const amPath = path.join(temp, 'alertmanager.yml');
  const amConfig = renderAlertmanager(fs.readFileSync(path.join(root, 'ops/prometheus/alertmanager.yml'), 'utf8'), {
    ALERTMANAGER_WEBHOOK_URL: `http://127.0.0.1:${receiverPort}/alerts`, ALERTMANAGER_WEBHOOK_USER: user, ALERTMANAGER_ALLOW_LOCAL_RECEIVER: 'true',
  }).replace('/run/secrets/alertmanager_webhook_password', JSON.stringify(passwordPath.replaceAll('\\', '/')))
    .replace('group_wait: 30s', 'group_wait: 0s').replace('group_interval: 5m', 'group_interval: 1s');
  fs.writeFileSync(amPath, amConfig, { mode: 0o600 });
  run('amtool', ['check-config', amPath]);
  const invalidPath = path.join(temp, 'invalid.yml'); fs.writeFileSync(invalidPath, 'receivers: malformed\n');
  run('amtool', ['check-config', invalidPath], false);
  assert.throws(() => renderAlertmanager('${UNRESOLVED}', { ALERTMANAGER_WEBHOOK_URL: 'https://example.test/hook', ALERTMANAGER_WEBHOOK_USER: user }));
  assert.throws(() => renderAlertmanager('', { ALERTMANAGER_WEBHOOK_USER: user }));
  start('alertmanager', [`--config.file=${amPath}`, `--storage.path=${path.join(temp, 'am-data')}`, '--web.listen-address=127.0.0.1:19093', '--cluster.listen-address=']);
  await until(async () => (await fetch('http://127.0.0.1:19093/-/ready')).ok, 'Alertmanager readiness');
  const rulesPath = path.join(root, 'ops/prometheus/alerts.yml');
  run('promtool', ['check', 'rules', rulesPath]);
  const promPath = path.join(temp, 'prometheus.yml');
  const promConfig = fs.readFileSync(path.join(root, 'ops/prometheus/prometheus.yml'), 'utf8')
    .replaceAll('30s', '1s').replace('alertmanager:9093', '127.0.0.1:19093')
    .replace('/etc/prometheus/alerts.yml', JSON.stringify(rulesPath.replaceAll('\\', '/')))
    .replace('/run/secrets/metrics_bearer_token', JSON.stringify(tokenPath.replaceAll('\\', '/')))
    .replace('api:4000', `127.0.0.1:${receiverPort}`).replace('backup-metrics-exporter:9100', `127.0.0.1:${receiverPort}`);
  fs.writeFileSync(promPath, promConfig, { mode: 0o600 }); run('promtool', ['check', 'config', promPath]);
  start('prometheus', [`--config.file=${promPath}`, `--storage.tsdb.path=${path.join(temp, 'prom-data')}`, '--web.listen-address=127.0.0.1:19090']);
  await until(async () => {
    const result = await (await fetch('http://127.0.0.1:19090/api/v1/query?query=up%7Bjob%3D%22yor-api%22%7D')).json();
    return result.data?.result?.[0]?.value?.[1] === '1';
  }, 'authenticated Prometheus scrape');
  const labels = { alertname: 'YorLocalAcceptance', severity: 'test', test_id: randomUUID() };
  async function submit(endsAt) {
    const response = await fetch('http://127.0.0.1:19093/api/v2/alerts', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify([{ labels, startsAt: new Date(Date.now() - 10000).toISOString(), endsAt }]) });
    assert.equal(response.ok, true);
  }
  const hasStatus = status => accepted.some(batch => batch.alerts?.some(alert => alert.labels.test_id === labels.test_id && alert.status === status));
  await submit(new Date(Date.now() + 60000).toISOString());
  await until(() => hasStatus('firing'), 'authenticated firing delivery');
  await submit(new Date(Date.now() - 1000).toISOString());
  await until(() => hasStatus('resolved'), 'authenticated resolved delivery');
  rejectCredentials = true;
  labels.test_id = randomUUID();
  await submit(new Date(Date.now() + 60000).toISOString());
  await until(() => rejected > 0, 'receiver authentication rejection');
  assert.equal(hasStatus('firing'), false, 'invalid receiver authentication must not accept an alert');
  console.log(JSON.stringify({ config: 'passed', invalidConfig: 'rejected', ready: true, scrape: 'passed', firing: 'delivered', resolved: 'delivered', invalidReceiverAuth: 'rejected', productionReceiver: 'not exercised', evidenceDirectory: temp }));
} finally {
  await Promise.all(children.map(child => new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve); child.kill();
  })));
  await new Promise(resolve => receiver.close(resolve));
}
