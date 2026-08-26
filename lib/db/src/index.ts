import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/yor_talks";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  console.warn("[Database Warning] DATABASE_URL is not set in environment variables.");
}

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 3000,
  idleTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined,
});

pool.on("error", (err) => {
  console.warn("[Database Pool Notice]:", err.message);
});

export const db = drizzle(pool, { schema });

export {
  usersTable,
  contactShieldsTable,
  postsTable,
  conversationsTable,
  messagesTable,
  notificationsTable,
  communitiesTable,
  eventsTable,
  productsTable,
  articlesTable,
  videosTable,
  liveStreamsTable,
  storiesTable,
  insertUserSchema,
  insertPostSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertNotificationSchema,
  insertCommunitySchema,
  insertEventSchema,
  insertProductSchema,
  insertArticleSchema,
  insertVideoSchema,
  insertLiveStreamSchema,
  insertStorySchema,
  creatorWorkspaceItemsTable,
  insertCreatorWorkspaceItemSchema,
} from "./schema";
