import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

// Exercise Linux DAC permissions using synthetic data in an owned volume.
// Only short-lived checks run; no host secret, socket or network is exposed.
const root = path.resolve(import.meta.dirname, '..');
const identifier = `yor-secret-permissions-${randomUUID()}`;
const ownerLabel = `yor.audit.secret-permissions=${identifier}`;
const volume = `${identifier}-data`;
const containers = new Set();
const volumes = new Set();

function docker(args) {
  const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8', timeout: 60_000 });
  if (result.error) throw result.error;
  return result;
}

function requireSuccess(args) {
  const result = docker(args);
  assert.equal(result.status, 0, `Docker ${args[0]} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function run(name, args) {
  const container = `${identifier}-${name}`;
  containers.add(container);
  return docker(['run', '--rm', '--name', container, '--label', ownerLabel,
    '--network', 'none', '--read-only', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges:true', ...args]);
}

function createVolume(name) {
  requireSuccess(['volume', 'create', '--label', ownerLabel, name]);
  volumes.add(name);
}

try {
  const config = JSON.parse(requireSuccess(['compose', '--env-file', 'ops/ci-production.env',
    '-f', 'docker-compose.production.yml', 'config', '--format', 'json']));
  const readerGid = config.services.api.group_add?.[0];
  assert.match(String(readerGid), /^[1-9]\d*$/, 'Secret reader group must be a non-root numeric GID');
  // Keep this fixture distinct from the consuming images' primary groups.
  assert.ok(!['1000', '65534'].includes(String(readerGid)), 'Fixture must use a separate supplementary group');
  for (const service of ['api', 'prometheus', 'alertmanager']) {
    assert.deepEqual(config.services[service].group_add, [readerGid], `${service} must use only the dedicated reader group`);
  }
  assert.deepEqual(Object.entries(config.services)
    .filter(([, service]) => service.group_add?.map(String).includes(String(readerGid)))
    .map(([name]) => name).sort(), ['alertmanager', 'api', 'prometheus'],
  'Only the three unprivileged consumers may receive the secret-reader group');
  const apiDockerfile = readFileSync(path.join(root, config.services.api.build.dockerfile), 'utf8');
  const apiBaseImage = apiDockerfile.match(/^FROM (\S+)\s*$/m)?.[1];
  const apiUser = [...apiDockerfile.matchAll(/^USER (\S+)\s*$/gm)].at(-1)?.[1];
  assert.ok(apiBaseImage && apiUser, 'The API must declare its base image and unprivileged user');
  for (const service of ['postgres', 'redis']) {
    assert.equal(config.services[service].restart, 'unless-stopped', `${service} must recover after a daemon restart`);
  }

  createVolume(volume);
  const initialize = run('initialize', ['--user', '0:0', '--cap-add', 'CHOWN',
    '--mount', `type=volume,source=${volume},target=/fixture`, 'node:24-alpine',
    'node', '-e', `const fs=require('node:fs');
      for(const name of ['metrics-token','webhook-password']) {
        const file='/fixture/'+name;
        fs.writeFileSync(file,'synthetic-permission-fixture-never-a-deployment-secret',{mode:0o640});
        fs.chownSync(file,0,Number(process.argv[1]));
        fs.chmodSync(file,0o640);
        const stat=fs.statSync(file);
        if(stat.uid!==0||stat.gid!==Number(process.argv[1])||(stat.mode&0o777)!==0o640) process.exit(2);
      }`, String(readerGid)]);
  assert.equal(initialize.status, 0, `Could not create the restricted Linux fixture: ${initialize.stderr}`);

  const consumers = [
    { name: 'api', image: apiBaseImage, user: config.services.api.user ?? apiUser, file: 'metrics-token' },
    { name: 'prometheus', image: config.services.prometheus.image, file: 'metrics-token' },
    { name: 'alertmanager', image: config.services.alertmanager.image,
      user: config.services.alertmanager.user, file: 'webhook-password' },
  ];
  for (const consumer of consumers) {
    for (const hasReaderGroup of [false, true]) {
      const result = run(`${consumer.name}-${hasReaderGroup ? 'allowed' : 'denied'}`, [
        ...(consumer.user ? ['--user', consumer.user] : []),
        ...(hasReaderGroup ? ['--group-add', String(readerGid)] : []),
        '--mount', `type=volume,source=${volume},target=/fixture,readonly`,
        '--entrypoint', '/bin/sh', consumer.image,
        '-c', `test "$(id -u)" != 0 || exit 2; cat /fixture/${consumer.file} >/dev/null`,
      ]);
      assert.equal(result.status, hasReaderGroup ? 0 : 1,
        `${consumer.name} must ${hasReaderGroup ? 'read with' : 'be denied without'} the reader group: ${result.stderr}`);
    }
  }

  const renderer = config.services['alertmanager-config'];
  assert.equal(renderer.user, '0:0');
  assert.equal(renderer.network_mode, 'none');
  assert.equal(renderer.read_only, true);
  assert.deepEqual(renderer.cap_drop, ['ALL']);
  assert.deepEqual(renderer.cap_add, ['DAC_OVERRIDE']);
  assert.deepEqual(renderer.security_opt, ['no-new-privileges:true']);
  assert.equal(renderer.restart, 'no');
  assert.equal(renderer.secrets, undefined);
  assert.equal(renderer.group_add, undefined);
  assert.deepEqual(renderer.volumes.filter((mount) => !mount.read_only)
    .map(({ type, target }) => ({ type, target })), [{ type: 'volume', target: '/rendered' }],
  'Only the generated configuration volume may be persistently writable');

  for (const ownership of ['root', 'nobody']) {
    const renderedVolume = `${identifier}-rendered-${ownership}`;
    createVolume(renderedVolume);
    if (ownership === 'nobody') {
      const initializePrevious = run('initialize-previous-renderer', ['--user', '0:0', '--cap-add', 'CHOWN',
        '--mount', `type=volume,source=${renderedVolume},target=/rendered`, renderer.image,
        'node', '-e', `const fs=require('node:fs');
          fs.writeFileSync('/rendered/alertmanager.yml','previous config',{mode:0o644});
          fs.chownSync('/rendered/alertmanager.yml',65534,65534);
          fs.chownSync('/rendered',65534,65534);`]);
      assert.equal(initializePrevious.status, 0, initializePrevious.stderr);
    }
    // Execute the real renderer and template with the normalized Compose identity,
    // mounts, environment and single capability, twice to cover replacement.
    for (const attempt of [1, 2]) {
      const render = run(`render-${ownership}-${attempt}`, [
        '--user', renderer.user,
        ...renderer.cap_add.flatMap((capability) => ['--cap-add', capability]),
        ...renderer.volumes.flatMap((mount) => ['--mount', mount.type === 'volume'
          ? `type=volume,source=${renderedVolume},target=${mount.target}`
          : `type=bind,source=${mount.source},target=${mount.target},readonly`]),
        ...Object.entries(renderer.environment).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
        '--entrypoint', renderer.entrypoint[0], renderer.image, ...renderer.entrypoint.slice(1),
      ]);
      assert.equal(render.status, 0, `Renderer failed on ${ownership}-owned volume, attempt ${attempt}: ${render.stderr}`);
    }
    const readRendered = run(`read-rendered-${ownership}`, [
      '--user', config.services.alertmanager.user,
      '--mount', `type=volume,source=${renderedVolume},target=/rendered,readonly`, renderer.image,
      'node', '-e', `const fs=require('node:fs');const assert=require('node:assert/strict');
        const text=fs.readFileSync('/rendered/alertmanager.yml','utf8');
        assert.equal(fs.statSync('/rendered/alertmanager.yml').mode&0o777,0o644);
        assert.ok(text.includes('https://alerts.ci.example/webhook'));
        assert.ok(text.includes('password_file: /run/secrets/alertmanager_webhook_password'));
        assert.ok(!text.includes('{{ALERTMANAGER_'));`,
    ]);
    assert.equal(readRendered.status, 0, `Alertmanager cannot read the ${ownership} volume output: ${readRendered.stderr}`);
  }
  console.log('[production secrets] All three consumers require the reader group for root:GID 0640 files; Compose wiring and database restart policies pass. The confined renderer initializes and updates root-owned and nobody-owned config volumes readable by Alertmanager.');
} finally {
  // Never select resources by broad names or labels. Every target has a unique
  // generated name, and its ownership label must still match before removal.
  for (const container of containers) {
    const inspected = docker(['container', 'inspect', '--format', '{{index .Config.Labels "yor.audit.secret-permissions"}}', container]);
    if (inspected.status === 0 && inspected.stdout.trim() === identifier) requireSuccess(['container', 'rm', '--force', container]);
  }
  for (const createdVolume of volumes) {
    const owner = requireSuccess(['volume', 'inspect', '--format', '{{index .Labels "yor.audit.secret-permissions"}}', createdVolume]);
    assert.equal(owner, identifier, 'Refusing to remove a volume without the matching audit label');
    requireSuccess(['volume', 'rm', createdVolume]);
  }
}
