import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || (process.env.NODE_ENV === "production" ? "" : "postgresql://postgres:postgres@localhost:5432/yor_talks");

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export {
  usersTable,
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
} from "./schema";
