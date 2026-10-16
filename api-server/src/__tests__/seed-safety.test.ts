import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { assertSyntheticSeedAllowed } from '../scripts/seed-safety.js';

const allowed = {
  NODE_ENV: 'test', ALLOW_SYNTHETIC_SEED: 'true', SYNTHETIC_SEED_DATABASE: 'synthetic_fixture',
  DATABASE_URL: 'postgresql://fixture:fixture@127.0.0.1:55447/synthetic_fixture',
};

test('synthetic seed requires explicit nonproduction mode, opt-in and exact database confirmation', () => {
  assert.doesNotThrow(() => assertSyntheticSeedAllowed(allowed));
  assert.doesNotThrow(() => assertSyntheticSeedAllowed({ ...allowed, NODE_ENV: 'development' }));
  for (const patch of [
    { NODE_ENV: 'production' }, { NODE_ENV: undefined }, { NODE_ENV: 'staging' },
    { ALLOW_SYNTHETIC_SEED: undefined }, { ALLOW_SYNTHETIC_SEED: 'false' },
    { SYNTHETIC_SEED_DATABASE: 'another_database' }, { SYNTHETIC_SEED_DATABASE: undefined },
    { DATABASE_URL: undefined }, { DATABASE_URL: 'not a database URL' },
    { DATABASE_URL: 'https://database.invalid/synthetic_fixture' },
    { DATABASE_URL: 'postgresql://localhost/' },
    { DATABASE_URL: 'postgresql://localhost/synthetic_fixture%2Fother' },
  ]) assert.throws(() => assertSyntheticSeedAllowed({ ...allowed, ...patch }));
});

test('seed denials never reproduce connection credentials', () => {
  const secret = 'synthetic-must-not-appear';
  assert.throws(() => assertSyntheticSeedAllowed({ ...allowed,
    DATABASE_URL: `postgresql://fixture:${secret}@localhost/wrong_database`,
  }), error => error instanceof Error && !error.message.includes(secret));
});

test('every synthetic seed entry point guards before executing its script body', () => {
  for (const filename of ['seed.ts', 'seed-database.ts', 'seed-massive.ts', 'seed-ultra-massive.ts', 'create-profiles.ts']) {
    const source = fs.readFileSync(new URL(`../scripts/${filename}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
    assert.ok(source.startsWith("import { assertSyntheticSeedAllowed } from './seed-safety.js';\nassertSyntheticSeedAllowed();"), filename);
  }
});
