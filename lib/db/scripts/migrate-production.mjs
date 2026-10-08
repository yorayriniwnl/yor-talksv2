import { bootstrapEmptySchema, inspectSchemaObjects } from './bootstrap-schema.mjs';
import pg from "pg";
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
    return await inspectSchemaObjects(client);
  } finally {
    await client.end();
  }
}

async function applyBaseSql() {
  const bootstrapClient = createClient();
  await bootstrapClient.connect();
  try { await bootstrapEmptySchema(bootstrapClient); } finally { await bootstrapClient.end(); }
}

async function main() {
  let schema = await inspectBaseSchema();

  if (planBaseSchema(schema, REQUIRED_BASE_TABLES) === 'bootstrap') {
    console.log("[production migration] Empty database detected; applying the checked-in base schema once.");
    await applyBaseSql();
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
