import { spawn } from "node:child_process";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planBaseSchema, requireMigrationSecret } from "./migration-safety.mjs";

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
requireMigrationSecret(process.env.CONTACT_SHIELD_SECRET);

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
      "SELECT c.relname AS object_name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')",
    );
    return result.rows.map((row) => row.object_name);
  } finally {
    await client.end();
  }
}

function pushFreshSchema() {
  const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
  return new Promise((resolve, reject) => {
    const pnpmCli = process.env.npm_execpath;
    if (!pnpmCli || !path.basename(pnpmCli).toLowerCase().includes("pnpm")) {
      reject(new Error("Run the production migration through pnpm so the checked-in pnpm runtime can apply the base schema"));
      return;
    }
    const child = spawn(
      process.execPath,
      [pnpmCli, "--filter", "@workspace/db", "exec", "drizzle-kit", "push", "--config", "./drizzle.config.ts", "--force"],
      {
        cwd: workspaceRoot,
        stdio: "inherit",
        env: process.env,
      },
    );
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`drizzle-kit push exited with code ${code ?? "unknown"}`)));
  });
}

async function main() {
  let schema = await inspectBaseSchema();

  if (planBaseSchema(schema, REQUIRED_BASE_TABLES) === 'bootstrap') {
    console.log("[production migration] Empty database detected; applying the checked-in base schema once.");
    await pushFreshSchema();
    schema = await inspectBaseSchema();
  }

  if (planBaseSchema(schema, REQUIRED_BASE_TABLES) !== 'migrate') {
    throw new Error('[production migration] The base schema is still empty after bootstrap');
  }

  const { migrate } = await import("./migrate-beta.mjs");
  await migrate();
  console.log("[production migration] Completed successfully.");
}

main().catch((error) => {
  console.error("[production migration] Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
