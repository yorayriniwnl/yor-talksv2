import assert from 'node:assert/strict';
import test from 'node:test';
import configure from '../vite.config.ts';

const synthetic = {
  VITE_PUBLIC_BETA: 'true', VITE_PUBLIC_ORIGIN: 'https://yor-talks.test',
  VITE_TERMS_VERSION: 'test-public-beta-1', VITE_LEGAL_CONTENT_REVIEWED: 'true',
  VITE_LEGAL_OPERATOR_NAME: 'Synthetic Operator', VITE_LEGAL_OPERATOR_ADDRESS: '1 Synthetic Test Street',
  VITE_LEGAL_EFFECTIVE_DATE: '2026-10-18', VITE_LEGAL_GOVERNING_LAW: 'Synthetic fixture only',
  VITE_PRIVACY_CONTACT_EMAIL: 'privacy@example.test', VITE_SUPPORT_EMAIL: 'support@example.test',
  VITE_GRIEVANCE_OFFICER_NAME: 'Synthetic Officer', VITE_GRIEVANCE_CONTACT_EMAIL: 'grievance@example.test',
  VITE_GOOGLE_CLIENT_ID: 'test.apps.googleusercontent.com',
};
const environment = { mode: 'production', command: 'build', isSsrBuild: false, isPreview: false };

function install(t, overrides) {
  const values = { ...synthetic, ...overrides };
  const previous = new Map(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) process.env[key] = value;
  t.after(() => { for (const [key, value] of previous) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}

test('public beta rejects whitespace-only identity and terms versions', async t => {
  install(t, { VITE_LEGAL_OPERATOR_NAME: '   ', VITE_TERMS_VERSION: '\t' });
  await assert.rejects(configure(environment), /VITE_TERMS_VERSION.*VITE_LEGAL_OPERATOR_NAME/);
});

test('public beta rejects rollover calendar dates while accepting a real leap day', async t => {
  install(t, { VITE_LEGAL_EFFECTIVE_DATE: '2026-02-30' });
  await assert.rejects(configure(environment), /VITE_LEGAL_EFFECTIVE_DATE must be an ISO date/);
  process.env.VITE_LEGAL_EFFECTIVE_DATE = '2024-02-29';
  const valid = await configure(environment);
  assert.ok(valid.plugins.length > 0);
});
