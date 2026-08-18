import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function run(cmd, cwd) {
  const targetDir = cwd ? path.resolve(rootDir, cwd) : rootDir;
  console.log(`\n> [Monorepo Build] ${cmd} (${cwd || "root"})`);
  execSync(cmd, {
    cwd: targetDir,
    stdio: "inherit",
    env: { ...process.env },
  });
}

try {
  // 1. Build DB types and declarations
  run("npx tsc -b", "lib/db");

  // 2. Build Standalone API Server bundle
  run("node ./build.mjs", "api-server");

  // 3. Build Vite Production Client
  run("npx vite build --config vite.config.ts", "social");

  console.log("\n✅ [Monorepo Build] All workspaces compiled successfully!\n");
} catch (err) {
  console.error("\n❌ [Monorepo Build] Build failed:", err.message);
  process.exit(1);
}
