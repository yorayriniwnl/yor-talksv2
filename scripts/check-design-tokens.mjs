import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const tokenPath = resolve(root, 'design', 'yor-tokens.json');
const tokens = JSON.parse(await readFile(tokenPath, 'utf8'));

const expectedColors = {
  void: '#000000',
  panel: '#050505',
  crimson: '#e84b4b',
  deepCrimson: '#671515',
  signal: '#ff8a7f',
  paper: '#f5eaea',
  muted: '#c4c4c4',
};

if (tokens.schema_version !== 1) throw new Error('Unsupported YOR token schema');
for (const [name, value] of Object.entries(expectedColors)) {
  if (tokens.color?.[name] !== value) throw new Error(`YOR color drift: ${name}`);
}
for (const section of ['gradient', 'typography', 'geometry', 'motion', 'signal', 'effects', 'breakpoints', 'accessibility']) {
  if (!tokens[section]) throw new Error(`YOR token section missing: ${section}`);
}
if (tokens.accessibility.minimumTouchTargetPx < 44) throw new Error('YOR touch target is below 44px');
if (!tokens.accessibility.reducedMotionMediaQuery.includes('prefers-reduced-motion')) {
  throw new Error('YOR reduced-motion contract is missing');
}

console.log(`YOR design tokens valid: ${tokenPath}`);
