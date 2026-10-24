import { chromium, expect, test, type Page, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { installComplianceApiBoundary } from './frontend-compliance-fixtures';

test.use({ video: 'off' });

const evidence = resolve('docs/audits/frontend-compliance-2026-10-17/evidence/advanced-accessibility');

async function snapshot(page: Page, info: TestInfo, label: string, scan = true) {
  mkdirSync(evidence, { recursive: true });
  const session = await page.context().newCDPSession(page);
  const tree = await session.send('Accessibility.getFullAXTree');
  await session.detach();
  const exposed = tree.nodes.filter(node => !node.ignored).map(node => ({ role: node.role?.value, name: node.name?.value, properties: node.properties }));
  const result = scan ? await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze() : null;
  const dimensions = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, height: innerHeight, devicePixelRatio, visualScale: visualViewport?.scale, forcedColors: matchMedia('(forced-colors: active)').matches }));
  const report = { dimensions, exposedAccessibilityTree: exposed, violations: result?.violations ?? [], incomplete: result?.incomplete ?? [] };
  const json = JSON.stringify(report, null, 2);
  writeFileSync(join(evidence, `${label}.json`), json);
  const screenshot = await page.screenshot();
  writeFileSync(join(evidence, `${label}.png`), screenshot);
  await info.attach(`${label}.json`, { contentType: 'application/json', body: json });
  await info.attach(`${label}.png`, { contentType: 'image/png', body: screenshot });
  expect(report.violations, `axe failures in ${label}`).toEqual([]);
  expect(dimensions.documentWidth, `Horizontal overflow in ${label}`).toBeLessThanOrEqual(dimensions.width + 1);
  return exposed;
}

async function home(page: Page, scheme: 'light' | 'dark', width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
  await page.addInitScript(value => localStorage.setItem('theme', value), scheme);
  await installComplianceApiBoundary(page);
  await page.goto('/');
  await expect(page.getByRole('article')).toBeVisible();
  await expect(page.getByRole('article')).toHaveCSS('opacity', '1');
}

