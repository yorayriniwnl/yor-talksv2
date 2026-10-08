import { createServer } from 'node:http';
import { readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from '@playwright/test';

// Synthetic APIs isolate browser payload/rendering from provider latency. The
// static server measures plain delivery by default, or Nginx's reviewed built-in
// gzip settings with --gzip. It does not establish Nginx runtime acceptance.
const directory = path.resolve(process.argv[2] || 'social/dist/e2e');
const output = path.resolve(process.argv[3] || 'docs/hardening/mobile-performance.json');
const compressedDelivery = process.argv.includes('--gzip');
const server = createServer((req, res) => {
  let file = path.resolve(directory, `.${new URL(req.url, 'http://localhost').pathname}`);
  if (!file.startsWith(`${directory}${path.sep}`)) file = path.join(directory, 'index.html');
  try { if (!statSync(file).isFile()) file = path.join(directory, 'index.html'); } catch { file = path.join(directory, 'index.html'); }
  const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }[path.extname(file)] || 'application/octet-stream';
  const original = readFileSync(file);
  const gzip = compressedDelivery && /gzip/.test(req.headers['accept-encoding'] || '') && original.length >= 1024 && /(?:javascript|css|html|svg|text|json|font)/.test(mime);
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store', ...(gzip ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : {}) });
  res.end(gzip ? gzipSync(original, { level: 5 }) : original);
});
server.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const unexpected = [];
  const user = { id: '1cc96a14-2728-46fd-ae3c-cbf15fd9db1a', username: 'mobile_fixture', fullName: 'Mobile Fixture', email: 'mobile@example.test', role: 'user', permissions: [], createdAt: '2026-08-28T09:00:00.000Z', updatedAt: '2026-08-28T09:00:00.000Z', followers: [], following: [], settings: { contentFilter: 'regular', privateAccount: false }, termsVersion: 'test-public-beta-1', termsAcceptedAt: '2026-08-30T00:00:00.000Z', ageConfirmedAt: '2026-08-30T00:00:00.000Z' };
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()); const apiPath = url.pathname.replace(/^\/api/, '');
    let data;
    if (apiPath === '/auth/refresh') data = { accessToken: 'synthetic-mobile-performance-token' };
    else if (apiPath === '/users/me' || apiPath === `/users/${user.id}`) data = user;
    else if (apiPath === '/users/me/premium-profile') data = { enabledFeatures: {}, selection: {}, options: {} };
    else if (apiPath === '/feed') data = [{ id: '18fac78e-65fa-4fd4-931e-8b79e086c48d', authorId: user.id, content: 'Mobile performance fixture content.', images: [], audience: 'public', contentRating: 'regular', contentCategory: 'technology', createdAt: user.createdAt, updatedAt: user.updatedAt, likesCount: 0, commentsCount: 0, bookmarksCount: 0 }];
    else if (['/notifications', '/conversations', '/stories', '/notes', '/communities', '/creator/workspace', '/achievements/me', '/users/me/follow-requests', '/users/me/close-friends', '/users/me/favorites/creators', '/users/me/contact-shields'].includes(apiPath)) data = [];
    else { unexpected.push(`${route.request().method()} ${apiPath}`); return route.fulfill({ status: 500, body: '{}' }); }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, message: 'Synthetic measurement', data, errors: [], meta: { hasMore: false, nextCursor: null } }) });
  });
  await page.route('**/socket.io/**', route => route.abort());
  await page.addInitScript(() => {
    window.__mobileMetrics = { lcpMs: 0, longTaskMs: 0 };
    new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__mobileMetrics.lcpMs = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__mobileMetrics.longTaskMs += Math.max(0, entry.duration - 50); }).observe({ type: 'longtask', buffered: true });
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200_000, uploadThroughput: 100_000, connectionType: 'cellular4g' });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const started = performance.now();
  await page.goto(base, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.getByText('Mobile performance fixture content.', { exact: true }).first().waitFor();
  const metrics = await page.evaluate(() => ({ ...window.__mobileMetrics, fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null, resources: performance.getEntriesByType('resource').filter(entry => /\.(js|css)(\?|$)/.test(entry.name)).map(entry => ({ url: entry.name, encodedBytes: entry.encodedBodySize, transferredBytes: entry.transferSize })) }));
  if (unexpected.length) throw new Error(`Unexpected measurement APIs: ${unexpected.join(', ')}`);
  const assets = metrics.resources.map(resource => { const assetPath = new URL(resource.url).pathname; const original = readFileSync(path.join(directory, assetPath)); return { path: assetPath, bytes: original.length, deliveredBytes: resource.encodedBytes, gzipBytes: gzipSync(original, { level: 5 }).length }; });
  const sum = (extension, key) => assets.filter(asset => asset.path.endsWith(extension)).reduce((total, asset) => total + asset[key], 0);
  const measured = { javascriptBytes: sum('.js', 'bytes'), stylesheetBytes: sum('.css', 'bytes'), javascriptDeliveredBytes: sum('.js', 'deliveredBytes'), stylesheetDeliveredBytes: sum('.css', 'deliveredBytes'), javascriptGzipBytes: sum('.js', 'gzipBytes'), stylesheetGzipBytes: sum('.css', 'gzipBytes'), fcpMs: metrics.fcpMs, lcpMs: metrics.lcpMs, longTaskBlockingMs: metrics.longTaskMs, fixtureReadyMs: Math.round(performance.now() - started) };
  const budgets = { javascriptGzipBytes: 350 * 1024, stylesheetGzipBytes: 100 * 1024, fcpMs: 2500, lcpMs: 4000, longTaskBlockingMs: 300 };
  const acceptance = Object.fromEntries(Object.entries(budgets).map(([name, max]) => [name, { maximum: max, observed: measured[name], passed: measured[name] !== null && measured[name] <= max }]));
  const report = { generatedAt: new Date().toISOString(), scope: `Cold synthetic authenticated feed; local production assets; 390x844; 150ms latency; 1.6Mbps down; 4x CPU; ${compressedDelivery ? 'gzip level5 test-server delivery, not Nginx runtime acceptance' : 'no gzip delivery'}; no provider timing. Budgets are proposed repository gates, pending owner agreement. One observation is not field percentile data.`, directory, measured, budgets: acceptance, assets };
  mkdirSync(path.dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ measured, budgets: acceptance, output }, null, 2));
  if (Object.values(acceptance).some(item => !item.passed)) process.exitCode = 1;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
