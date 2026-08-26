import { spawn } from "node:child_process";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
const REQUIRED_BASE_TABLES = [
  "users",
  "posts",
  "comments",
  "conversations",
  "messages",
  "notifications",
  "communities",
  "events",
  "products",
  "articles",
  "videos",
  "stories",
  "live_streams",
  "payment_orders",
];

if (!connectionString) {
  throw new Error("[production migration] DATABASE_URL must be set explicitly");
}

function createClient() {
  return new Client({
    connectionString,
    ssl: process.env.DB_SSL === "true"
      ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
  });
}

async function inspectBaseSchema() {
  const client = createClient();
  await client.connect();
  try {
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
      [REQUIRED_BASE_TABLES],
    );
    const present = new Set(result.rows.map((row) => row.table_name));
    return {
      present: REQUIRED_BASE_TABLES.filter((table) => present.has(table)),
      missing: REQUIRED_BASE_TABLES.filter((table) => !present.has(table)),
    };
  } finally {
    await client.end();
  }
}

function pushFreshSchema() {
  const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      ["--filter", "@workspace/db", "exec", "drizzle-kit", "push", "--config", "./drizzle.config.ts", "--force"],
      {
        cwd: workspaceRoot,
        stdio: "inherit",
        shell: process.platform === "win32",
        env: process.env,
      },
    );
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`drizzle-kit push exited with code ${code ?? "unknown"}`)));
  });
}

async function main() {
  let schema = await inspectBaseSchema();

  if (schema.present.length === 0) {
    console.log("[production migration] Empty database detected; applying the checked-in base schema once.");
    await pushFreshSchema();
    schema = await inspectBaseSchema();
  }

  if (schema.missing.length > 0) {
    throw new Error(
      `[production migration] Refusing to continue with a partial base schema. Missing tables: ${schema.missing.join(", ")}`,
    );
  }

  const { migrate } = await import("./migrate-beta.mjs");
  await migrate();
  console.log("[production migration] Completed successfully.");
}

main().catch((error) => {
  console.error("[production migration] Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