for (const scheme of ['light', 'dark'] as const) {
  test(`companion supports nonmodal keyboard dismissal and browser accessibility semantics in ${scheme}`, async ({ page }, info) => {
    await home(page, scheme, 320);
    const trigger = page.getByRole('button', { name: 'Sky companion controls', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'Sky companion controls', exact: true });
    const close = panel.getByRole('button', { name: 'Close companion controls', exact: true });
    await expect(close).toBeFocused();
    await expect(panel).not.toHaveAttribute('aria-modal', 'true');
    await page.keyboard.press('Tab');
    await expect(panel.getByRole('button', { name: 'Bird', exact: true })).toBeFocused();
    const tree = await snapshot(page, info, `companion-${scheme}`);
    expect(tree.some(node => node.role === 'dialog' && node.name === 'Sky companion controls')).toBe(true);
    expect(tree.some(node => node.role === 'main')).toBe(true);
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(close).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(panel.getByRole('button', { name: 'Hide companion', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');
    await panel.getByRole('button', { name: 'Hide companion', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('complementary', { name: 'On-screen companion', exact: true })).toHaveCount(0);
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test(`post menus, hover information, focus rings and native volume work by keyboard in ${scheme}`, async ({ page }, info) => {
    await home(page, scheme);
    const article = page.getByRole('article');
    const like = article.getByRole('button', { name: 'Like post', exact: true });
    await like.focus();
    await expect(page.getByRole('tooltip', { name: 'Like', exact: true })).toBeVisible();
    const outline = await like.evaluate(element => ({ width: parseFloat(getComputedStyle(element).outlineWidth), style: getComputedStyle(element).outlineStyle }));
    expect(outline.width).toBeGreaterThanOrEqual(2);
    expect(outline.style).not.toBe('none');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await expect(like).toBeFocused();
    await page.mouse.move(0, 0);
    await like.hover();
    await expect(page.getByRole('tooltip', { name: 'Like', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    const options = article.getByRole('button', { name: 'More post options', exact: true });
    await options.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Copy link', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('menuitem', { name: 'Report', exact: true })).toBeFocused();
    await snapshot(page, info, `post-menu-${scheme}`);
    await page.keyboard.press('Escape');
    await expect(options).toBeFocused();
    const share = article.getByRole('button', { name: 'Share post', exact: true });
    await share.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'Repost to feed', exact: true })).toBeFocused();
    await page.keyboard.press('End');
    await expect(page.getByRole('menuitem', { name: 'Share via...', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(share).toBeFocused();
    const volume = page.getByRole('slider', { name: 'Volume', exact: true });
    await volume.focus();
    await page.keyboard.press('ArrowRight');
    await expect(volume).toHaveValue('36');
    await expect(volume).toHaveAttribute('aria-valuetext', '36%');
    const tree = await snapshot(page, info, `volume-${scheme}`);
    expect(tree.some(node => node.role === 'slider' && node.name === 'Volume')).toBe(true);
  });

  test(`personalized accents persist before opening More and retain readable controls in ${scheme}`, async ({ page }, info) => {
    test.setTimeout(120_000);
    await home(page, scheme, 1440);
    const choices = [['midnight', 'Deep signal'], ['lilac', 'Soft signal'], ['amber', 'Warm signal']] as const;
    for (const [value, label] of choices) {
      const more = page.getByRole('navigation', { name: 'Sidebar navigation' }).getByRole('button', { name: 'More', exact: true });
      if (await more.getAttribute('aria-expanded') !== 'true') await more.click();
      const choice = page.getByRole('button', { name: `Use ${label} accent`, exact: true });
      await choice.focus();
      await page.keyboard.press('Enter');
      await expect(choice).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('group', { name: 'Choose accent theme' }).locator('[aria-pressed="true"]')).toHaveCount(1);
      await snapshot(page, info, `accent-${value}-${scheme}`);
      await page.reload();
      await expect(page.getByRole('article')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-yor-accent', value);
      await expect(more).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test(`forced colors preserve focus, selected state and dialog controls in ${scheme}`, async ({ page }, info) => {
    await home(page, scheme, 390);
    await page.emulateMedia({ forcedColors: 'active' });
    const create = page.getByRole('button', { name: 'Create post', exact: true });
    await create.focus();
    expect(await create.evaluate(element => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Create post', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Write a post', exact: true }).fill('Synthetic high contrast draft.');
    const tree = await snapshot(page, info, `forced-colors-${scheme}`);
    expect(tree.some(node => node.role === 'dialog' && node.name === 'Create post')).toBe(true);
    expect(tree.some(node => node.role === 'textbox' && node.name === 'Write a post')).toBe(true);
    await page.keyboard.press('Escape');
    await expect(create).toBeFocused();
  });

  test(`native Chromium 200 percent zoom preserves reflow and keyboard access in ${scheme}`, async ({ baseURL }, info) => {
    test.setTimeout(120_000);
    // A temporary local-only extension calls the browser zoom API. CSS zoom,
    // device-scale emulation and pinch zoom do not establish native page zoom.
    const taskDirectory = mkdtempSync(join(tmpdir(), 'yor-compliance-zoom-'));
    const extension = join(taskDirectory, 'extension');
    mkdirSync(extension);
    writeFileSync(join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'Synthetic localhost zoom check', version: '1.0', host_permissions: ['http://127.0.0.1/*'], background: { service_worker: 'background.js' } }));
    writeFileSync(join(extension, 'background.js'), 'chrome.runtime.onInstalled.addListener(() => {});');
    const context = await chromium.launchPersistentContext(join(taskDirectory, 'profile'), {
      channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 }, baseURL,
      colorScheme: scheme, reducedMotion: 'reduce',
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'],
    });
    try {
      const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
      const page = context.pages()[0] ?? await context.newPage();
      await home(page, scheme);
      const zoom = await worker.evaluate(async origin => {
        const browserApi = (globalThis as any).chrome;
        const tabs = (await browserApi.tabs.query({ url: 'http://127.0.0.1/*' })).filter((tab: any) => tab.url?.startsWith(origin + '/'));
        if (tabs.length !== 1) throw new Error('Expected one synthetic localhost tab');
        await browserApi.tabs.setZoomSettings(tabs[0].id, { mode: 'automatic', scope: 'per-tab' });
        await browserApi.tabs.setZoom(tabs[0].id, 2);
        return browserApi.tabs.getZoom(tabs[0].id);
      }, new URL(baseURL!).origin);
      expect(zoom).toBe(2);
      await expect.poll(() => page.evaluate(() => innerWidth)).toBeLessThanOrEqual(640);
      await expect(page.getByRole('navigation', { name: 'Primary navigation', exact: true })).toBeVisible();
      await snapshot(page, info, `native-zoom-200-home-${scheme}`);
      const create = page.getByRole('button', { name: 'Create post', exact: true });
      await create.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog', { name: 'Create post', exact: true });
      await expect(dialog).toBeVisible();
      await dialog.getByRole('textbox', { name: 'Write a post' }).fill('A synthetic draft at native 200 percent zoom.');
      await dialog.getByRole('combobox', { name: 'Category', exact: false }).selectOption('technology');
      const post = dialog.getByRole('button', { name: 'Post', exact: true });
      await expect(post).toBeEnabled();
      await post.focus();
      await expect(post).toBeFocused();
      const bounds = await post.boundingBox();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
      await snapshot(page, info, `native-zoom-200-composer-${scheme}`);
      await page.keyboard.press('Escape');
      await expect(create).toBeFocused();
      const companion = page.getByRole('button', { name: 'Sky companion controls', exact: true });
      await companion.focus();
      await page.keyboard.press('Enter');
      const controls = page.getByRole('dialog', { name: 'Sky companion controls', exact: true });
      await expect(controls.getByRole('button', { name: 'Close companion controls' })).toBeFocused();
      await controls.getByRole('button', { name: 'Hide companion', exact: true }).focus();
      // Radix parks the popover off-screen until its first positioning frame.
      await expect.poll(async () => (await controls.boundingBox())!.y).toBeGreaterThanOrEqual(0);
      const panelBounds = await controls.boundingBox();
      expect(panelBounds!.y).toBeGreaterThanOrEqual(0);
      expect(panelBounds!.y + panelBounds!.height).toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
      await snapshot(page, info, `native-zoom-200-companion-${scheme}`);
      await page.keyboard.press('Escape');
      await expect(companion).toBeFocused();
      writeFileSync(join(evidence, `native-zoom-factor-${scheme}.json`), JSON.stringify({ browserZoomFactor: zoom, method: 'chrome.tabs.setZoom and getZoom', cssZoomUsed: false, pinchZoomUsed: false }, null, 2));
    } finally {
      await context.close();
      const resolved = resolve(taskDirectory);
      if (dirname(resolved) !== resolve(tmpdir()) || !resolved.split(/[\\/]/).at(-1)?.startsWith('yor-compliance-zoom-')) throw new Error('Unexpected temporary directory; refusing recursive cleanup.');
      rmSync(resolved, { recursive: true, force: true, maxRetries: 5 });
    }
  });
}
