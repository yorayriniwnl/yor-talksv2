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
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    const steps = job.steps;
    for (const step of steps.filter(step => step.uses)) {
      assert.match(step.uses, /@[a-f0-9]{40}$/, `${jobName}: ${step.name}`);
    }
    assert.equal(steps.find(step => step.uses?.startsWith('pnpm/action-setup@')).with.version,
      manifest.packageManager.slice('pnpm@'.length), jobName);
    assert.equal(steps.find(step => step.uses?.startsWith('actions/setup-node@')).with['node-version'], 24, jobName);
  }
  for (const jobName of ['backend', 'verify']) {
    assert.ok(workflow.jobs[jobName].steps.some(step => step.run?.trim() === 'pnpm audit'),
      `${jobName}: all dependency scopes must be audited`);
  }
});

test('backend verification runs independently and keeps security and integration checks mandatory', () => {
  const { jobs } = yaml.load(read('.github/workflows/ci.yml'));
  const backend = jobs.backend;
  assert.ok(backend, 'backend checks need a separate job');
  assert.equal(backend.needs, undefined, 'frontend failures must not skip backend evidence');
  assert.equal(backend.if, undefined);
  assert.equal(backend['continue-on-error'], undefined);
  assert.equal(backend.services.postgres.image, 'postgres:16-alpine');
  assert.equal(backend.services.redis.image, 'redis:7-alpine');
  assert.equal(backend.env.ELIGIBILITY_ASSURANCE_ADAPTER, 'unavailable');
  assert.equal(backend.env.ELIGIBILITY_POLICY_SOURCE, 'approved_registry');
  for (const step of backend.steps) {
    assert.equal(step['continue-on-error'], undefined, step.name);
    assert.equal(step.if, undefined, step.name);
    if (step.uses) assert.match(step.uses, /@[a-f0-9]{40}$/, step.name);
  }
  for (const command of [
    'pnpm install --frozen-lockfile', 'pnpm audit', 'pnpm contract:check',
    'pnpm --filter @workspace/db migrate:beta', 'pnpm --filter @workspace/api-server typecheck',
    'node --import tsx --test --test-concurrency=1 src/__tests__/*.test.ts',
    'pnpm --filter @workspace/api-server build', 'pnpm production-config:check',
    'bash ops/backup/backup-script.test.sh', 'node ops/check-database-runtime-role.mjs',
  ]) assert.ok(backend.steps.some(step => step.run === command), command);
  assert.equal(backend.steps.find(step => step.name === 'Run API tests serially').env.MEDIA_REQUIRE_DECODER_TESTS, 'true');
  assert.ok(jobs.verify.steps.some(step => step.run === 'pnpm test:unit'), 'full release checks remain in place');
  assert.ok(jobs.verify.steps.some(step => step.run === 'pnpm test:e2e'), 'browser checks remain in place');
});

test('production infrastructure and encrypted restore run independently as mandatory checks', () => {
  const { jobs } = yaml.load(read('.github/workflows/ci.yml'));
  const infrastructure = jobs.infrastructure;
  assert.ok(infrastructure, 'production container evidence needs an independent job');
  for (const property of ['needs', 'if', 'continue-on-error']) {
    assert.equal(infrastructure[property], undefined, `${property} must not hide infrastructure failures`);
  }
  assert.equal(infrastructure['runs-on'], 'ubuntu-latest', 'Linux permissions and Docker must execute on Linux');
  for (const step of infrastructure.steps) {
    assert.equal(step['continue-on-error'], undefined, step.name);
    assert.equal(step.if, undefined, step.name);
  }
  for (const command of [
    'docker compose --env-file ops/ci-production.env -f docker-compose.production.yml config --quiet',
    'node scripts/check-production-secret-permissions.mjs',
    'docker compose --project-name yor-talks-ci-release --env-file ops/ci-production.env -f docker-compose.production.yml build migrate api web backup',
  ]) {
    assert.ok(infrastructure.steps.some(step => step.run === command), command);
    assert.equal(Object.values(jobs).flatMap(job => job.steps).filter(step => step.run === command).length, 1,
      'container validation is mandatory without duplicating expensive image builds');
  }
  const smoke = infrastructure.steps.find(step => step.name === 'Smoke test production container stack');
  assert.equal(smoke.env.WEB_PORT, 18080);
  for (const required of [
    'set -euo pipefail',
    '-f ops/ci-provider-isolation.compose.yml',
    'trap cleanup EXIT',
    '"${compose[@]}" --profile ops down --volumes --remove-orphans',
    '"${compose[@]}" up -d --no-build',
    'BASE_URL=http://127.0.0.1:18080 pnpm smoke',
    'BACKUP_SMOKE_COMPOSE_PROJECT=yor-talks-ci-release bash ops/backup/ci-roundtrip-smoke.sh',
    'docker inspect --format \'{{.State.ExitCode}}\'',
    'docker inspect --format \'{{.Config.User}}\'',
    'docker inspect --format \'{{json .HostConfig.Dns}}\'',
    'yor:rate:api:*',
    'Rate-limit Redis connection warning',
  ]) assert.ok(smoke.run.includes(required), `production smoke must retain ${required}`);
  assert.ok(!/continue-on-error|secrets\./.test(JSON.stringify(infrastructure)),
    'infrastructure rehearsal must fail closed using only the checked-in synthetic fixture');
});
