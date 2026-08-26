import { spawn } from "node:child_process";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/yor_talks",
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined,
});

async function hasBaseSchema() {
  await client.connect();
  try {
    const result = await client.query("SELECT to_regclass('public.users') AS users_table");
    return Boolean(result.rows[0]?.users_table);
  } finally {
    await client.end();
  }
}

function pushSchema() {
  const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["--filter", "@workspace/db", "exec", "drizzle-kit", "push", "--config", "./drizzle.config.ts", "--force"], {
      cwd: workspaceRoot,
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`drizzle-kit push exited with code ${code ?? "unknown"}`)));
  });
}

try {
  if (!(await hasBaseSchema())) {
    console.log("[production migration] Base schema is missing; applying the checked-in Drizzle schema first.");
    await pushSchema();
  }
  await import("./migrate-beta.mjs");
} catch (error) {
  console.error("[production migration] Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
