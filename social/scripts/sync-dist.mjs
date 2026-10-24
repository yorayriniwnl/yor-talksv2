import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPublic = path.resolve(__dirname, "../dist/public");
const distRoot = path.resolve(__dirname, "../dist");

if (!fs.existsSync(path.join(distPublic, 'index.html'))) {
  throw new Error('Frontend build output is missing dist/public/index.html');
}
fs.cpSync(distPublic, distRoot, { recursive: true });
console.log('[Postbuild] Synced dist/public to dist for Vercel/Netlify directory detection.');
