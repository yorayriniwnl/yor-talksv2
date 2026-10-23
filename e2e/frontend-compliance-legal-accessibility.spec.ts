import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { complianceJson, installComplianceApiBoundary } from './frontend-compliance-fixtures';

test.use({ video: 'off' });
const evidence = path.resolve('docs/audits/frontend-compliance-2026-10-17/evidence/legal-accessibility');

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [320, 390, 768, 1024, 1440]) {
    test(`legal documents and account forms at ${width}px in ${colorScheme} mode`, async ({ page }) => {
      test.setTimeout(180_000);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', entry => { if (entry.type() === 'error') errors.push(entry.text()); });
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.addInitScript(scheme => localStorage.setItem('theme', scheme), colorScheme);
      await installComplianceApiBoundary(page);
      await page.route('**/api/projects', route => complianceJson(route, { projects: [] }));
      await page.route('**/api/projects/invitations', route => complianceJson(route, { invitations: [] }));
      const scans = [];
      for (const [route, heading] of [
        ['/settings', 'Settings'], ['/cookies', 'Cookie and Storage Notice'], ['/privacy', 'Privacy Notice'],
        ['/terms', 'Terms of Use'], ['/community-guidelines', 'Community Guidelines'],
        ['/grievance', 'Trust & Safety Report Portal'], ['/projects', 'Projects'],
      ]) {
        await page.goto(route);
        const scope = route === '/settings' || route === '/projects' ? page.locator('#main-content') : page;
        // Wait for the page's own content, rather than a matching shell title.
        await expect(scope.getByRole('heading', { name: heading, exact: true })).toBeVisible();
        if (route === '/settings') await expect(page.getByRole('switch', { name: 'Allow optional analytics', exact: true })).toBeVisible();
        if (route === '/projects') await expect(page.getByText('No projects yet', { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${route}`).toBe(true);
        const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        scans.push({ route, width, colorScheme, violations: result.violations, incomplete: result.incomplete.map(rule => ({
          id: rule.id, impact: rule.impact, helpUrl: rule.helpUrl,
          nodes: rule.nodes.map(node => ({ target: node.target, failureSummary: node.failureSummary })),
        })), passedRules: result.passes.map(rule => rule.id) });
        mkdirSync(evidence, { recursive: true });
        writeFileSync(path.join(evidence, `${width}-${colorScheme}.json`), JSON.stringify(scans, null, 2) + '\n');
        expect(result.violations, `axe violations at ${route}, ${width}px, ${colorScheme}`).toEqual([]);
      }
      expect(errors).toEqual([]);
    });
  }
}
