import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPublic = path.resolve(__dirname, "../dist/public");
const distRoot = path.resolve(__dirname, "../dist");

if (fs.existsSync(distPublic)) {
  try {
    fs.cpSync(distPublic, distRoot, { recursive: true });
    console.log("✅ [Postbuild] Synced dist/public to dist for seamless Vercel/Netlify directory detection.");
  } catch (e) {
    // Ignore if already mirrored
  }
}
