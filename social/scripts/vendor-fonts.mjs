// Run explicitly to refresh vendored fonts. Application builds never fetch fonts.
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'public/fonts');
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const previous = await fs.readFile(path.join(output, 'sources.json'), 'utf8').then(JSON.parse).catch(() => null);
const source = html.match(/href="(https:\/\/fonts.googleapis.com\/css2[^"]+)"/)?.[1] ?? previous?.stylesheetSource;
if (!source || new URL(source).origin !== 'https://fonts.googleapis.com') throw new Error('Missing approved font stylesheet source');
const licenseRevision = '47d54ca1ebb14fd864695f1d39dc734f39017c33';
const families = ['cormorantgaramond', 'dmmono', 'inter', 'jetbrainsmono', 'newsreader', 'outfit'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function download(url, headers) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Font source returned ${response.status}: ${new URL(url).hostname}`);
  return Buffer.from(await response.arrayBuffer());
}
const cssBytes = await download(source, {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
});
let css = cssBytes.toString('utf8');
if (!css.includes('@font-face')) throw new Error('Font source did not return CSS font faces');
const urls = [...new Set([...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(match => match[1]))];
const artifacts = [];
for (const url of urls) {
  if (new URL(url).origin !== 'https://fonts.gstatic.com' || !url.endsWith('.woff2')) throw new Error('Unexpected font resource');
  const bytes = await download(url);
  if (bytes.toString('ascii', 0, 4) !== 'wOF2') throw new Error('Invalid WOFF2 font');
  const sha256 = hash(bytes);
  const file = `${sha256.slice(0, 24)}.woff2`;
  css = css.replaceAll(url, `/fonts/${file}`);
  artifacts.push({ file, source: url, sha256, bytes: bytes.length, content: bytes });
}
const licenses = [];
for (const family of families) {
  const source = `https://raw.githubusercontent.com/google/fonts/${licenseRevision}/ofl/${family}/OFL.txt`;
  const bytes = await download(source);
  if (!bytes.toString().includes('SIL OPEN FONT LICENSE Version 1.1')) throw new Error(`Unexpected font license: ${family}`);
  licenses.push({ family, file: `${family}-OFL.txt`, source, sha256: hash(bytes), content: bytes });
}
// Download and validate everything before changing the vendored directory.
await fs.mkdir(output, { recursive: true });
for (const item of [...artifacts, ...licenses]) await fs.writeFile(path.join(output, item.file), item.content);
const localCss = `/* Self-hosted fonts. Copyright and OFL notices and source inventory are in /fonts/. */\n${css}`;
await fs.writeFile(path.join(output, 'fonts.css'), localCss);
await fs.writeFile(path.join(output, 'sources.json'), JSON.stringify({
  stylesheetSource: source, stylesheetSha256: hash(cssBytes), licenseRevision,
  fonts: artifacts.map(({ content, ...item }) => item), licenses: licenses.map(({ content, ...item }) => item),
}, null, 2) + '\n');
const stylesheetLink = `<link href="/fonts/fonts.css?v=${hash(localCss).slice(0, 16)}" rel="stylesheet" />`;
await fs.writeFile(path.join(root, 'index.html'), html
  .replace(/^\s*<link rel="preconnect" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"[^>]*\/>\r?\n/gm, '')
  .replace(/<link href="(?:https:\/\/fonts.googleapis.com\/css2[^"]+|\/fonts\/fonts.css[^" ]*)" rel="stylesheet" \/>/, stylesheetLink));
console.log(`Vendored ${artifacts.length} WOFF2 files with ${licenses.length} OFL notices; total ${artifacts.reduce((sum, item) => sum + item.bytes, 0)} bytes.`);
