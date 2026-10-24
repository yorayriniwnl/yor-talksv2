// Run every existing core-social test with the four explicit assertion
// migrations below. The original test and root configuration remain untouched.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const original = path.join(root, 'e2e/core-social.spec.ts');
const source = readFileSync(original, 'utf8');
let migrated = source;
function replaceOnce(before, after) {
  if (source.includes('\r\n')) {
    before = before.replaceAll('\n', '\r\n');
    after = after.replaceAll('\n', '\r\n');
  }
  if (migrated.split(before).length !== 2) throw new Error('Legacy assertion changed; review the migration before running.');
  migrated = migrated.replace(before, after);
}
replaceOnce("  await page.goto('/auth');\n  await expect(page.getByRole('status').filter({ hasText:",
  "  await page.goto('/auth');\n  expect(attempts).toBe(0);\n  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();\n  await expect(page.getByRole('status').filter({ hasText:");
replaceOnce("  await page.goto('/auth');\n  const button = page.locator('.operator-google-access__button button');",
  "  await page.goto('/auth');\n  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();\n  const button = page.locator('.operator-google-access__button button');");
replaceOnce(`  const optionalAnalytics = page.getByRole('switch', { name: 'Allow optional analytics', exact: true });
  await expect(optionalAnalytics).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('yor:telemetry:consent:v1'))).toBeNull();
  await optionalAnalytics.click();
  await expect(optionalAnalytics).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('yor:telemetry:consent:v1'))).toBe(user.id);
  await optionalAnalytics.click();
  await expect(optionalAnalytics).not.toBeChecked();`,
`  await expect(page.getByText('Optional analytics are off in this release', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Allow optional analytics', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('yor:telemetry:consent:v1'))).toBeNull();
  await page.evaluate(owner => {
    localStorage.setItem('yor:telemetry:consent:v1', owner);
    localStorage.setItem('yor:telemetry:queue:v1', '[]');
  }, user.id);
  await page.reload();
  await page.getByRole('button', { name: 'Clear saved analytics choice', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved analytics choice and queued optional events removed');`);
replaceOnce("        await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();",
  "        const scope = path === '/settings' || path === '/projects' ? page.locator('#main-content') : page;\n        await expect(scope.getByRole('heading', { name: heading, exact: true })).toBeVisible();\n        if (path === '/settings') await expect(scope.getByText('Optional analytics are off in this release', { exact: true })).toBeVisible();");

const temporary = mkdtempSync(path.join(tmpdir(), 'yor-frontend-legacy-'));
writeFileSync(path.join(temporary, 'package.json'), '{"private":true,"type":"module"}\n');
symlinkSync(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'junction');
symlinkSync(path.join(root, 'e2e/fixtures'), path.join(temporary, 'fixtures'), 'junction');
const generated = path.join(temporary, 'frontend-compliance-legacy.spec.ts');
writeFileSync(generated, migrated);
const configuration = path.join(temporary, 'frontend-compliance.config.ts');
writeFileSync(configuration, `import baseline from ${JSON.stringify(pathToFileURL(path.join(root, 'e2e/frontend-compliance.config.ts')).href)};\nexport default {...baseline, testDir: ${JSON.stringify(temporary)}};\n`);
const evidence = path.join(root, 'docs/audits/frontend-compliance-2026-10-17');
const difference = spawnSync('git', ['diff', '--no-index', '--', original, generated], { encoding: 'utf8' });
if (difference.status !== 1) throw new Error(`Could not prepare migration patch: ${difference.stderr}`);
const patch = difference.stdout.split('\n').map(line => {
  if (line.startsWith('diff --git ')) return 'diff --git a/e2e/core-social.spec.ts b/e2e/core-social.spec.ts';
  if (line.startsWith('--- ')) return '--- a/e2e/core-social.spec.ts';
  if (line.startsWith('+++ ')) return '+++ b/e2e/core-social.spec.ts';
  return line;
}).join('\n');
writeFileSync(path.join(evidence, 'legacy-test-migration.patch'), patch);
writeFileSync(path.join(evidence, 'evidence/legacy-migration.json'), JSON.stringify({
  original: 'e2e/core-social.spec.ts', sourceSha256: createHash('sha256').update(source).digest('hex'),
  migratedSha256: createHash('sha256').update(migrated).digest('hex'),
  transformations: 4, testDeclarationsRemoved: 0, temporary,
  profiles: ['101 cases with payments disabled', '3 free-plan/checkout cases with synthetic payments enabled'],
}, null, 2) + '\n');
console.log(`Original preserved; temporary migrated suite: ${generated}`);
const [label, ...selection] = process.argv.slice(2);
if (!label || !/^[a-z0-9-]+$/.test(label)) throw new Error('Provide a lowercase report label.');
const paymentCases = 'Premium billing presents free state|Premium checkout accepts configured terms|Premium billing rejects malformed responses';
let failed = false;
for (const [suffix, enabled, filter] of [['disabled', 'false', '--grep-invert'], ['payments', 'true', '--grep']]) {
  const code = await new Promise(resolve => {
    const child = spawn(process.execPath, ['e2e/frontend-compliance-run.mjs', `${label}-${suffix}`, ...selection, filter, paymentCases], {
      cwd: root, stdio: 'inherit', env: { ...process.env, FRONTEND_COMPLIANCE_CONFIG: configuration, FRONTEND_COMPLIANCE_PAYMENTS: enabled },
    });
    child.on('error', error => { console.error(error.message); resolve(1); });
    child.on('close', code => resolve(code ?? 1));
  });
  if (code !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
